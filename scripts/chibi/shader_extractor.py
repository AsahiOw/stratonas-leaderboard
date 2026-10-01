#!/usr/bin/env python3
"""Extract Unity 2021.3 shader programs from the original BAAD bundles.

Unity stores shader sub-programs in a single concatenated ``compressedBlob``.
For Unity 2019.3 and later the first decompressed chunk is an offset table and
each remaining chunk is an independent LZ4 block.  This module intentionally
keeps extraction source-driven: it accepts a UnityPy Shader object, validates
every chunk and referenced record, and returns deterministic JSON-compatible
metadata.  It does not write generated shader files or touch inventory/storage.

The public entry points are :func:`extract_shader_object` for an already loaded
UnityPy Shader object and :func:`extract_baad`/``main`` for the read-only CLI.
Only program type 4 (GLES3) is emitted as canonical GLSL; other known program
types are decoded and retained as exact metadata without pretending they are
portable GLSL.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import numbers
import pathlib
import re
import struct
import sys
import zipfile
from collections import defaultdict
from typing import Any, Iterable, Mapping, Sequence


EXTRACTOR_VERSION = 1
EXPECTED_UNITY_PROGRAM_VERSION = 202012090
GLES3_PLATFORM = 9
GLES3_PROGRAM_TYPE = 4
MAX_ARRAY_ITEMS = 1_000_000
MAX_STRING_BYTES = 16 * 1024 * 1024
# These limits are deliberately generous compared with the BAAD corpus, while
# keeping malformed input from causing unbounded allocations.  They are part
# of the read-only extractor boundary, not conversion policy.
MAX_ARCHIVE_MEMBERS = 100_000
MAX_ARCHIVE_MEMBER_BYTES = 512 * 1024 * 1024
MAX_ARCHIVE_TOTAL_BYTES = 4 * 1024 * 1024 * 1024
MAX_ARCHIVE_BYTES = 1 * 1024 * 1024 * 1024
MAX_COMPRESSED_BLOB_BYTES = 512 * 1024 * 1024
MAX_CHUNKS_PER_PLATFORM = 100_000
MAX_DECOMPRESSED_CHUNK_BYTES = 512 * 1024 * 1024
MAX_DECOMPRESSED_TOTAL_BYTES = 2 * 1024 * 1024 * 1024
MAX_OFFSET_TABLE_BYTES = 128 * 1024 * 1024
MAX_INDEX_VALUE = 0x7FFFFFFF
MAX_SOURCE_OBJECT_ID = 0x7FFFFFFFFFFFFFFF
MIN_SOURCE_OBJECT_ID = -0x8000000000000000


class ShaderExtractionError(ValueError):
    """Raised when source bytes do not match the Unity shader blob contract."""


GPU_PROGRAM_TYPE_NAMES = {
    0: "Unknown",
    1: "GLLegacy",
    2: "GLES31AEP",
    3: "GLES31",
    4: "GLES3",
    5: "GLES",
    6: "GLCore32",
    7: "GLCore41",
    8: "GLCore43",
    9: "DX9VertexSM20",
    10: "DX9VertexSM30",
    11: "DX9PixelSM20",
    12: "DX9PixelSM30",
    13: "DX10Level9Vertex",
    14: "DX10Level9Pixel",
    15: "DX11VertexSM40",
    16: "DX11VertexSM50",
    17: "DX11PixelSM40",
    18: "DX11PixelSM50",
    19: "DX11GeometrySM40",
    20: "DX11GeometrySM50",
    21: "DX11HullSM50",
    22: "DX11DomainSM50",
    23: "MetalVS",
    24: "MetalFS",
    25: "SPIRV",
    26: "ConsoleVS",
    27: "ConsoleFS",
    28: "ConsoleHS",
    29: "ConsoleDS",
    30: "ConsoleGS",
    31: "RayTracing",
}

PLATFORM_NAMES = {
    -1: "None",
    0: "GL",
    1: "D3D9",
    2: "Xbox360",
    3: "PS3",
    4: "D3D11",
    5: "GLES20",
    6: "NaCl",
    7: "Flash",
    8: "D3D11_9x",
    9: "GLES3Plus",
    10: "PSP2",
    11: "PS4",
    12: "XboxOne",
    13: "PSM",
    14: "Metal",
    15: "OpenGLCore",
    16: "N3DS",
    17: "WiiU",
    18: "Vulkan",
    19: "Switch",
    20: "XboxOneD3D12",
}

# The compiler platform is not serialized beside a PlayerSubProgram.  These
# sets mirror AssetStudio/UnityPy's CheckGpuProgramUsable mapping for the
# Unity 2021.3 enum.  A source with an ambiguous mapping is rejected instead
# of selecting a row by enumeration order.  NaCl, Flash, and PSM are known
# compiler-platform enum values but have no supported GPU program mapping in
# those readers, so their sets intentionally remain empty.
PLATFORM_GPU_PROGRAM_TYPES = {
    0: frozenset({1}),
    1: frozenset({9, 10, 11, 12}),
    2: frozenset({26, 27, 28, 29, 30}),
    3: frozenset({26, 27, 28, 29, 30}),
    4: frozenset({13, 14, 15, 16, 17, 18, 19, 20, 21, 22}),
    5: frozenset({5}),
    6: frozenset(),
    7: frozenset(),
    8: frozenset({13, 14}),
    9: frozenset({2, 3, 4}),
    10: frozenset({26, 27, 28, 29, 30}),
    11: frozenset({26, 27, 28, 29, 30}),
    12: frozenset({26, 27, 28, 29, 30}),
    13: frozenset(),
    14: frozenset({23, 24}),
    15: frozenset({6, 7, 8}),
    16: frozenset({26, 27, 28, 29, 30}),
    17: frozenset({26, 27, 28, 29, 30}),
    18: frozenset({25}),
    19: frozenset({26, 27, 28, 29, 30}),
    20: frozenset({26, 27, 28, 29, 30}),
}

KNOWN_PLATFORM_VALUES = frozenset(PLATFORM_GPU_PROGRAM_TYPES)
KNOWN_PARAMETER_TYPES = frozenset({0, 1, 2, 3, 4, 5})
KNOWN_TEXTURE_DIMENSIONS = frozenset({-1, 0, 1, 2, 3, 4, 5, 6})


def _member(value: Any, name: str, default: Any = None) -> Any:
    if isinstance(value, Mapping):
        return value.get(name, default)
    return getattr(value, name, default)


def _as_int(value: Any, label: str) -> int:
    # UnityPy exposes enum values as IntEnum and serialized numeric fields as
    # Python ints.  Do not silently truncate floats, accept booleans, or turn
    # arbitrary strings into source metadata: all of those hide corruption.
    if isinstance(value, bool) or not isinstance(value, numbers.Integral):
        raise ShaderExtractionError(f"{label} is not an integer")
    return int(value)


def _as_nonnegative_int(value: Any, label: str) -> int:
    result = _as_int(value, label)
    if result < 0:
        raise ShaderExtractionError(f"{label} is negative: {result}")
    return result


def _as_index(value: Any, label: str) -> int:
    result = _as_nonnegative_int(value, label)
    if result > MAX_INDEX_VALUE:
        raise ShaderExtractionError(f"{label} is too large: {result}")
    return result


def _as_list(value: Any, label: str) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, (str, bytes, bytearray, memoryview)):
        raise ShaderExtractionError(f"{label} must be a sequence")
    try:
        iterator = iter(value)
    except Exception as exc:
        raise ShaderExtractionError(f"{label} must be a sequence") from exc
    result: list[Any] = []
    try:
        for item in iterator:
            if len(result) >= MAX_ARRAY_ITEMS:
                raise ShaderExtractionError(
                    f"{label} has too many items: at least {MAX_ARRAY_ITEMS + 1}"
                )
            result.append(item)
    except ShaderExtractionError:
        raise
    except Exception as exc:
        raise ShaderExtractionError(f"{label} must be a sequence") from exc
    return result


def _parse_unity_version(value: Any) -> tuple[int, int, str]:
    if isinstance(value, (tuple, list)) and len(value) >= 2:
        major = _as_nonnegative_int(value[0], "Unity major version")
        minor = _as_nonnegative_int(value[1], "Unity minor version")
        text = ".".join(str(_as_int(part, "Unity version part")) for part in value)
        return major, minor, text
    text = str(value or "")
    match = re.match(r"^(\d+)\.(\d+)(?:\.(\d+))?", text)
    if not match:
        raise ShaderExtractionError(f"unknown Unity version: {text!r}")
    return int(match.group(1)), int(match.group(2)), text


def _require_unity_2021_3(value: Any) -> tuple[int, int, str]:
    major, minor, text = _parse_unity_version(value)
    if (major, minor) < (2021, 2):
        raise ShaderExtractionError(
            f"Unity {text!r} is not supported; this extractor requires Unity 2021.2+"
        )
    return major, minor, text


def _expected_program_version(unity_version: tuple[int, int]) -> int:
    # Unity 2021.2 and 2021.3 use LoadGpuProgramFromData version 202012090.
    if unity_version < (2021, 2):
        raise ShaderExtractionError("only Unity 2021.2+ shader records are supported")
    return EXPECTED_UNITY_PROGRAM_VERSION


def _bytes(value: Any, label: str) -> bytes:
    if isinstance(value, bytes):
        if len(value) > MAX_COMPRESSED_BLOB_BYTES:
            raise ShaderExtractionError(
                f"{label} exceeds the {MAX_COMPRESSED_BLOB_BYTES}-byte limit"
            )
        return value
    if isinstance(value, (bytearray, memoryview)):
        result = bytes(value)
        if len(result) > MAX_COMPRESSED_BLOB_BYTES:
            raise ShaderExtractionError(
                f"{label} exceeds the {MAX_COMPRESSED_BLOB_BYTES}-byte limit"
            )
        return result
    # ``compressedBlob`` is exposed by UnityPy 1.25 as a Python list for some
    # Unity 2021 shaders.  Do not route that list through the generic array
    # limit: a valid E-Standard blob is larger than one million bytes while
    # still remaining inside the bounded compressed-blob limit.  Iterate
    # directly so malformed/infinite iterables remain fail-closed.
    if isinstance(value, (str, bytes, bytearray, memoryview)):
        raise ShaderExtractionError(f"{label} must be a byte sequence")
    result = bytearray()
    try:
        iterator = iter(value)
    except Exception as exc:
        raise ShaderExtractionError(f"{label} must be a byte sequence") from exc
    for index, item in enumerate(iterator):
        if index >= MAX_COMPRESSED_BLOB_BYTES:
            raise ShaderExtractionError(
                f"{label} exceeds the {MAX_COMPRESSED_BLOB_BYTES}-byte limit"
            )
        number = _as_int(item, f"{label}[{index}]")
        if not 0 <= number <= 255:
            raise ShaderExtractionError(f"{label}[{index}] is outside byte range")
        result.append(number)
    return bytes(result)


class _Reader:
    """Small bounds-checked little-endian reader for one table record."""

    def __init__(self, data: bytes, label: str):
        self.data = memoryview(data)
        self.label = label
        self.position = 0

    @property
    def remaining(self) -> int:
        return len(self.data) - self.position

    def _take(self, size: int, what: str) -> memoryview:
        if size < 0 or size > self.remaining:
            raise ShaderExtractionError(
                f"{self.label}: truncated {what} at {self.position} (need {size}, have {self.remaining})"
            )
        start = self.position
        self.position += size
        return self.data[start:self.position]

    def i32(self, what: str = "int32") -> int:
        return struct.unpack("<i", self._take(4, what))[0]

    def u32(self, what: str = "uint32") -> int:
        return struct.unpack("<I", self._take(4, what))[0]

    def bytes(self, size: int, what: str = "bytes") -> bytes:
        return self._take(size, what).tobytes()

    def count(self, what: str) -> int:
        count = self.i32(what)
        if count < 0 or count > MAX_ARRAY_ITEMS:
            raise ShaderExtractionError(f"{self.label}: invalid {what} {count}")
        return count

    def align(self) -> None:
        aligned = (self.position + 3) & ~3
        if aligned > len(self.data):
            raise ShaderExtractionError(f"{self.label}: alignment exceeds record length")
        self.position = aligned

    def string(self, what: str = "string") -> str:
        size = self.i32(f"{what} length")
        if size < 0 or size > MAX_STRING_BYTES:
            raise ShaderExtractionError(f"{self.label}: invalid {what} length {size}")
        raw = self.bytes(size, what)
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ShaderExtractionError(f"{self.label}: {what} is not UTF-8") from exc
        self.align()
        return text

    def string_array(self, what: str = "string array") -> list[str]:
        count = self.count(f"{what} count")
        return [self.string(f"{what}[{index}]") for index in range(count)]

    def byte_array(self, what: str = "byte array") -> bytes:
        size = self.i32(f"{what} length")
        if size < 0 or size > MAX_DECOMPRESSED_CHUNK_BYTES:
            raise ShaderExtractionError(f"{self.label}: invalid {what} length {size}")
        return self.bytes(size, what)

    def finish(self) -> None:
        if self.position != len(self.data):
            raise ShaderExtractionError(
                f"{self.label}: record has {len(self.data) - self.position} trailing bytes"
            )


def _canonical_glsl(program_data: bytes, label: str) -> str:
    try:
        text = program_data.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ShaderExtractionError(f"{label}: GLES3 program is not UTF-8 GLSL") from exc
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    if "\x00" in text:
        raise ShaderExtractionError(f"{label}: GLES3 program contains NUL bytes")
    if not re.search(r"(?m)^\s*#version\s+300\s+es\b", text):
        raise ShaderExtractionError(f"{label}: GLES3 program has no #version 300 es directive")
    if not text.endswith("\n"):
        text += "\n"
    return text


def _parse_program_record(data: bytes, unity_version: tuple[int, int], label: str) -> dict[str, Any]:
    reader = _Reader(data, label)
    version = reader.i32("program version")
    expected = _expected_program_version(unity_version)
    if version != expected:
        raise ShaderExtractionError(
            f"{label}: shader program version {version} does not match {expected}"
        )

    program_type = reader.i32("GPU program type")
    if program_type not in GPU_PROGRAM_TYPE_NAMES:
        raise ShaderExtractionError(f"{label}: unknown GPU program type {program_type}")
    stats = {
        "alu": reader.i32("ALU statistics"),
        "tex": reader.i32("TEX statistics"),
        "flow": reader.i32("flow statistics"),
        "tempRegister": reader.i32("temporary-register statistics"),
    }
    keywords = reader.string_array("merged keyword")
    program_data = reader.byte_array("program data")
    reader.align()
    source_map = reader.u32("source map")
    bind_count = reader.count("bind channel")
    channels = []
    for index in range(bind_count):
        source = reader.u32(f"bind channel {index} source")
        target = reader.u32(f"bind channel {index} target")
        channels.append({"source": source, "target": target})
        if source >= 32:
            raise ShaderExtractionError(f"{label}: bind channel source {source} is invalid")
    reader.finish()

    result: dict[str, Any] = {
        "kind": "program",
        "version": version,
        "gpuProgramType": program_type,
        "gpuProgramTypeName": GPU_PROGRAM_TYPE_NAMES[program_type],
        "stats": stats,
        "keywords": keywords,
        "programDataSha256": hashlib.sha256(program_data).hexdigest(),
        "programHash": hashlib.sha256(program_data).hexdigest(),
        "programDataLength": len(program_data),
        "sourceMap": source_map,
        "bindChannels": channels,
        "recordSha256": hashlib.sha256(data).hexdigest(),
    }
    if program_type == GLES3_PROGRAM_TYPE:
        result["glsl"] = _canonical_glsl(program_data, label)
    return result


def _parse_parameter(data: bytes, reader: _Reader, label: str) -> dict[str, Any]:
    name = reader.string(f"{label} parameter name")
    param_type = reader.i32(f"{label} parameter type")
    if param_type not in KNOWN_PARAMETER_TYPES:
        raise ShaderExtractionError(
            f"{label}: unsupported parameter type {param_type}"
        )
    rows = reader.i32(f"{label} parameter rows")
    if not 1 <= rows <= 4:
        raise ShaderExtractionError(
            f"{label}: parameter rows {rows} is outside 1..4"
        )
    columns = reader.i32(f"{label} parameter columns")
    if not 1 <= columns <= 4:
        raise ShaderExtractionError(
            f"{label}: parameter columns {columns} is outside 1..4"
        )
    matrix_flag = reader.i32(f"{label} parameter matrix flag")
    if matrix_flag not in {0, 1}:
        raise ShaderExtractionError(
            f"{label}: parameter matrix flag {matrix_flag} is not 0 or 1"
        )
    is_matrix = bool(matrix_flag)
    if is_matrix and rows < 2:
        raise ShaderExtractionError(
            f"{label}: matrix parameter must have at least two rows"
        )
    array_size = reader.i32(f"{label} parameter array size")
    if not 0 <= array_size <= MAX_ARRAY_ITEMS:
        raise ShaderExtractionError(
            f"{label}: parameter array size {array_size} is invalid"
        )
    index = reader.i32(f"{label} parameter index")
    if not 0 <= index <= MAX_INDEX_VALUE:
        raise ShaderExtractionError(
            f"{label}: parameter index {index} is invalid"
        )
    return {
        "name": name,
        "type": param_type,
        "rows": rows,
        "columns": columns,
        "isMatrix": is_matrix,
        "arraySize": array_size,
        "index": index,
    }


def _parse_parameters_record(data: bytes, unity_version: tuple[int, int], label: str) -> dict[str, Any]:
    reader = _Reader(data, label)
    version = reader.i32("parameter version")
    expected = _expected_program_version(unity_version)
    if version != expected:
        raise ShaderExtractionError(
            f"{label}: shader program version {version} does not match {expected}"
        )

    group_count = reader.count("parameter group")
    if group_count < 1:
        raise ShaderExtractionError(f"{label}: parameter group count must include the global group")
    groups: list[dict[str, Any]] = []
    for group_index in range(group_count):
        group_name = reader.string(f"parameter group {group_index} name")
        used_size = reader.i32(f"parameter group {group_index} used size")
        if not 0 <= used_size <= MAX_INDEX_VALUE:
            raise ShaderExtractionError(
                f"{label}: parameter group {group_index} used size {used_size} is invalid"
            )
        param_count = reader.count(f"parameter group {group_index} parameter")
        parameters = [
            _parse_parameter(data, reader, f"parameter group {group_index} item {index}")
            for index in range(param_count)
        ]
        struct_count = reader.count(f"parameter group {group_index} struct")
        structs: list[dict[str, Any]] = []
        for struct_index in range(struct_count):
            struct_name = reader.string(f"parameter group {group_index} struct {struct_index} name")
            struct_value_index = reader.i32(f"parameter group {group_index} struct {struct_index} index")
            struct_array_size = reader.i32(f"parameter group {group_index} struct {struct_index} array size")
            struct_size = reader.i32(f"parameter group {group_index} struct {struct_index} size")
            if not 0 <= struct_value_index <= MAX_INDEX_VALUE:
                raise ShaderExtractionError(
                    f"{label}: parameter group {group_index} struct {struct_index} index {struct_value_index} is invalid"
                )
            if not 0 <= struct_array_size <= MAX_ARRAY_ITEMS:
                raise ShaderExtractionError(
                    f"{label}: parameter group {group_index} struct {struct_index} array size {struct_array_size} is invalid"
                )
            if not 0 <= struct_size <= MAX_INDEX_VALUE:
                raise ShaderExtractionError(
                    f"{label}: parameter group {group_index} struct {struct_index} size {struct_size} is invalid"
                )
            member_count = reader.count(
                f"parameter group {group_index} struct {struct_index} parameter"
            )
            members = [
                _parse_parameter(
                    data,
                    reader,
                    f"parameter group {group_index} struct {struct_index} item {index}",
                )
                for index in range(member_count)
            ]
            structs.append({
                "name": struct_name,
                "index": struct_value_index,
                "arraySize": struct_array_size,
                "size": struct_size,
                "parameters": members,
            })
        groups.append({
            "name": group_name,
            "usedSize": used_size,
            "parameters": parameters,
            "structs": structs,
        })

    resource_count = reader.count("resource parameter")
    resources: list[dict[str, Any]] = []
    for resource_index in range(resource_count):
        resource_name = reader.string(f"resource {resource_index} name")
        resource_type = reader.i32(f"resource {resource_index} type")
        resource_value_index = reader.i32(f"resource {resource_index} index")
        extra_value = reader.i32(f"resource {resource_index} extra value")
        if resource_type not in {0, 1, 2, 3, 4}:
            raise ShaderExtractionError(f"{label}: unsupported resource parameter type {resource_type}")
        if not 0 <= resource_value_index <= MAX_INDEX_VALUE:
            raise ShaderExtractionError(
                f"{label}: resource {resource_index} index {resource_value_index} is invalid"
            )
        if not 0 <= extra_value <= MAX_INDEX_VALUE:
            raise ShaderExtractionError(
                f"{label}: resource {resource_index} extra value {extra_value} is invalid"
            )
        resource: dict[str, Any] = {
            "name": resource_name,
            "type": resource_type,
            "index": resource_value_index,
            "extraValue": extra_value,
        }
        if resource_type == 0:
            texture_extra = reader.u32(f"resource {resource_index} texture extra value")
            texture_dimension = texture_extra >> 1
            if texture_dimension not in KNOWN_TEXTURE_DIMENSIONS:
                raise ShaderExtractionError(
                    f"{label}: resource {resource_index} texture dimension {texture_dimension} is invalid"
                )
            resource["textureDimension"] = texture_dimension
            resource["multisampled"] = bool(texture_extra & 1)
        resources.append(resource)
    reader.finish()
    return {
        "kind": "parameters",
        "version": version,
        "groups": groups,
        "resources": resources,
        "recordSha256": hashlib.sha256(data).hexdigest(),
    }


def _normalise_rows(value: Any, platform_count: int, label: str) -> list[list[int]]:
    """Normalize UnityPy's nested arrays while rejecting ragged source data."""
    rows = _as_list(value, label)
    if platform_count == 1 and (not rows or not isinstance(rows[0], (list, tuple))):
        rows = [rows]
    if len(rows) != platform_count:
        raise ShaderExtractionError(
            f"{label} has {len(rows)} platform rows; expected {platform_count}"
        )
    result = []
    for row_index, row in enumerate(rows):
        if not isinstance(row, (list, tuple)):
            raise ShaderExtractionError(f"{label}[{row_index}] is not a chunk sequence")
        result.append([_as_int(item, f"{label}[{row_index}] value") for item in row])
    return result


def _decompress_lz4(data: bytes, expected_size: int, label: str) -> bytes:
    if expected_size <= 0 or expected_size > MAX_DECOMPRESSED_CHUNK_BYTES:
        raise ShaderExtractionError(
            f"{label}: decompressed size {expected_size} is outside the allowed range"
        )
    if len(data) <= 0:
        raise ShaderExtractionError(f"{label}: compressed block is empty")
    try:
        import lz4.block
    except ImportError as exc:
        raise ShaderExtractionError("lz4.block is required to extract Unity shader blobs") from exc
    try:
        result = lz4.block.decompress(data, uncompressed_size=expected_size)
    except Exception as exc:  # lz4 raises implementation-specific exceptions.
        raise ShaderExtractionError(f"{label}: invalid LZ4 block") from exc
    if len(result) != expected_size:
        raise ShaderExtractionError(
            f"{label}: decompressed {len(result)} bytes; expected {expected_size}"
        )
    return result


def _parse_offset_table(table: bytes, chunk_count: int, label: str) -> list[dict[str, int]]:
    if len(table) > MAX_OFFSET_TABLE_BYTES:
        raise ShaderExtractionError(
            f"{label}: offset table exceeds the {MAX_OFFSET_TABLE_BYTES}-byte limit"
        )
    reader = _Reader(table, label)
    entry_count = reader.count("shader sub-program entry")
    required = entry_count * 12
    if required > MAX_OFFSET_TABLE_BYTES:
        raise ShaderExtractionError(
            f"{label}: offset table entry area exceeds the {MAX_OFFSET_TABLE_BYTES}-byte limit"
        )
    if required > reader.remaining:
        raise ShaderExtractionError(
            f"{label}: offset table needs {required} bytes; only {reader.remaining} remain"
        )
    entries = []
    intervals_by_segment: dict[int, list[tuple[int, int, int]]] = defaultdict(list)
    for index in range(entry_count):
        offset = reader.i32(f"entry {index} offset")
        size = reader.i32(f"entry {index} size")
        segment = reader.i32(f"entry {index} segment")
        if offset < 0 or size <= 0:
            raise ShaderExtractionError(f"{label}: entry {index} has invalid offset/size")
        # Unity may pack the offset table and all records into one compressed
        # chunk.  In that layout the record segment is legitimately 0.  The
        # segment is still bounds-checked below; rejecting zero here would
        # make the extractor fail on the real BAAD 2021.3 shader blobs.
        if segment < 0 or segment >= chunk_count:
            raise ShaderExtractionError(
                f"{label}: entry {index} references invalid segment {segment}"
            )
        entries.append({"blobIndex": index, "offset": offset, "size": size, "segment": segment})
        intervals_by_segment[segment].append((offset, offset + size, index))
    for segment, intervals in intervals_by_segment.items():
        previous: tuple[int, int, int] | None = None
        for start, end, index in sorted(intervals):
            if previous is not None and start < previous[1]:
                raise ShaderExtractionError(
                    f"{label}: entries {previous[2]} and {index} overlap in segment {segment}"
                )
            previous = (start, end, index)
    table_end = reader.position
    # A shader can use either one chunk containing the table and records, or a
    # table-only first chunk followed by record chunks.  In the former layout
    # the entries point back into chunk 0, immediately after the table.  Do not
    # interpret those records as table padding, but still reject a segment-0
    # entry that overlaps the table itself.  When no entry uses chunk 0, the
    # first chunk is table-only and any non-zero tail is malformed data.
    segment_zero = [entry for entry in entries if entry["segment"] == 0]
    if segment_zero:
        for entry in segment_zero:
            if entry["offset"] < table_end:
                raise ShaderExtractionError(
                    f"{label}: entry {entry['blobIndex']} overlaps the offset table"
                )
    elif reader.remaining and any(reader.bytes(reader.remaining, "offset table padding")):
        raise ShaderExtractionError(f"{label}: non-zero offset table padding")
    return entries


def _record_for_entry(
    chunks: Sequence[bytes],
    entry: Mapping[str, int],
    unity_version: tuple[int, int],
    kind: str,
    label: str,
) -> dict[str, Any]:
    segment = int(entry["segment"])
    offset = int(entry["offset"])
    size = int(entry["size"])
    chunk = chunks[segment]
    if offset + size > len(chunk):
        raise ShaderExtractionError(
            f"{label}: entry {entry['blobIndex']} exceeds segment {segment} bounds"
        )
    raw = chunk[offset:offset + size]
    if kind == "program":
        parsed = _parse_program_record(raw, unity_version, label)
    elif kind == "parameters":
        parsed = _parse_parameters_record(raw, unity_version, label)
    else:
        raise ShaderExtractionError(f"{label}: unknown record kind {kind!r}")
    parsed.update({
        "blobIndex": int(entry["blobIndex"]),
        "offset": offset,
        "size": size,
        "segment": segment,
    })
    return parsed


def parse_shader_blob(
    compressed_blob: Any,
    offsets: Any,
    compressed_lengths: Any,
    decompressed_lengths: Any,
    platforms: Any,
    unity_version: Any = (2021, 3),
    program_indices_by_platform: Mapping[int, Iterable[int]] | None = None,
    parameter_indices_by_platform: Mapping[int, Iterable[int]] | None = None,
) -> dict[str, Any]:
    """Decompress and parse a Unity 2021.3 shader blob.

    ``program_indices_by_platform`` and ``parameter_indices_by_platform`` are
    table-index sets gathered from ``m_PlayerSubPrograms``.  They are keyed by
    compiler platform because the same integer can be a program record in the
    GLES3 row and a parameter record in the Vulkan row.
    """
    major, minor, version_text = _require_unity_2021_3(unity_version)
    blob = _bytes(compressed_blob, "compressedBlob")
    platform_values = [_as_int(item, "platform") for item in _as_list(platforms, "platforms")]
    if not platform_values:
        raise ShaderExtractionError("shader has no serialized compiler platforms")
    if len(set(platform_values)) != len(platform_values):
        raise ShaderExtractionError("shader has duplicate compiler platforms")
    unknown_platforms = [
        platform for platform in platform_values if platform not in KNOWN_PLATFORM_VALUES
    ]
    if unknown_platforms:
        raise ShaderExtractionError(
            f"unknown compiler platform values: {sorted(set(unknown_platforms))[:5]}"
        )
    offset_rows = _normalise_rows(offsets, len(platform_values), "offsets")
    compressed_rows = _normalise_rows(compressed_lengths, len(platform_values), "compressedLengths")
    decompressed_rows = _normalise_rows(
        decompressed_lengths, len(platform_values), "decompressedLengths"
    )
    if not (len(offset_rows) == len(compressed_rows) == len(decompressed_rows)):
        raise ShaderExtractionError("shader chunk metadata rows do not match")

    program_indices_by_platform = program_indices_by_platform or {}
    parameter_indices_by_platform = parameter_indices_by_platform or {}
    global_intervals: list[tuple[int, int, int, int]] = []
    total_decompressed_size = 0
    for platform_index, platform in enumerate(platform_values):
        offsets_row = offset_rows[platform_index]
        compressed_row = compressed_rows[platform_index]
        decompressed_row = decompressed_rows[platform_index]
        if not (len(offsets_row) == len(compressed_row) == len(decompressed_row)):
            raise ShaderExtractionError(
                f"platform {platform} chunk metadata lengths do not match"
            )
        if not offsets_row:
            raise ShaderExtractionError(f"platform {platform} has no compressed chunks")
        if len(offsets_row) > MAX_CHUNKS_PER_PLATFORM:
            raise ShaderExtractionError(
                f"platform {platform} has too many compressed chunks: {len(offsets_row)}"
            )
        previous_end = -1
        for chunk_index, (offset, compressed_size, decompressed_size) in enumerate(
            zip(offsets_row, compressed_row, decompressed_row)
        ):
            if offset < 0 or compressed_size <= 0 or decompressed_size <= 0:
                raise ShaderExtractionError(
                    f"platform {platform} chunk {chunk_index} has invalid offset/size"
                )
            if compressed_size > MAX_COMPRESSED_BLOB_BYTES:
                raise ShaderExtractionError(
                    f"platform {platform} chunk {chunk_index} compressed size is too large"
                )
            if decompressed_size > MAX_DECOMPRESSED_CHUNK_BYTES:
                raise ShaderExtractionError(
                    f"platform {platform} chunk {chunk_index} decompressed size is too large"
                )
            if offset < previous_end:
                raise ShaderExtractionError(
                    f"platform {platform} chunk {chunk_index} overlaps a prior compressed chunk"
                )
            end = offset + compressed_size
            if end > len(blob):
                raise ShaderExtractionError(
                    f"platform {platform} chunk {chunk_index} exceeds compressedBlob"
                )
            previous_end = end
            total_decompressed_size += decompressed_size
            if total_decompressed_size > MAX_DECOMPRESSED_TOTAL_BYTES:
                raise ShaderExtractionError(
                    f"shader decompressed chunks exceed the {MAX_DECOMPRESSED_TOTAL_BYTES}-byte limit"
                )
            global_intervals.append((offset, end, platform, chunk_index))
    previous_global: tuple[int, int, int, int] | None = None
    for start, end, platform, chunk_index in sorted(global_intervals):
        if previous_global is not None and start < previous_global[1]:
            raise ShaderExtractionError(
                "compressedBlob intervals overlap: "
                f"platform {previous_global[2]} chunk {previous_global[3]} and "
                f"platform {platform} chunk {chunk_index}"
            )
        previous_global = (start, end, platform, chunk_index)
    all_chunks: list[dict[str, Any]] = []
    records: list[dict[str, Any]] = []
    record_map: dict[str, dict[str, Any]] = {}
    platform_results: list[dict[str, Any]] = []

    for platform_index, platform in enumerate(platform_values):
        offsets_row = offset_rows[platform_index]
        compressed_row = compressed_rows[platform_index]
        decompressed_row = decompressed_rows[platform_index]
        if not (len(offsets_row) == len(compressed_row) == len(decompressed_row)):
            raise ShaderExtractionError(
                f"platform {platform} chunk metadata lengths do not match"
            )
        if not offsets_row:
            raise ShaderExtractionError(f"platform {platform} has no compressed chunks")

        chunks: list[bytes] = []
        chunk_results: list[dict[str, Any]] = []
        previous_end = -1
        for chunk_index, (offset, compressed_size, decompressed_size) in enumerate(
            zip(offsets_row, compressed_row, decompressed_row)
        ):
            if offset < 0 or compressed_size <= 0 or decompressed_size <= 0:
                raise ShaderExtractionError(
                    f"platform {platform} chunk {chunk_index} has invalid offset/size"
                )
            if offset < previous_end:
                raise ShaderExtractionError(
                    f"platform {platform} chunk {chunk_index} overlaps a prior compressed chunk"
                )
            end = offset + compressed_size
            if end > len(blob):
                raise ShaderExtractionError(
                    f"platform {platform} chunk {chunk_index} exceeds compressedBlob"
                )
            previous_end = end
            raw = _decompress_lz4(
                blob[offset:end],
                decompressed_size,
                f"platform {platform} chunk {chunk_index}",
            )
            chunks.append(raw)
            chunk_result = {
                "index": chunk_index,
                "compressedOffset": offset,
                "compressedSize": compressed_size,
                "decompressedSize": decompressed_size,
                "sha256": hashlib.sha256(raw).hexdigest(),
            }
            chunk_results.append(chunk_result)
            all_chunks.append({"platform": platform, **chunk_result})

        table = _parse_offset_table(chunks[0], len(chunks), f"platform {platform} offset table")
        table_by_index = {entry["blobIndex"]: entry for entry in table}
        requested_programs = {
            _as_index(index, f"platform {platform} program blob index")
            for index in program_indices_by_platform.get(platform, ())
        }
        requested_parameters = {
            _as_index(index, f"platform {platform} parameter blob index")
            for index in parameter_indices_by_platform.get(platform, ())
        }
        overlap = requested_programs & requested_parameters
        if overlap:
            raise ShaderExtractionError(
                f"platform {platform} uses the same blob indices as program and parameter records: "
                f"{sorted(overlap)[:5]}"
            )
        missing = (requested_programs | requested_parameters) - table_by_index.keys()
        if missing:
            raise ShaderExtractionError(
                f"platform {platform} references absent blob indices: {sorted(missing)[:5]}"
            )

        platform_record_results: list[dict[str, Any]] = []
        for blob_index in sorted(requested_programs):
            entry = table_by_index[blob_index]
            parsed = _record_for_entry(
                chunks,
                entry,
                (major, minor),
                "program",
                f"platform {platform} program {blob_index}",
            )
            if parsed["gpuProgramType"] not in PLATFORM_GPU_PROGRAM_TYPES[platform]:
                raise ShaderExtractionError(
                    f"platform {platform} program {blob_index} has incompatible GPU program type "
                    f"{parsed['gpuProgramType']}"
                )
            parsed["platform"] = platform
            parsed["platformName"] = PLATFORM_NAMES.get(platform, f"Platform{platform}")
            records.append(parsed)
            platform_record_results.append(parsed)
            record_map[f"{platform}:program:{blob_index}"] = parsed
        for blob_index in sorted(requested_parameters):
            entry = table_by_index[blob_index]
            parsed = _record_for_entry(
                chunks,
                entry,
                (major, minor),
                "parameters",
                f"platform {platform} parameters {blob_index}",
            )
            parsed["platform"] = platform
            parsed["platformName"] = PLATFORM_NAMES.get(platform, f"Platform{platform}")
            records.append(parsed)
            platform_record_results.append(parsed)
            record_map[f"{platform}:parameters:{blob_index}"] = parsed

        platform_results.append({
            "platform": platform,
            "platformName": PLATFORM_NAMES.get(platform, f"Platform{platform}"),
            "entryCount": len(table),
            "chunks": chunk_results,
            "records": [
                {"kind": record["kind"], "blobIndex": record["blobIndex"], "segment": record["segment"]}
                for record in sorted(platform_record_results, key=lambda item: (item["kind"], item["blobIndex"]))
            ],
        })

    return {
        "unityVersion": version_text,
        "platforms": platform_results,
        "chunks": all_chunks,
        "records": sorted(records, key=lambda item: (item["platform"], item["kind"], item["blobIndex"])),
        "recordMap": record_map,
    }


STAGE_FIELDS = (
    ("vertex", "progVertex"),
    ("fragment", "progFragment"),
    ("geometry", "progGeometry"),
    ("hull", "progHull"),
    ("domain", "progDomain"),
    ("rayTracing", "progRayTracing"),
)


def _keyword_indices(program: Any, sub_program: Any) -> list[int]:
    direct = _member(sub_program, "m_KeywordIndices")
    if direct is None:
        values = _as_list(
            _member(sub_program, "m_GlobalKeywordIndices", []),
            "global keyword indices",
        )
        values.extend(
            _as_list(
                _member(sub_program, "m_LocalKeywordIndices", []),
                "local keyword indices",
            )
        )
        if len(values) > MAX_ARRAY_ITEMS:
            raise ShaderExtractionError(
                f"keyword indices has too many items: {len(values)}"
            )
        direct = values
    result = []
    for index, value in enumerate(_as_list(direct, "keyword indices")):
        result.append(_as_index(value, f"keyword index {index}"))
    return result


def _collect_bindings(parsed: Any) -> tuple[list[dict[str, Any]], list[str]]:
    keyword_names = [
        str(value)
        for value in _as_list(_member(parsed, "m_KeywordNames", []), "m_KeywordNames")
    ]
    bindings: list[dict[str, Any]] = []
    sub_shaders = _as_list(_member(parsed, "m_SubShaders", []), "m_SubShaders")
    for sub_shader_index, sub_shader in enumerate(sub_shaders):
        passes = _as_list(_member(sub_shader, "m_Passes", []), f"subshader {sub_shader_index} passes")
        for pass_index, shader_pass in enumerate(passes):
            pass_name = _member(shader_pass, "m_Name")
            state = _member(shader_pass, "m_State")
            state_name = _member(state, "m_Name")
            for stage, field in STAGE_FIELDS:
                program = _member(shader_pass, field)
                if program is None:
                    continue
                players_value = _member(program, "m_PlayerSubPrograms")
                params_value = _member(program, "m_ParameterBlobIndices")
                players = _as_list(players_value, f"{stage} player sub-programs") if players_value is not None else []
                params = _as_list(params_value, f"{stage} parameter blob indices") if params_value is not None else []
                if players:
                    if params and len(params) != len(players):
                        raise ShaderExtractionError(
                            f"subshader {sub_shader_index} pass {pass_index} {stage} player/parameter rows differ"
                        )
                    for group_index, row_value in enumerate(players):
                        row = _as_list(row_value, f"{stage} player row {group_index}")
                        param_row = _as_list(params[group_index], f"{stage} parameter row {group_index}") if params else []
                        if params and len(param_row) != len(row):
                            raise ShaderExtractionError(
                                f"subshader {sub_shader_index} pass {pass_index} {stage} row {group_index} differs"
                            )
                        for player_index, sub_program in enumerate(row):
                            blob_index = _as_index(
                                _member(sub_program, "m_BlobIndex"),
                                f"{stage} blob index",
                            )
                            gpu_type = _as_int(_member(sub_program, "m_GpuProgramType"), f"{stage} GPU type")
                            if gpu_type not in GPU_PROGRAM_TYPE_NAMES:
                                raise ShaderExtractionError(f"unknown GPU program type {gpu_type}")
                            indices = _keyword_indices(program, sub_program)
                            invalid = [index for index in indices if index >= len(keyword_names)]
                            if invalid:
                                raise ShaderExtractionError(
                                    f"{stage} blob {blob_index} has keyword indices outside m_KeywordNames: {invalid[:5]}"
                                )
                            bindings.append({
                                "subShaderIndex": sub_shader_index,
                                "passIndex": pass_index,
                                "passName": None if pass_name is None else str(pass_name),
                                "stateName": None if state_name is None else str(state_name),
                                "stage": stage,
                                "playerGroupIndex": group_index,
                                "playerIndex": player_index,
                                "subProgramIndex": player_index,
                                "blobIndex": blob_index,
                                "parameterBlobIndex": _as_index(
                                    param_row[player_index], f"{stage} parameter blob index"
                                ) if params else None,
                                "gpuProgramType": gpu_type,
                                "gpuProgramTypeName": GPU_PROGRAM_TYPE_NAMES[gpu_type],
                                "keywordIndices": indices,
                                "keywordNames": [keyword_names[index] for index in indices],
                                "shaderRequirements": _member(sub_program, "m_ShaderRequirements"),
                            })
                else:
                    sub_programs = _as_list(_member(program, "m_SubPrograms", []), f"{stage} sub-programs")
                    for sub_program_index, sub_program in enumerate(sub_programs):
                        blob_index = _as_index(
                            _member(sub_program, "m_BlobIndex"), f"{stage} blob index"
                        )
                        gpu_type = _as_int(_member(sub_program, "m_GpuProgramType"), f"{stage} GPU type")
                        if gpu_type not in GPU_PROGRAM_TYPE_NAMES:
                            raise ShaderExtractionError(f"unknown GPU program type {gpu_type}")
                        indices = _keyword_indices(program, sub_program)
                        invalid = [index for index in indices if index >= len(keyword_names)]
                        if invalid:
                            raise ShaderExtractionError(
                                f"{stage} blob {blob_index} has keyword indices outside m_KeywordNames: {invalid[:5]}"
                            )
                        bindings.append({
                            "subShaderIndex": sub_shader_index,
                            "passIndex": pass_index,
                            "passName": None if pass_name is None else str(pass_name),
                            "stateName": None if state_name is None else str(state_name),
                            "stage": stage,
                            "playerGroupIndex": None,
                            "playerIndex": None,
                            "subProgramIndex": sub_program_index,
                            "blobIndex": blob_index,
                            "parameterBlobIndex": None,
                            "gpuProgramType": gpu_type,
                            "gpuProgramTypeName": GPU_PROGRAM_TYPE_NAMES[gpu_type],
                            "keywordIndices": indices,
                            "keywordNames": [keyword_names[index] for index in indices],
                            "shaderRequirements": _member(sub_program, "m_ShaderRequirements"),
                        })
                if not players and params and any(_as_list(row, "parameter row") for row in params):
                    raise ShaderExtractionError(
                        f"subshader {sub_shader_index} pass {pass_index} {stage} has parameters without players"
                    )
    return bindings, keyword_names


def _platform_for_gpu_type(platforms: Sequence[int], gpu_type: int) -> int:
    if gpu_type not in GPU_PROGRAM_TYPE_NAMES:
        raise ShaderExtractionError(f"unknown GPU program type {gpu_type}")
    unknown = [platform for platform in platforms if platform not in KNOWN_PLATFORM_VALUES]
    if unknown:
        raise ShaderExtractionError(
            f"unknown compiler platform values: {sorted(set(unknown))[:5]}"
        )
    candidates = [
        platform
        for platform in platforms
        if gpu_type in PLATFORM_GPU_PROGRAM_TYPES.get(platform, frozenset())
    ]
    if len(candidates) != 1:
        raise ShaderExtractionError(
            f"GPU program type {gpu_type} maps to {len(candidates)} compiler platforms; "
            "source identity is ambiguous"
        )
    return candidates[0]


def _source_reference(bundle_sha256: str, assets_file: Any, object_id: Any) -> dict[str, str]:
    bundle_hash = str(bundle_sha256).lower()
    if not re.fullmatch(r"[0-9a-f]{64}", bundle_hash):
        raise ShaderExtractionError("bundle SHA-256 must be exactly 64 hexadecimal characters")
    serialized_file_value = _member(assets_file, "name", "")
    if not isinstance(serialized_file_value, str):
        raise ShaderExtractionError("shader serialized file source reference is not text")
    serialized_file = serialized_file_value
    if not serialized_file or len(serialized_file.encode("utf-8")) > MAX_STRING_BYTES:
        raise ShaderExtractionError("shader has no serialized file source reference")
    if "\x00" in serialized_file:
        raise ShaderExtractionError("shader serialized file source reference contains NUL")
    if isinstance(object_id, bool) or not isinstance(object_id, numbers.Integral):
        raise ShaderExtractionError("shader object ID is not an integer")
    object_id_value = int(object_id)
    if not MIN_SOURCE_OBJECT_ID <= object_id_value <= MAX_SOURCE_OBJECT_ID:
        raise ShaderExtractionError("shader object ID is outside signed 64-bit range")
    if object_id_value == 0:
        raise ShaderExtractionError("shader object ID must be non-zero")
    return {
        "bundleSha256": bundle_hash,
        "serializedFile": serialized_file,
        "objectId": str(object_id_value),
    }


def extract_shader_object(obj: Any, bundle_sha256: str) -> dict[str, Any]:
    """Extract one UnityPy Shader object into deterministic metadata."""
    try:
        assets_file = _member(obj, "assets_file")
        value = obj.read() if hasattr(obj, "read") else obj
    except ShaderExtractionError:
        raise
    except Exception as exc:
        raise ShaderExtractionError("UnityPy could not read the Shader object") from exc
    parsed = _member(value, "m_ParsedForm")
    if parsed is None:
        raise ShaderExtractionError("shader has no m_ParsedForm")
    unity_version_value = _member(assets_file, "version")
    major, minor, unity_version_text = _require_unity_2021_3(unity_version_value)
    blob = _bytes(_member(value, "compressedBlob"), "compressedBlob")
    if not blob:
        raise ShaderExtractionError("shader has no compressedBlob")
    platforms = _as_list(_member(value, "platforms"), "platforms")
    bindings, keyword_names = _collect_bindings(parsed)
    program_indices: dict[int, set[int]] = defaultdict(set)
    parameter_indices: dict[int, set[int]] = defaultdict(set)
    for binding in bindings:
        platform = _platform_for_gpu_type(
            [_as_int(item, "platform") for item in platforms], binding["gpuProgramType"]
        )
        binding["platform"] = platform
        program_indices[platform].add(binding["blobIndex"])
        if binding["parameterBlobIndex"] is not None:
            parameter_indices[platform].add(binding["parameterBlobIndex"])

    blob_result = parse_shader_blob(
        blob,
        _member(value, "offsets"),
        _member(value, "compressedLengths"),
        _member(value, "decompressedLengths"),
        platforms,
        (major, minor),
        program_indices,
        parameter_indices,
    )
    record_map = blob_result.pop("recordMap")
    records = blob_result["records"]
    source_reference = _source_reference(bundle_sha256, assets_file, _member(obj, "path_id"))
    for record in records:
        record["sourceReference"] = source_reference
    canonical_programs = [
        record
        for record in records
        if record["kind"] == "program" and record["gpuProgramType"] == GLES3_PROGRAM_TYPE
    ]
    for binding in bindings:
        platform = binding["platform"]
        program = record_map.get(f"{platform}:program:{binding['blobIndex']}")
        if program is None:
            raise ShaderExtractionError(
                f"platform {platform} program {binding['blobIndex']} could not be decoded"
            )
        if program["gpuProgramType"] != binding["gpuProgramType"]:
            raise ShaderExtractionError(
                f"platform {platform} program {binding['blobIndex']} GPU program type "
                f"{program['gpuProgramType']} disagrees with binding "
                f"{binding['gpuProgramType']}"
            )
        parameter = None
        if binding["parameterBlobIndex"] is not None:
            parameter = record_map.get(
                f"{platform}:parameters:{binding['parameterBlobIndex']}"
            )
            if parameter is None:
                raise ShaderExtractionError(
                    f"platform {platform} parameter {binding['parameterBlobIndex']} could not be decoded"
                )
        binding["programHash"] = program["programHash"]
        binding["programRecordSha256"] = program["recordSha256"]
        binding["parameterRecordSha256"] = parameter["recordSha256"] if parameter else None
        binding["gles3ProgramHash"] = (
            program["programHash"] if program["gpuProgramType"] == GLES3_PROGRAM_TYPE else None
        )
        binding["sourceReference"] = source_reference
    bindings.sort(key=lambda item: (
        item["subShaderIndex"],
        item["passIndex"],
        item["stage"],
        -1 if item["playerGroupIndex"] is None else item["playerGroupIndex"],
        -1 if item["playerIndex"] is None else item["playerIndex"],
        item["subProgramIndex"],
    ))
    result: dict[str, Any] = {
        "schemaVersion": EXTRACTOR_VERSION,
        "extractorVersion": EXTRACTOR_VERSION,
        "unityVersion": unity_version_text,
        "shader": {
            "name": str(_member(parsed, "m_Name", _member(value, "m_Name", ""))),
            "sourceReference": source_reference,
            "keywordNames": keyword_names,
        },
        "compressedBlobSha256": hashlib.sha256(blob).hexdigest(),
        **blob_result,
        "programs": records,
        "gles3Programs": canonical_programs,
        "bindings": bindings,
    }
    fingerprint_input = json.dumps(result, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    result["fingerprint"] = hashlib.sha256(fingerprint_input.encode("utf-8")).hexdigest()
    return result


def _read_file_bytes(path: pathlib.Path, label: str, limit: int) -> bytes:
    try:
        size = path.stat().st_size
    except OSError as exc:
        raise ShaderExtractionError(f"{label}: cannot stat source file") from exc
    if size < 0 or size > limit:
        raise ShaderExtractionError(
            f"{label}: source file size {size} exceeds the {limit}-byte limit"
        )
    try:
        data = path.read_bytes()
    except OSError as exc:
        raise ShaderExtractionError(f"{label}: cannot read source file") from exc
    if len(data) != size:
        raise ShaderExtractionError(
            f"{label}: read {len(data)} bytes; filesystem reported {size}"
        )
    return data


def _iter_archive_bundles(path: pathlib.Path, source_label: str) -> Iterable[tuple[str, bytes]]:
    try:
        archive_size = path.stat().st_size
    except OSError as exc:
        raise ShaderExtractionError(f"{source_label}: cannot stat archive") from exc
    if archive_size < 0 or archive_size > MAX_ARCHIVE_BYTES:
        raise ShaderExtractionError(
            f"{source_label}: archive size {archive_size} exceeds the {MAX_ARCHIVE_BYTES}-byte limit"
        )
    try:
        with zipfile.ZipFile(path) as archive:
            infos = archive.infolist()
            if len(infos) > MAX_ARCHIVE_MEMBERS:
                raise ShaderExtractionError(
                    f"{source_label}: archive has {len(infos)} members; "
                    f"limit is {MAX_ARCHIVE_MEMBERS}"
                )
            declared_total = 0
            for info in infos:
                member_size = int(info.file_size)
                if member_size < 0 or member_size > MAX_ARCHIVE_MEMBER_BYTES:
                    raise ShaderExtractionError(
                        f"{source_label}:{info.filename}: member size {member_size} is invalid"
                    )
                declared_total += member_size
                if declared_total > MAX_ARCHIVE_TOTAL_BYTES:
                    raise ShaderExtractionError(
                        f"{source_label}: declared member sizes exceed the "
                        f"{MAX_ARCHIVE_TOTAL_BYTES}-byte limit"
                    )
            for info in sorted(infos, key=lambda item: item.filename):
                if info.is_dir() or not info.filename.lower().endswith(".bundle"):
                    continue
                try:
                    data = archive.read(info)
                except Exception as exc:
                    raise ShaderExtractionError(
                        f"{source_label}:{info.filename}: cannot read archive member"
                    ) from exc
                if len(data) != info.file_size:
                    raise ShaderExtractionError(
                        f"{source_label}:{info.filename}: read {len(data)} bytes; "
                        f"expected {info.file_size}"
                    )
                yield f"{path.name}:{info.filename}", data
    except ShaderExtractionError:
        raise
    except Exception as exc:
        raise ShaderExtractionError(f"{source_label}: malformed ZIP archive") from exc


def _iter_bundle_bytes(source: pathlib.Path) -> Iterable[tuple[str, bytes]]:
    try:
        if source.is_file():
            if source.suffix.lower() == ".zip":
                yield from _iter_archive_bundles(source, str(source))
            else:
                yield source.name, _read_file_bytes(source, str(source), MAX_ARCHIVE_MEMBER_BYTES)
            return
        if not source.is_dir():
            raise ShaderExtractionError(f"source path does not exist: {source}")
        paths = sorted(source.rglob("*"), key=lambda item: item.as_posix().lower())
        for path in paths:
            if not path.is_file():
                continue
            if path.suffix.lower() == ".zip":
                yield from _iter_archive_bundles(
                    path, path.relative_to(source).as_posix()
                )
            elif path.suffix.lower() == ".bundle":
                yield path.relative_to(source).as_posix(), _read_file_bytes(
                    path, path.relative_to(source).as_posix(), MAX_ARCHIVE_MEMBER_BYTES
                )
    except ShaderExtractionError:
        raise
    except Exception as exc:
        raise ShaderExtractionError(f"cannot enumerate BAAD source {source}") from exc


def extract_baad(source: str | pathlib.Path, shader_name: str | None = None) -> dict[str, Any]:
    """Extract all matching Shader objects from a BAAD directory/archive."""
    try:
        source_path = pathlib.Path(source).resolve()
    except (OSError, TypeError, ValueError) as exc:
        raise ShaderExtractionError(f"invalid source path: {source!r}") from exc
    try:
        import UnityPy
    except ImportError as exc:
        raise ShaderExtractionError("UnityPy is required for BAAD extraction") from exc
    extracted: list[dict[str, Any]] = []
    seen_bundle_hashes: set[str] = set()
    seen_source_references: set[tuple[str, str, str]] = set()
    for bundle_label, bundle_bytes in _iter_bundle_bytes(source_path):
        bundle_sha256 = hashlib.sha256(bundle_bytes).hexdigest()
        if bundle_sha256 in seen_bundle_hashes:
            continue
        seen_bundle_hashes.add(bundle_sha256)
        try:
            environment = UnityPy.load(bundle_bytes)
            objects = _as_list(
                _member(environment, "objects", []),
                f"{bundle_label}: UnityPy objects",
            )
            shader_objects = [
                obj for obj in objects if getattr(_member(obj, "type"), "name", "") == "Shader"
            ]
            shader_objects.sort(
                key=lambda obj: (
                    str(_member(_member(obj, "assets_file"), "name", "")),
                    str(_member(obj, "path_id")),
                )
            )
        except ShaderExtractionError:
            raise
        except Exception as exc:
            raise ShaderExtractionError(
                f"{bundle_label}: UnityPy could not load the bundle"
            ) from exc
        for obj in shader_objects:
            try:
                value = obj.read()
            except ShaderExtractionError:
                raise
            except Exception as exc:
                raise ShaderExtractionError(
                    f"{bundle_label}: UnityPy could not read a Shader object"
                ) from exc
            try:
                parsed = _member(value, "m_ParsedForm")
                name = str(_member(parsed, "m_Name", _member(value, "m_Name", ""))) if parsed else ""
            except ShaderExtractionError:
                raise
            except Exception as exc:
                raise ShaderExtractionError(
                    f"{bundle_label}: UnityPy could not inspect a Shader object"
                ) from exc
            if shader_name is not None and name != shader_name:
                continue
            try:
                extraction = extract_shader_object(obj, bundle_sha256)
            except ShaderExtractionError as exc:
                raise ShaderExtractionError(f"{bundle_label} Shader {name!r}: {exc}") from exc
            except Exception as exc:
                raise ShaderExtractionError(
                    f"{bundle_label} Shader {name!r}: UnityPy extraction failed"
                ) from exc
            source_reference = extraction["shader"]["sourceReference"]
            reference_key = (
                source_reference["bundleSha256"],
                source_reference["serializedFile"],
                source_reference["objectId"],
            )
            if reference_key in seen_source_references:
                continue
            seen_source_references.add(reference_key)
            extracted.append(extraction)
    if shader_name is not None and not extracted:
        raise ShaderExtractionError(f"shader {shader_name!r} was not found in {source_path}")
    return {
        "schemaVersion": EXTRACTOR_VERSION,
        "extractorVersion": EXTRACTOR_VERSION,
        # Do not put the caller's absolute path in deterministic output.
        "source": "BAAD",
        "shaders": sorted(
            extracted,
            key=lambda item: (
                item["shader"]["name"],
                item["shader"]["sourceReference"]["bundleSha256"],
                item["shader"]["sourceReference"]["serializedFile"],
                item["shader"]["sourceReference"]["objectId"],
            ),
        ),
    }


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=pathlib.Path, help="original BAAD directory, .zip, or .bundle")
    parser.add_argument("output", type=pathlib.Path, help="deterministic JSON output path")
    parser.add_argument("--shader-name", help="extract one exact Unity shader name")
    args = parser.parse_args(argv)
    result = extract_baad(args.source, args.shader_name)
    try:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(
            json.dumps(result, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
    except OSError as exc:
        raise ShaderExtractionError(f"cannot write extractor output {args.output}") from exc
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ShaderExtractionError as exc:
        print(f"shader-extractor: {exc}", file=sys.stderr)
        raise SystemExit(2)
