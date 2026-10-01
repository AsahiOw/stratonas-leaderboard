"""Focused tests for the source-driven Unity shader extractor."""

from __future__ import annotations

import hashlib
import pathlib
import struct
import sys
import tempfile
import unittest
import zipfile
from types import SimpleNamespace
from unittest import mock

try:
    import lz4.block
except ImportError:  # pragma: no cover - the managed chibi runtime supplies lz4.
    lz4 = None

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import shader_extractor as extractor_module  # noqa: E402
import inventory as inventory_module  # noqa: E402
from shader_extractor import (  # noqa: E402
    EXPECTED_UNITY_PROGRAM_VERSION,
    ShaderExtractionError,
    extract_shader_object,
    parse_shader_blob,
)


def _i32(value: int) -> bytes:
    return struct.pack("<i", value)


def _string(value: str) -> bytes:
    raw = value.encode("utf-8")
    result = bytearray(_i32(len(raw)) + raw)
    result.extend(b"\0" * ((-len(result)) % 4))
    return bytes(result)


def _program_record(code: bytes, keywords: list[str] | None = None, program_type: int = 4, version: int = EXPECTED_UNITY_PROGRAM_VERSION) -> bytes:
    result = bytearray(_i32(version) + _i32(program_type) + (_i32(0) * 4))
    keywords = keywords or []
    result.extend(_i32(len(keywords)))
    for keyword in keywords:
        result.extend(_string(keyword))
    result.extend(_i32(len(code)))
    result.extend(code)
    result.extend(b"\0" * ((-len(result)) % 4))
    result.extend(_i32(0))  # source map
    result.extend(_i32(0))  # bind channel count
    return bytes(result)


def _parameter_record(version: int = EXPECTED_UNITY_PROGRAM_VERSION) -> bytes:
    # One (empty) global group followed by an empty resource group.
    return b"".join((_i32(version), _i32(1), _string(""), _i32(0), _i32(0), _i32(0), _i32(0)))


def _blob_fixture() -> tuple[bytes, list[list[int]], list[list[int]], list[list[int]]]:
    table_placeholder = bytearray(_i32(2) + (b"\0" * 24))
    program = _program_record(b"#version 300 es\nvoid main() {}\n", ["FOO"])
    parameters = _parameter_record()
    chunks = [bytes(table_placeholder), program, parameters]
    table = bytearray(_i32(2))
    table.extend(struct.pack("<iii", 0, len(program), 1))
    table.extend(struct.pack("<iii", 0, len(parameters), 2))
    chunks[0] = bytes(table)
    compressed_chunks = [lz4.block.compress(chunk, store_size=False) for chunk in chunks]
    offsets = []
    cursor = 0
    for compressed in compressed_chunks:
        offsets.append(cursor)
        cursor += len(compressed)
    return (
        b"".join(compressed_chunks),
        [offsets],
        [[len(chunk) for chunk in compressed_chunks]],
        [[len(chunk) for chunk in chunks]],
    )


def _one_block_blob_fixture() -> tuple[bytes, list[list[int]], list[list[int]], list[list[int]]]:
    program = _program_record(b"#version 300 es\nvoid main() {}\n", ["FOO"])
    parameters = _parameter_record()
    table_size = 4 + (2 * 12)
    table = _i32(2) + struct.pack(
        "<iii", table_size, len(program), 0
    ) + struct.pack(
        "<iii", table_size + len(program), len(parameters), 0
    )
    chunk = table + program + parameters
    compressed = lz4.block.compress(chunk, store_size=False)
    return compressed, [[0]], [[len(compressed)]], [[len(chunk)]]


def _parameter_blob_fixture(
    *, parameter_type: int = 0, rows: int = 1, columns: int = 4,
    matrix_flag: int = 0, array_size: int = 0, index: int = 0,
    resource_type: int | None = None, resource_index: int = 0,
    texture_dimension: int = 2,
) -> tuple[bytes, list[list[int]], list[list[int]], list[list[int]]]:
    record = bytearray(_i32(EXPECTED_UNITY_PROGRAM_VERSION) + _i32(1))
    record.extend(_string(""))
    record.extend(_i32(0))  # used size
    record.extend(_i32(1))  # parameter count
    record.extend(_string("fixture"))
    record.extend(_i32(parameter_type))
    record.extend(_i32(rows))
    record.extend(_i32(columns))
    record.extend(_i32(matrix_flag))
    record.extend(_i32(array_size))
    record.extend(_i32(index))
    record.extend(_i32(0))  # struct count
    if resource_type is None:
        record.extend(_i32(0))
    else:
        record.extend(_i32(1))
        record.extend(_string("resource"))
        record.extend(_i32(resource_type))
        record.extend(_i32(resource_index))
        record.extend(_i32(0))
        if resource_type == 0:
            record.extend(struct.pack("<I", (texture_dimension << 1)))
    table = _i32(1) + struct.pack("<iii", 4 + 12, len(record), 0)
    chunk = table + bytes(record)
    compressed = lz4.block.compress(chunk, store_size=False)
    return compressed, [[0]], [[len(compressed)]], [[len(chunk)]]


class ShaderExtractorTests(unittest.TestCase):
    def test_multi_chunk_table_and_records_are_decompressed_and_mapped(self) -> None:
        blob, offsets, compressed_lengths, decompressed_lengths = _blob_fixture()
        result = parse_shader_blob(
            blob,
            offsets,
            compressed_lengths,
            decompressed_lengths,
            [9],
            (2021, 3),
            {9: {0}},
            {9: {1}},
        )
        self.assertEqual(result["platforms"][0]["entryCount"], 2)
        self.assertEqual(len(result["chunks"]), 3)
        self.assertEqual(
            [(record["kind"], record["blobIndex"], record["segment"]) for record in result["records"]],
            [("parameters", 1, 2), ("program", 0, 1)],
        )
        program = result["recordMap"]["9:program:0"]
        self.assertIn("#version 300 es", program["glsl"])
        self.assertEqual(program["gpuProgramType"], 4)
        self.assertEqual(program["programHash"], hashlib.sha256(b"#version 300 es\nvoid main() {}\n").hexdigest())

    def test_one_block_table_tail_contains_records(self) -> None:
        blob, offsets, compressed_lengths, decompressed_lengths = _one_block_blob_fixture()
        result = parse_shader_blob(
            blob,
            offsets,
            compressed_lengths,
            decompressed_lengths,
            [9],
            (2021, 3),
            {9: {0}},
            {9: {1}},
        )
        self.assertEqual(len(result["chunks"]), 1)
        records = {record["kind"]: record for record in result["records"]}
        self.assertEqual(records["program"]["offset"], 28)
        self.assertGreater(records["parameters"]["offset"], records["program"]["offset"])
        self.assertEqual(records["parameters"]["segment"], 0)
        self.assertIn("#version 300 es", result["recordMap"]["9:program:0"]["glsl"])

    def test_authoritative_platform_gpu_mapping_is_exact(self) -> None:
        self.assertEqual(extractor_module.PLATFORM_GPU_PROGRAM_TYPES[9], frozenset({2, 3, 4}))
        self.assertEqual(extractor_module.PLATFORM_GPU_PROGRAM_TYPES[15], frozenset({6, 7, 8}))
        self.assertNotIn(4, extractor_module.PLATFORM_GPU_PROGRAM_TYPES[0])
        self.assertNotIn(31, extractor_module.PLATFORM_GPU_PROGRAM_TYPES[19])

    def test_rejects_program_type_incompatible_with_platform(self) -> None:
        code = _program_record(b"not GLSL", program_type=1)
        table = _i32(1) + struct.pack("<iii", 16, len(code), 0)
        chunk = table + code
        compressed = lz4.block.compress(chunk, store_size=False)
        with self.assertRaisesRegex(ShaderExtractionError, "incompatible GPU program type"):
            parse_shader_blob(
                compressed,
                [[0]],
                [[len(compressed)]],
                [[len(chunk)]],
                [9],
                (2021, 3),
                {9: {0}},
                {},
            )

    def test_rejects_binding_program_gpu_type_mismatch(self) -> None:
        blob, offsets, compressed_lengths, decompressed_lengths = _blob_fixture()
        player = SimpleNamespace(
            m_BlobIndex=0,
            m_GpuProgramType=2,
            m_KeywordIndices=[0],
            m_ShaderRequirements=33,
        )
        program = SimpleNamespace(
            m_PlayerSubPrograms=[[player]],
            m_ParameterBlobIndices=[[1]],
            m_SubPrograms=[],
        )
        shader_pass = SimpleNamespace(
            m_Name="Forward",
            m_State=SimpleNamespace(m_Name="Forward"),
            progVertex=program,
        )
        parsed = SimpleNamespace(
            m_Name="Fixture/Shader",
            m_KeywordNames=["FOO"],
            m_SubShaders=[SimpleNamespace(m_Passes=[shader_pass])],
        )
        value = SimpleNamespace(
            m_ParsedForm=parsed,
            compressedBlob=list(blob),
            offsets=offsets,
            compressedLengths=compressed_lengths,
            decompressedLengths=decompressed_lengths,
            platforms=[9],
        )
        obj = SimpleNamespace(
            assets_file=SimpleNamespace(name="CAB-fixture", version="2021.3f2"),
            path_id=7,
            read=lambda: value,
        )
        with self.assertRaisesRegex(ShaderExtractionError, "disagrees with binding"):
            extract_shader_object(obj, "a" * 64)

    def test_parameter_enum_dimension_array_and_index_validation(self) -> None:
        cases = (
            ({"parameter_type": 6}, "unsupported parameter type"),
            ({"rows": 0}, "parameter rows"),
            ({"columns": 5}, "parameter columns"),
            ({"matrix_flag": 2}, "matrix flag"),
            ({"array_size": -1}, "array size"),
            ({"index": -1}, "parameter index"),
        )
        for kwargs, message in cases:
            with self.subTest(kwargs=kwargs):
                blob, offsets, compressed_lengths, decompressed_lengths = _parameter_blob_fixture(**kwargs)
                with self.assertRaisesRegex(ShaderExtractionError, message):
                    parse_shader_blob(
                        blob,
                        offsets,
                        compressed_lengths,
                        decompressed_lengths,
                        [9],
                        (2021, 3),
                        {},
                        {9: {0}},
                    )

    def test_rejects_invalid_texture_dimension(self) -> None:
        blob, offsets, compressed_lengths, decompressed_lengths = _parameter_blob_fixture(
            resource_type=0, texture_dimension=7
        )
        with self.assertRaisesRegex(ShaderExtractionError, "texture dimension"):
            parse_shader_blob(
                blob,
                offsets,
                compressed_lengths,
                decompressed_lengths,
                [9],
                (2021, 3),
                {},
                {9: {0}},
            )

    def test_extract_object_emits_source_and_exact_binding_metadata(self) -> None:
        blob, offsets, compressed_lengths, decompressed_lengths = _blob_fixture()
        player = SimpleNamespace(
            m_BlobIndex=0,
            m_GpuProgramType=4,
            m_KeywordIndices=[0],
            m_ShaderRequirements=33,
        )
        program = SimpleNamespace(
            m_PlayerSubPrograms=[[player]],
            m_ParameterBlobIndices=[[1]],
            m_SubPrograms=[],
        )
        shader_pass = SimpleNamespace(
            m_Name="Forward",
            m_State=SimpleNamespace(m_Name="Forward"),
            progVertex=program,
        )
        parsed = SimpleNamespace(
            m_Name="Fixture/Shader",
            m_KeywordNames=["FOO"],
            m_SubShaders=[SimpleNamespace(m_Passes=[shader_pass])],
        )
        value = SimpleNamespace(
            m_ParsedForm=parsed,
            compressedBlob=list(blob),
            offsets=offsets,
            compressedLengths=compressed_lengths,
            decompressedLengths=decompressed_lengths,
            platforms=[9],
        )
        obj = SimpleNamespace(
            assets_file=SimpleNamespace(name="CAB-fixture", version="2021.3f2"),
            path_id=7,
            read=lambda: value,
        )
        result = extract_shader_object(obj, "a" * 64)
        binding = result["bindings"][0]
        self.assertEqual(binding["platform"], 9)
        self.assertEqual(binding["blobIndex"], 0)
        self.assertEqual(binding["parameterBlobIndex"], 1)
        self.assertEqual(binding["keywordIndices"], [0])
        self.assertEqual(binding["keywordNames"], ["FOO"])
        self.assertEqual(binding["gles3ProgramHash"], binding["programHash"])
        self.assertEqual(result["shader"]["sourceReference"]["serializedFile"], "CAB-fixture")
        self.assertEqual(result["shader"]["sourceReference"]["objectId"], "7")
        self.assertEqual(result["fingerprint"], extract_shader_object(obj, "a" * 64)["fingerprint"])

    def test_inventory_selects_additive_source_only_for_complete_identity(self) -> None:
        expected_bundle = inventory_module.DSFX_ADDITIVE_0_BUNDLE_SHA256
        expected_file = inventory_module.DSFX_ADDITIVE_0_SERIALIZED_FILE
        expected_object = inventory_module.DSFX_ADDITIVE_0_OBJECT_ID
        expected_blob_hash = inventory_module.DSFX_ADDITIVE_0_PROGRAM_BLOB_SHA256
        extraction = {
            "programs": [{"kind": "program", "gpuProgramType": 4}],
            "gles3Programs": [{"glsl": "#version 300 es\n"}],
            "bindings": [],
        }

        def shader_fixture(*, name: str, bundle: str, serialized_file: str, object_id: str, blob: bytes):
            value = SimpleNamespace(m_Name=name, compressedBlob=blob)
            obj = SimpleNamespace(
                path_id=object_id,
                assets_file=SimpleNamespace(name=serialized_file),
                read_typetree=lambda: {"m_ParsedForm": {"m_Name": name, "m_SubShaders": []}},
            )
            return value, obj, bundle

        real_sha256 = inventory_module.hashlib.sha256

        def additive_blob_hash(data=b""):
            if bytes(data) == b"additive-program":
                return SimpleNamespace(hexdigest=lambda: expected_blob_hash)
            return real_sha256(data)

        cases = {
            "exact identity": {
                "name": "DSFX/FX_SHADER_Additive_0",
                "bundle": expected_bundle,
                "serialized_file": expected_file,
                "object_id": expected_object,
                "blob": b"additive-program",
            },
            "wrong name": {
                "name": "DSFX/FX_SHADER_Additive_0_revision",
                "bundle": expected_bundle,
                "serialized_file": expected_file,
                "object_id": expected_object,
                "blob": b"additive-program",
            },
            "wrong bundle": {
                "name": "DSFX/FX_SHADER_Additive_0",
                "bundle": "a" * 64,
                "serialized_file": expected_file,
                "object_id": expected_object,
                "blob": b"additive-program",
            },
            "wrong serialized file": {
                "name": "DSFX/FX_SHADER_Additive_0",
                "bundle": expected_bundle,
                "serialized_file": "CAB-other",
                "object_id": expected_object,
                "blob": b"additive-program",
            },
            "wrong object": {
                "name": "DSFX/FX_SHADER_Additive_0",
                "bundle": expected_bundle,
                "serialized_file": expected_file,
                "object_id": "7",
                "blob": b"additive-program",
            },
            "wrong program blob": {
                "name": "DSFX/FX_SHADER_Additive_0",
                "bundle": expected_bundle,
                "serialized_file": expected_file,
                "object_id": expected_object,
                "blob": b"different-program",
            },
        }
        with mock.patch.object(inventory_module.hashlib, "sha256", side_effect=additive_blob_hash), mock.patch.object(
            inventory_module, "extract_shader_object", return_value=extraction
        ) as extract:
            for label, case in cases.items():
                with self.subTest(case=label):
                    value, obj, bundle = shader_fixture(**case)
                    record = inventory_module.shader_record(value, obj, bundle)
                    if label == "exact identity":
                        self.assertEqual(record["extraction"], extraction)
                    else:
                        self.assertNotIn("extraction", record)
            extract.assert_called_once()

    def test_inventory_selects_alpha_blend_add_source_only_for_complete_identity(self) -> None:
        expected_bundle = inventory_module.DSFX_ALPHA_BLEND_ADD_BUNDLE_SHA256
        expected_file = inventory_module.DSFX_ALPHA_BLEND_ADD_SERIALIZED_FILE
        expected_object = inventory_module.DSFX_ALPHA_BLEND_ADD_OBJECT_ID
        expected_blob_hash = inventory_module.DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256
        extraction = {
            "programs": [{"kind": "program", "gpuProgramType": 4}],
            "gles3Programs": [{"glsl": "#version 300 es\n"}],
            "bindings": [],
        }

        def shader_fixture(*, name: str, bundle: str, serialized_file: str, object_id: str, blob: bytes):
            value = SimpleNamespace(m_Name=name, compressedBlob=blob)
            obj = SimpleNamespace(
                path_id=object_id,
                assets_file=SimpleNamespace(name=serialized_file),
                read_typetree=lambda: {"m_ParsedForm": {"m_Name": name, "m_SubShaders": []}},
            )
            return value, obj, bundle

        real_sha256 = inventory_module.hashlib.sha256

        def alpha_blend_add_blob_hash(data=b""):
            if bytes(data) == b"alpha-blend-add-program":
                return SimpleNamespace(hexdigest=lambda: expected_blob_hash)
            return real_sha256(data)

        cases = {
            "exact identity": {
                "name": "DSFX/FX_SHADER_AlphaBlend_Add",
                "bundle": expected_bundle,
                "serialized_file": expected_file,
                "object_id": expected_object,
                "blob": b"alpha-blend-add-program",
            },
            "wrong name": {
                "name": "DSFX/FX_SHADER_AlphaBlend_Add_revision",
                "bundle": expected_bundle,
                "serialized_file": expected_file,
                "object_id": expected_object,
                "blob": b"alpha-blend-add-program",
            },
            "wrong bundle": {
                "name": "DSFX/FX_SHADER_AlphaBlend_Add",
                "bundle": "a" * 64,
                "serialized_file": expected_file,
                "object_id": expected_object,
                "blob": b"alpha-blend-add-program",
            },
            "wrong serialized file": {
                "name": "DSFX/FX_SHADER_AlphaBlend_Add",
                "bundle": expected_bundle,
                "serialized_file": "CAB-other",
                "object_id": expected_object,
                "blob": b"alpha-blend-add-program",
            },
            "wrong object": {
                "name": "DSFX/FX_SHADER_AlphaBlend_Add",
                "bundle": expected_bundle,
                "serialized_file": expected_file,
                "object_id": "7",
                "blob": b"alpha-blend-add-program",
            },
            "wrong program blob": {
                "name": "DSFX/FX_SHADER_AlphaBlend_Add",
                "bundle": expected_bundle,
                "serialized_file": expected_file,
                "object_id": expected_object,
                "blob": b"different-program",
            },
        }
        with mock.patch.object(inventory_module.hashlib, "sha256", side_effect=alpha_blend_add_blob_hash), mock.patch.object(
            inventory_module, "extract_shader_object", return_value=extraction
        ) as extract:
            for label, case in cases.items():
                with self.subTest(case=label):
                    value, obj, bundle = shader_fixture(**case)
                    record = inventory_module.shader_record(value, obj, bundle)
                    if label == "exact identity":
                        self.assertEqual(record["extraction"], extraction)
                    else:
                        self.assertNotIn("extraction", record)
            extract.assert_called_once()

    def test_inventory_selects_alpha_blend_add_distort_0_source_only_for_complete_identity(self) -> None:
        expected_bundle = inventory_module.DSFX_ALPHA_BLEND_ADD_DISTORT_0_BUNDLE_SHA256
        expected_file = inventory_module.DSFX_ALPHA_BLEND_ADD_DISTORT_0_SERIALIZED_FILE
        expected_object = inventory_module.DSFX_ALPHA_BLEND_ADD_DISTORT_0_OBJECT_ID
        expected_blob_hash = inventory_module.DSFX_ALPHA_BLEND_ADD_DISTORT_0_PROGRAM_BLOB_SHA256
        expected_fingerprint = "c27cb4795addf78d122af901b7bd32879285771de6e99540b112013aa5c99d89"
        expected_gles3_programs = 4
        extraction = {
            "fingerprint": expected_fingerprint,
            "programs": [{"kind": "program", "gpuProgramType": 4}] * expected_gles3_programs,
            "gles3Programs": [{"gpuProgramType": 4}] * expected_gles3_programs,
            "bindings": [],
        }

        def shader_fixture(*, name: str, bundle: str, serialized_file: str, object_id: str, blob: bytes):
            value = SimpleNamespace(m_Name=name, compressedBlob=blob)
            obj = SimpleNamespace(
                path_id=object_id,
                assets_file=SimpleNamespace(name=serialized_file),
                read_typetree=lambda: {"m_ParsedForm": {"m_Name": name, "m_SubShaders": []}},
            )
            return value, obj, bundle

        real_sha256 = inventory_module.hashlib.sha256

        def alpha_blend_add_distort_0_blob_hash(data=b""):
            if bytes(data) == b"alpha-blend-add-distort-0-program":
                return SimpleNamespace(hexdigest=lambda: expected_blob_hash)
            return real_sha256(data)

        cases = {
            "exact identity": {
                "name": "DSFX/FX_SHADER_AlphaBlend_Add_Distort_0",
                "bundle": expected_bundle,
                "serialized_file": expected_file,
                "object_id": expected_object,
                "blob": b"alpha-blend-add-distort-0-program",
            },
            "wrong name": {
                "name": "DSFX/FX_SHADER_AlphaBlend_Add_Distort_0_revision",
                "bundle": expected_bundle,
                "serialized_file": expected_file,
                "object_id": expected_object,
                "blob": b"alpha-blend-add-distort-0-program",
            },
            "wrong bundle": {
                "name": "DSFX/FX_SHADER_AlphaBlend_Add_Distort_0",
                "bundle": "a" * 64,
                "serialized_file": expected_file,
                "object_id": expected_object,
                "blob": b"alpha-blend-add-distort-0-program",
            },
            "wrong serialized file": {
                "name": "DSFX/FX_SHADER_AlphaBlend_Add_Distort_0",
                "bundle": expected_bundle,
                "serialized_file": "CAB-other",
                "object_id": expected_object,
                "blob": b"alpha-blend-add-distort-0-program",
            },
            "wrong object": {
                "name": "DSFX/FX_SHADER_AlphaBlend_Add_Distort_0",
                "bundle": expected_bundle,
                "serialized_file": expected_file,
                "object_id": "7",
                "blob": b"alpha-blend-add-distort-0-program",
            },
            "wrong program blob": {
                "name": "DSFX/FX_SHADER_AlphaBlend_Add_Distort_0",
                "bundle": expected_bundle,
                "serialized_file": expected_file,
                "object_id": expected_object,
                "blob": b"different-program",
            },
        }
        with mock.patch.object(inventory_module.hashlib, "sha256", side_effect=alpha_blend_add_distort_0_blob_hash), mock.patch.object(
            inventory_module, "extract_shader_object", return_value=extraction
        ) as extract:
            for label, case in cases.items():
                with self.subTest(case=label):
                    value, obj, bundle = shader_fixture(**case)
                    record = inventory_module.shader_record(value, obj, bundle)
                    if label == "exact identity":
                        self.assertEqual(record["extraction"], extraction)
                        self.assertEqual(record["extraction"]["fingerprint"], expected_fingerprint)
                        self.assertEqual(len(record["extraction"]["gles3Programs"]), expected_gles3_programs)
                    else:
                        self.assertNotIn("extraction", record)
            extract.assert_called_once()

    def test_inventory_selects_step_distort_source_only_for_complete_identity(self) -> None:
        expected_bundle = inventory_module.DSFX_STEP_DISTORT_0_BUNDLE_SHA256
        expected_file = inventory_module.DSFX_STEP_DISTORT_0_SERIALIZED_FILE
        expected_object = inventory_module.DSFX_STEP_DISTORT_0_OBJECT_ID
        expected_blob_hash = inventory_module.DSFX_STEP_DISTORT_0_PROGRAM_BLOB_SHA256
        extraction = {
            "fingerprint": "26fd6c615c8156473364a52f5b638f8c57e923038eb42a799549faf0ff0e1378",
            "programs": [
                {"kind": "program", "gpuProgramType": 4, "pass": "Forward", "variant": "static"},
                {"kind": "program", "gpuProgramType": 4, "pass": "Forward", "variant": "instanced"},
                {"kind": "program", "gpuProgramType": 4, "pass": "Shadow", "variant": "static"},
                {"kind": "program", "gpuProgramType": 4, "pass": "Shadow", "variant": "instanced"},
            ],
            "gles3Programs": [{"gpuProgramType": 4}] * 4,
            "bindings": [],
        }
        self.assertEqual(extraction["fingerprint"], "26fd6c615c8156473364a52f5b638f8c57e923038eb42a799549faf0ff0e1378")
        self.assertEqual(len(extraction["gles3Programs"]), 4)

        def shader_fixture(*, name: str, bundle: str, serialized_file: str, object_id: str, blob: bytes):
            value = SimpleNamespace(m_Name=name, compressedBlob=blob)
            obj = SimpleNamespace(
                path_id=object_id,
                assets_file=SimpleNamespace(name=serialized_file),
                read_typetree=lambda: {"m_ParsedForm": {"m_Name": name, "m_SubShaders": []}},
            )
            return value, obj, bundle

        real_sha256 = inventory_module.hashlib.sha256

        def step_distort_blob_hash(data=b""):
            if bytes(data) == b"step-distort-program":
                return SimpleNamespace(hexdigest=lambda: expected_blob_hash)
            return real_sha256(data)

        cases = {
            "exact identity": {
                "name": "DSFX/FX_SHADER_Step_Distort_0",
                "bundle": expected_bundle,
                "serialized_file": expected_file,
                "object_id": expected_object,
                "blob": b"step-distort-program",
            },
            "wrong name": {
                "name": "DSFX/FX_SHADER_Step_Distort_0_revision",
                "bundle": expected_bundle,
                "serialized_file": expected_file,
                "object_id": expected_object,
                "blob": b"step-distort-program",
            },
            "wrong bundle": {
                "name": "DSFX/FX_SHADER_Step_Distort_0",
                "bundle": "a" * 64,
                "serialized_file": expected_file,
                "object_id": expected_object,
                "blob": b"step-distort-program",
            },
            "wrong serialized file": {
                "name": "DSFX/FX_SHADER_Step_Distort_0",
                "bundle": expected_bundle,
                "serialized_file": "CAB-other",
                "object_id": expected_object,
                "blob": b"step-distort-program",
            },
            "wrong object": {
                "name": "DSFX/FX_SHADER_Step_Distort_0",
                "bundle": expected_bundle,
                "serialized_file": expected_file,
                "object_id": "7",
                "blob": b"step-distort-program",
            },
            "wrong program blob": {
                "name": "DSFX/FX_SHADER_Step_Distort_0",
                "bundle": expected_bundle,
                "serialized_file": expected_file,
                "object_id": expected_object,
                "blob": b"different-program",
            },
        }
        with mock.patch.object(inventory_module.hashlib, "sha256", side_effect=step_distort_blob_hash), mock.patch.object(
            inventory_module, "extract_shader_object", return_value=extraction
        ) as extract:
            for label, case in cases.items():
                with self.subTest(case=label):
                    value, obj, bundle = shader_fixture(**case)
                    record = inventory_module.shader_record(value, obj, bundle)
                    if label == "exact identity":
                        self.assertEqual(record["extraction"], extraction)
                        self.assertEqual(record["extraction"]["fingerprint"], "26fd6c615c8156473364a52f5b638f8c57e923038eb42a799549faf0ff0e1378")
                        self.assertEqual(len(record["extraction"]["gles3Programs"]), 4)
                    else:
                        self.assertNotIn("extraction", record)
            extract.assert_called_once()

    def test_rejects_malformed_source_object_ids(self) -> None:
        blob, offsets, compressed_lengths, decompressed_lengths = _blob_fixture()
        parsed = SimpleNamespace(
            m_Name="Fixture/Shader",
            m_KeywordNames=["FOO"],
            m_SubShaders=[],
        )
        value = SimpleNamespace(
            m_ParsedForm=parsed,
            compressedBlob=list(blob),
            offsets=offsets,
            compressedLengths=compressed_lengths,
            decompressedLengths=decompressed_lengths,
            platforms=[9],
        )
        for object_id in (0, "7", True, 1 << 63, -(1 << 63) - 1):
            with self.subTest(object_id=object_id):
                obj = SimpleNamespace(
                    assets_file=SimpleNamespace(name="CAB-fixture", version="2021.3f2"),
                    path_id=object_id,
                    read=lambda: value,
                )
                with self.assertRaises(ShaderExtractionError):
                    extract_shader_object(obj, "a" * 64)

    def test_extract_baad_deduplicates_identical_source_references(self) -> None:
        blob, offsets, compressed_lengths, decompressed_lengths = _blob_fixture()
        parsed = SimpleNamespace(
            m_Name="Fixture/Shader",
            m_KeywordNames=["FOO"],
            m_SubShaders=[],
        )
        value = SimpleNamespace(
            m_ParsedForm=parsed,
            compressedBlob=list(blob),
            offsets=offsets,
            compressedLengths=compressed_lengths,
            decompressedLengths=decompressed_lengths,
            platforms=[9],
        )
        obj = SimpleNamespace(
            type=SimpleNamespace(name="Shader"),
            assets_file=SimpleNamespace(name="CAB-fixture", version="2021.3f2"),
            path_id=7,
            read=lambda: value,
        )
        fake_load = mock.Mock(return_value=SimpleNamespace(objects=[obj]))
        fake_unitypy = SimpleNamespace(load=fake_load)
        with mock.patch.dict(sys.modules, {"UnityPy": fake_unitypy}), mock.patch.object(
            extractor_module,
            "_iter_bundle_bytes",
            return_value=iter([("first.bundle", b"bundle"), ("duplicate.bundle", b"bundle")]),
        ):
            result = extractor_module.extract_baad("ignored")
        self.assertEqual(len(result["shaders"]), 1)
        fake_load.assert_called_once_with(b"bundle")

    def test_normalizes_malformed_zip_and_unitypy_errors(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / "broken.zip"
            path.write_bytes(b"not a zip")
            with self.assertRaises(ShaderExtractionError):
                list(extractor_module._iter_bundle_bytes(path))
        fake_unitypy = SimpleNamespace(load=mock.Mock(side_effect=RuntimeError("bad bundle")))
        with mock.patch.dict(sys.modules, {"UnityPy": fake_unitypy}), mock.patch.object(
            extractor_module,
            "_iter_bundle_bytes",
            return_value=iter([("broken.bundle", b"bundle")]),
        ):
            with self.assertRaisesRegex(ShaderExtractionError, "UnityPy"):
                extractor_module.extract_baad("ignored")

    def test_rejects_global_compressed_interval_overlap(self) -> None:
        blob, offsets, compressed_lengths, decompressed_lengths = _blob_fixture()
        with self.assertRaisesRegex(ShaderExtractionError, "compressedBlob intervals overlap"):
            parse_shader_blob(
                blob,
                [offsets[0], offsets[0]],
                [compressed_lengths[0], compressed_lengths[0]],
                [decompressed_lengths[0], decompressed_lengths[0]],
                [9, 18],
                (2021, 3),
                {9: {0}, 18: {0}},
                {},
            )

    def test_rejects_archive_member_count_and_size_limits(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / "limits.zip"
            with zipfile.ZipFile(path, "w") as archive:
                archive.writestr("fixture.bundle", b"bundle")
            with mock.patch.object(extractor_module, "MAX_ARCHIVE_MEMBERS", 0):
                with self.assertRaisesRegex(ShaderExtractionError, "archive has"):
                    list(extractor_module._iter_bundle_bytes(path))
            with mock.patch.object(extractor_module, "MAX_ARCHIVE_MEMBER_BYTES", 2):
                with self.assertRaisesRegex(ShaderExtractionError, "member size"):
                    list(extractor_module._iter_bundle_bytes(path))
            with mock.patch.object(extractor_module, "MAX_ARCHIVE_TOTAL_BYTES", 2):
                with self.assertRaisesRegex(ShaderExtractionError, "declared member sizes"):
                    list(extractor_module._iter_bundle_bytes(path))

    def test_rejects_decompressed_chunk_limit(self) -> None:
        blob, offsets, compressed_lengths, decompressed_lengths = _blob_fixture()
        with mock.patch.object(
            extractor_module,
            "MAX_DECOMPRESSED_CHUNK_BYTES",
            decompressed_lengths[0][0] - 1,
        ):
            with self.assertRaisesRegex(ShaderExtractionError, "decompressed size"):
                parse_shader_blob(
                    blob,
                    offsets,
                    compressed_lengths,
                    decompressed_lengths,
                    [9],
                    (2021, 3),
                    {9: {0}},
                    {9: {1}},
                )

    def test_rejects_bad_table_segment(self) -> None:
        blob, offsets, compressed_lengths, decompressed_lengths = _blob_fixture()
        # Replace the first table entry's segment with the nonexistent chunk 3.
        import lz4.block

        table = bytearray(lz4.block.decompress(blob[offsets[0][0]: offsets[0][0] + compressed_lengths[0][0]], decompressed_lengths[0][0]))
        struct.pack_into("<i", table, 12, 3)
        compressed = lz4.block.compress(bytes(table), store_size=False)
        delta = len(compressed) - compressed_lengths[0][0]
        rebuilt = compressed + blob[offsets[0][0] + compressed_lengths[0][0]:]
        offsets = [[0, offsets[0][1] + delta, offsets[0][2] + delta]]
        compressed_lengths = [[len(compressed), compressed_lengths[0][1], compressed_lengths[0][2]]]
        with self.assertRaisesRegex(ShaderExtractionError, "invalid segment"):
            parse_shader_blob(rebuilt, offsets, compressed_lengths, decompressed_lengths, [9], (2021, 3), {9: {0}}, {})

    def test_rejects_unknown_program_version(self) -> None:
        code = _program_record(b"#version 300 es\n", version=123)
        table = _i32(1) + struct.pack("<iii", 0, len(code), 1)
        chunks = [table, code]
        compressed = [lz4.block.compress(chunk, store_size=False) for chunk in chunks]
        blob = b"".join(compressed)
        offsets = [[0, len(compressed[0])]]
        with self.assertRaisesRegex(ShaderExtractionError, "does not match"):
            parse_shader_blob(blob, offsets, [[len(item) for item in compressed]], [[len(item) for item in chunks]], [9], (2021, 3), {9: {0}}, {})

    def test_rejects_non_glsl_gles3_program(self) -> None:
        code = _program_record(b"void main() {}\n")
        table = _i32(1) + struct.pack("<iii", 0, len(code), 1)
        compressed = [lz4.block.compress(chunk, store_size=False) for chunk in (table, code)]
        with self.assertRaisesRegex(ShaderExtractionError, "#version 300 es"):
            parse_shader_blob(
                b"".join(compressed),
                [[0, len(compressed[0])]],
                [[len(item) for item in compressed]],
                [[len(table), len(code)]],
                [9],
                (2021, 3),
                {9: {0}},
                {},
            )


if __name__ == "__main__":
    unittest.main()
