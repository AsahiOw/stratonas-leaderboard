"""Read-only BA-AD source proof helper for the frozen v12 motion audit."""

from __future__ import annotations

import hashlib
import json
import math
import os
import pathlib
import re
import struct
import sys
import zlib
import zipfile
from collections import defaultdict


MAX_HIERARCHY_DEPTH = 256
MAX_STREAM_FRAMES = 1_000_000
MAX_STREAM_KEYS_PER_FRAME = 1_000_000
MAX_STREAM_WORDS = 4_000_000
MAX_RAW_GENERIC_BINDING_SAMPLES = 256
TOLERANCE = 1e-6
MAX_INDEX_RECORD_BYTES = 128 * 1024 * 1024
INDEX_CHUNK_BYTES = 1024 * 1024
MAX_CONTROLLER_GRAPH_OBJECTS = 4096
JSON_SPECIALS = re.compile(rb'["\\{}\[\]]')
CURRENT_STAGE = "request"
SAFE_STAGES = {
    "request", "request_validation", "python_import", "source_root_pinning", "source_index_pinning",
    "source_index_header", "source_index_records", "inventory_dependency_closure",
    "inventory_identity_match", "inventory_prefab_match", "inventory_clip_match",
    "source_bundle_loading", "source_object_lookup", "prefab_hierarchy",
    "animator_binding", "scope_binding", "animation_clip_binding", "curve_decode",
}
SAFE_FAILURE_REASONS = {
    "source invocation requires exactly three pinned metadata specifications": "SOURCE_METADATA_SPEC_COUNT",
    "source invocation metadata specification is malformed": "SOURCE_METADATA_SPEC_INVALID",
    "source invocation metadata specification identities differ from the exact pinned set": "SOURCE_METADATA_SPEC_IDENTITY_MISMATCH",
    "source invocation metadata requires pinned ZIP archive entries": "SOURCE_ARCHIVE_SPEC_INVALID",
    "source invocation requires exactly two pinned loader bundle identities": "SOURCE_LOAD_SPEC_COUNT",
    "source invocation loader bundle identities differ from the exact allowed set": "SOURCE_LOAD_SPEC_IDENTITY_MISMATCH",
    "controller metadata is archive-only and must not be loaded": "CONTROLLER_LOAD_FORBIDDEN",
    "source root differs from the pinned BAAD tree": "SOURCE_ROOT_PIN_MISMATCH",
    "source inventory files array is absent": "SOURCE_INDEX_FILES_ARRAY_ABSENT",
    "source inventory header exceeds its bound": "SOURCE_INDEX_HEADER_TOO_LARGE",
    "source inventory file record has invalid JSON nesting": "SOURCE_INDEX_RECORD_INVALID_NESTING",
    "source inventory file record exceeds its bound": "SOURCE_INDEX_RECORD_TOO_LARGE",
    "source inventory files array is truncated": "SOURCE_INDEX_TRUNCATED",
    "source inventory bytes differ from the pinned digest": "SOURCE_INDEX_DIGEST_MISMATCH",
    "source inventory header is not in the expected format": "SOURCE_INDEX_HEADER_FORMAT_INVALID",
    "source inventory header differs from pinned source or metadata reader": "SOURCE_INDEX_HEADER_PIN_MISMATCH",
    "source root is not a pinned regular directory": "SOURCE_ROOT_PIN_INVALID",
    "source inventory is not a pinned regular file": "SOURCE_INDEX_PIN_INVALID",
    "selected source identity is absent from the pinned inventory": "SOURCE_IDENTITY_NOT_FOUND",
    "exact selected prefab bundle is outside its source-identity dependency closure": "PREFAB_OUTSIDE_IDENTITY_CLOSURE",
    "exact selected prefab path is absent or ambiguous in its pinned bundle metadata": "PREFAB_PATH_NOT_UNIQUE",
    "stream words are invalid or exceed their bound": "STREAM_WORDS_INVALID",
    "streamed clip frame header is truncated or exceeds its bound": "STREAM_FRAME_HEADER_INVALID",
    "streamed clip frame has invalid time/key count": "STREAM_FRAME_INVALID",
    "streamed clip frame keys are truncated": "STREAM_FRAME_KEYS_TRUNCATED",
    "streamed clip key is invalid": "STREAM_KEY_INVALID",
    "source archive escapes the pinned source root": "SOURCE_ARCHIVE_OUTSIDE_ROOT",
    "source archive bytes differ from the pinned index": "SOURCE_ARCHIVE_DIGEST_MISMATCH",
    "source archive entry is absent or ambiguous": "SOURCE_ARCHIVE_ENTRY_NOT_UNIQUE",
    "source archive kind is unsupported": "SOURCE_ARCHIVE_KIND_UNSUPPORTED",
    "source bundle bytes differ from the pinned index": "SOURCE_BUNDLE_DIGEST_MISMATCH",
    "transform hierarchy pointer is unresolved": "TRANSFORM_HIERARCHY_POINTER_UNRESOLVED",
    "transform is outside the selected prefab root or hierarchy has a cycle": "TRANSFORM_OUTSIDE_PREFAB_OR_CYCLE",
    "source bundle is missing from the pinned inventory": "SOURCE_BUNDLE_NOT_IN_INVENTORY",
    "source object reference is absent or ambiguous": "SOURCE_OBJECT_NOT_UNIQUE",
    "source object type differs from its expected type": "SOURCE_OBJECT_TYPE_MISMATCH",
    "prefab transform has no GameObject": "PREFAB_TRANSFORM_GAMEOBJECT_MISSING",
    "selected prefab GameObject has no unique Transform": "PREFAB_ROOT_TRANSFORM_NOT_UNIQUE",
    "prefab child Transform pointer is null": "PREFAB_CHILD_TRANSFORM_NULL",
    "prefab transform tree contains a cycle or repeated child": "PREFAB_TRANSFORM_TREE_CYCLE",
    "prefab transform tree is incomplete or exceeds its bound": "PREFAB_TRANSFORM_TREE_INCOMPLETE",
    "selected prefab does not have exactly one uniquely bound Animator root": "ANIMATOR_ROOT_NOT_UNIQUE",
    "selected prefab does not have exactly one Animator assigned to the pinned source clip": "ANIMATOR_SOURCE_CLIP_NOT_UNIQUE",
    "Animator controller external file reference is invalid": "CONTROLLER_EXTERNAL_FILE_INVALID",
    "Animator controller external file is not uniquely present in source dependency closure": "CONTROLLER_EXTERNAL_FILE_NOT_UNIQUE",
    "Animator controller object reference is unresolved": "CONTROLLER_OBJECT_UNRESOLVED",
    "Animator controller graph is cyclic, incomplete, or unsupported": "CONTROLLER_GRAPH_UNRESOLVED",
    "Animator controller clip reference is unresolved": "CONTROLLER_CLIP_UNRESOLVED",
    "Animator override source clip is absent from its base controller": "CONTROLLER_OVERRIDE_SOURCE_MISMATCH",
    "source renderer has no GameObject": "SOURCE_RENDERER_GAMEOBJECT_MISSING",
    "source renderer GameObject has no unique Transform": "SOURCE_RENDERER_TRANSFORM_NOT_UNIQUE",
    "source renderer is outside the selected prefab tree": "SOURCE_RENDERER_OUTSIDE_PREFAB",
    "scope transform identity is duplicated": "SCOPE_TRANSFORM_DUPLICATE",
    "scope transform does not resolve inside selected prefab": "SCOPE_TRANSFORM_NOT_RESOLVED",
    "source AnimationClip name differs from the persisted action": "SOURCE_CLIP_NAME_MISMATCH",
}


def helper_failure_payload(error, stage=None):
    safe_stage = stage if stage in SAFE_STAGES else "request"
    reason = SAFE_FAILURE_REASONS.get(str(error), "UNCLASSIFIED_HELPER_FAILURE")
    error_type = type(error).__name__.upper().replace("ERROR", "FAILURE")
    if safe_stage == "request_validation":
        error_type = "SOURCE_REQUEST_VALIDATION_FAILURE"
    if not re.fullmatch(r"[A-Z0-9_]{1,64}", error_type):
        error_type = "SOURCE_MOTION_HELPER_FAILED"
    return {
        "error": error_type,
        "stage": safe_stage,
        "message": reason,
    }


def _set_stage(value):
    global CURRENT_STAGE
    CURRENT_STAGE = value


def canonical_json(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_json(value):
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def unity_path_hash(path_tokens):
    raw = "/".join(path_tokens).encode("utf-8")
    return zlib.crc32(raw) & 0xFFFFFFFF


def source_ref_key(reference):
    return (
        str(reference["bundleSha256"]).lower(),
        str(reference["serializedFile"]).lower(),
        str(reference["objectId"]),
    )


def _normalized_file(value):
    return str(value or "").replace("\\", "/").rsplit("/", 1)[-1].lower()


def _parse_character_part(entry_path):
    name = _normalized_file(entry_path)
    patterns = (
        r"^assets-_mx-characters-(.+?)-_mxdependency-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})_assets_all_\d+\.bundle$",
        r"^character-(.+?)-_mxload-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})_assets_all_\d+\.bundle$",
        r"^cafe-characteranimation-(.+?)-_mxload-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})_assets_all_\d+\.bundle$",
    )
    for pattern in patterns:
        match = re.match(pattern, name, re.IGNORECASE)
        if match:
            return {"sourceIdentity": match.group(1).lower(), "family": match.group(2).lower(), "revision": match.group(3)}
    return None


def _metadata_identities(metadata):
    identities = set()
    for container in metadata.get("containers", []) if isinstance(metadata, dict) else []:
        container_path = str(container.get("path", "")).replace("\\", "/") if isinstance(container, dict) else ""
        match = re.search(r"/_MX/(?:Characters|AddressableAsset/Character)/([^/]+)/(?:[^/]+/)*([^/]+)\.prefab$", container_path, re.IGNORECASE)
        if not match:
            continue
        canonical = lambda value: re.sub(r"^_+|_+$", "", re.sub(r"[^a-z0-9]+", "_", value.strip().lower()))
        identity = canonical(match.group(1))
        if identity and canonical(match.group(2)) == identity:
            identities.add(identity)
    return identities


def _iter_inventory_file_records(index_path, expected_sha256):
    """Yield one top-level inventory file object at a time and hash the raw index bytes."""
    _set_stage("source_index_records")
    digest = hashlib.sha256()
    marker = b'"files":['
    with pathlib.Path(index_path).open("rb") as stream:
        initial = bytearray()
        while marker not in initial:
            chunk = stream.read(INDEX_CHUNK_BYTES)
            if not chunk:
                raise ValueError("source inventory files array is absent")
            digest.update(chunk)
            initial.extend(chunk)
            if len(initial) > INDEX_CHUNK_BYTES * 2:
                raise ValueError("source inventory header exceeds its bound")
        marker_offset = initial.index(marker)
        header_prefix = bytes(initial[:marker_offset]).rstrip().rstrip(b",")
        header = json.loads(header_prefix + b"}")
        remaining = bytes(initial[marker_offset + len(marker):])

        in_string = False
        escaped = False
        depth = 0
        started = False
        record_buffer = bytearray()
        record_size = 0
        stopped = False

        def consume(chunk):
            nonlocal in_string, escaped, depth, started, record_buffer, record_size, stopped
            last_copied = 0
            for match in JSON_SPECIALS.finditer(chunk):
                position = match.start()
                byte = chunk[position]
                if not started:
                    if byte == 0x7B:  # {
                        started = True
                        depth = 1
                        in_string = False
                        escaped = False
                        record_buffer.clear()
                        record_size = 0
                        last_copied = position
                    elif byte == 0x5D:  # ]
                        stopped = True
                        return
                    continue

                escaped_character_in_segment = position > last_copied
                record_buffer.extend(chunk[last_copied:position + 1])
                record_size += position + 1 - last_copied
                last_copied = position + 1
                if record_size > MAX_INDEX_RECORD_BYTES:
                    raise ValueError("source inventory file record exceeds its bound")

                if in_string:
                    if escaped:
                        escaped = False
                        if not escaped_character_in_segment:
                            continue
                    if byte == 0x5C:
                        escaped = True
                    elif byte == 0x22:
                        in_string = False
                    continue

                if byte == 0x22:
                    in_string = True
                elif byte in (0x7B, 0x5B):
                    depth += 1
                elif byte in (0x7D, 0x5D):
                    depth -= 1
                    if depth < 0:
                        raise ValueError("source inventory file record has invalid JSON nesting")
                    if depth == 0:
                        record = json.loads(record_buffer)
                        started = False
                        record_buffer = bytearray()
                        record_size = 0
                        yield record
            if started and last_copied < len(chunk):
                tail = chunk[last_copied:]
                record_buffer.extend(tail)
                record_size += len(tail)
                if in_string and escaped:
                    escaped = False
                if record_size > MAX_INDEX_RECORD_BYTES:
                    raise ValueError("source inventory file record exceeds its bound")

        for chunk in (remaining,):
            if chunk:
                for record in consume(chunk):
                    yield record
        while not stopped:
            chunk = stream.read(INDEX_CHUNK_BYTES)
            if not chunk:
                break
            digest.update(chunk)
            for record in consume(chunk):
                yield record
        # Hash any bytes after the files-array terminator without parsing them.
        for chunk in iter(lambda: stream.read(INDEX_CHUNK_BYTES), b""):
            digest.update(chunk)

    if started or in_string or depth != 0:
        raise ValueError("source inventory files array is truncated")
    if digest.hexdigest() != expected_sha256:
        raise ValueError("source inventory bytes differ from the pinned digest")
    return header


def _inventory_entry_summaries(index_path, expected_sha256, expected_source, expected_reader, clip_names):
    _set_stage("source_index_header")
    rows = []
    with pathlib.Path(index_path).open("rb") as stream:
        prefix = stream.read(65536)
    marker = prefix.find(b'"files":[')
    if marker < 0:
        raise ValueError("source inventory header is not in the expected format")
    parsed_header = json.loads(prefix[:marker].rstrip().rstrip(b",") + b"}")
    if parsed_header.get("version") != 2 or parsed_header.get("source") != expected_source or parsed_header.get("metadataReader") != expected_reader:
        raise ValueError("source inventory header differs from pinned source or metadata reader")

    _set_stage("source_index_records")
    for file_record in _iter_inventory_file_records(index_path, expected_sha256):
        if isinstance(file_record, dict) and "entries" in file_record:
            outer_path = str(file_record.get("path", ""))
            outer_sha = str(file_record.get("sha256", "")).lower()
            outer_kind = str(file_record.get("kind", "archive"))
            for entry in file_record.get("entries", []) or []:
                if not isinstance(entry, dict) or not isinstance(entry.get("sha256"), str):
                    continue
                metadata = entry.get("metadata") if isinstance(entry.get("metadata"), dict) else {}
                objects = []
                for item in metadata.get("objects", []) or []:
                    if not isinstance(item, dict) or item.get("type") != "AnimationClip" or item.get("name") not in clip_names:
                        continue
                    reference = item.get("sourceReference")
                    if not isinstance(reference, dict):
                        file_name = item.get("file")
                        path_id = item.get("pathId")
                        if isinstance(file_name, str) and isinstance(path_id, (str, int)):
                            reference = {"bundleSha256": entry["sha256"], "serializedFile": file_name, "objectId": str(path_id)}
                    if isinstance(reference, dict):
                        objects.append({"name": item["name"], "sourceReference": reference})
                entry_sha = str(entry["sha256"]).lower()
                rows.append({
                    "entryPath": str(entry.get("path", "")),
                    "entrySha256": entry_sha,
                    "archivePath": outer_path,
                    "archiveSha256": outer_sha,
                    "archiveKind": outer_kind,
                    "serializedFiles": sorted({_normalized_file(name) for name in metadata.get("serializedFiles", []) or [] if isinstance(name, str)}),
                    "dependencies": [dependency.get("name") or dependency.get("path") if isinstance(dependency, dict) else dependency
                                     for dependency in metadata.get("dependencies", []) or []],
                    "containerPaths": [str(item.get("path", "")) for item in metadata.get("containers", []) or [] if isinstance(item, dict)],
                    "clipObjects": objects,
                })
    return parsed_header, rows


def resolve_inventory(request):
    _set_stage("source_root_pinning")
    source_root = str(request["sourceRoot"])
    source_path = pathlib.Path(source_root)
    source_real = source_path.resolve(strict=True)
    if not source_real.is_dir() or source_path.is_symlink() or str(source_real) != os.path.abspath(source_root):
        raise ValueError("source root is not a pinned regular directory")
    _set_stage("source_index_pinning")
    index_path = str(request["indexPath"])
    index_file = pathlib.Path(index_path)
    index_real = index_file.resolve(strict=True)
    if not index_real.is_file() or index_file.is_symlink() or str(index_real) != os.path.abspath(index_path):
        raise ValueError("source inventory is not a pinned regular file")
    expected_source = str(request["expectedSource"])
    expected_reader = str(request["expectedMetadataReader"])
    targets = request["targets"]
    clip_names = {clip for target in targets for clip in target.get("clipNames", [])}
    header, entries = _inventory_entry_summaries(
        index_path, str(request["inventorySha256"]), expected_source, expected_reader, clip_names,
    )

    _set_stage("inventory_dependency_closure")
    refs_by_identity = defaultdict(list)
    serialized_index = defaultdict(list)
    for entry in entries:
        part = _parse_character_part(entry["entryPath"])
        identities = {part["sourceIdentity"]} if part else set()
        identities.update(_metadata_identities({"containers": [{"path": path} for path in entry["containerPaths"]]}))
        for identity in identities:
            refs_by_identity[identity].append((entry, part))
        for serialized in entry["serializedFiles"]:
            serialized_index[serialized].append(entry)

    target_reports = []
    all_bundle_records = {}
    for target in targets:
        _set_stage("inventory_identity_match")
        identity = str(target["sourceIdentity"]).strip().lower()
        unfiltered = refs_by_identity.get(identity, [])
        if not unfiltered:
            raise ValueError("selected source identity is absent from the pinned inventory")
        latest_by_family = {}
        for entry, part in unfiltered:
            if part and part["revision"]:
                name = _normalized_file(entry["entryPath"])
                scope = "dependency" if name.startswith("assets-_mx-characters-") else "cafe" if name.startswith("cafe-characteranimation-") else "load"
                claim = f"{scope}:{part['family']}"
                current = latest_by_family.get(claim)
                if current is None or part["revision"] > current:
                    latest_by_family[claim] = part["revision"]
        seed_by_sha = {}
        for entry, part in unfiltered:
            if part and part["revision"]:
                name = _normalized_file(entry["entryPath"])
                scope = "dependency" if name.startswith("assets-_mx-characters-") else "cafe" if name.startswith("cafe-characteranimation-") else "load"
                if part["revision"] != latest_by_family.get(f"{scope}:{part['family']}"):
                    continue
            seed_by_sha.setdefault(entry["entrySha256"], entry)
        closure = dict(seed_by_sha)
        pending = list(seed_by_sha.values())
        while pending:
            current = pending.pop(0)
            for dependency in current["dependencies"]:
                name = _normalized_file(dependency)
                if not name or name in {"unity default resources", "unity_builtin_extra"}:
                    continue
                unique_matches = {}
                for match in serialized_index.get(name, []):
                    unique_matches.setdefault(match["entrySha256"], match)
                for digest, match in unique_matches.items():
                    if digest not in closure:
                        closure[digest] = match
                        pending.append(match)
        prefab_sha = str(target["prefabBundleSha256"]).lower()
        _set_stage("inventory_prefab_match")
        if prefab_sha not in closure:
            raise ValueError("exact selected prefab bundle is outside its source-identity dependency closure")
        prefab_path = str(target["prefabPath"])
        prefab_containers = [
            entry for entry in closure.values()
            if entry["entrySha256"] == prefab_sha and prefab_path in entry["containerPaths"]
        ]
        if len(prefab_containers) != 1:
            raise ValueError("exact selected prefab path is absent or ambiguous in its pinned bundle metadata")
        matching_clips = {}
        _set_stage("inventory_clip_match")
        for clip_name in target.get("clipNames", []):
            refs = {}
            for entry in closure.values():
                for item in entry["clipObjects"]:
                    if item["name"] == clip_name:
                        reference = item["sourceReference"]
                        key = source_ref_key(reference)
                        refs.setdefault(key, reference)
            matching_clips[clip_name] = list(refs.values())
        for entry in closure.values():
            all_bundle_records.setdefault(entry["entrySha256"], entry)
        target_reports.append({
            "sourceIdentity": identity,
            "clips": matching_clips,
            "closureEntryCount": len(closure),
            "bundleSha256s": sorted(closure),
        })

    bundle_specs = {}
    bundle_digest_records = []
    for entry in all_bundle_records.values():
        if entry["archiveKind"] == "bundle":
            kind = "bundle"
        else:
            kind = "archive"
        spec = {
            "kind": kind,
            "archivePath": entry["archivePath"],
            "archiveSha256": entry["archiveSha256"],
            "entryPath": entry["entryPath"],
            "entrySha256": entry["entrySha256"],
            "serializedFiles": entry["serializedFiles"],
        }
        digest = entry["entrySha256"]
        previous = bundle_specs.get(digest)
        if previous is None or (spec["archivePath"], spec["entryPath"]) < (previous["archivePath"], previous["entryPath"]):
            bundle_specs[digest] = spec
        bundle_digest_records.append({
            "bundleSha256": digest,
            "archivePath": spec["archivePath"],
            "archiveSha256": spec["archiveSha256"],
            "entryPath": spec["entryPath"],
            "entrySha256": digest,
        })
    bundle_digest_records.sort(key=lambda row: (row["bundleSha256"], row["archivePath"], row["entryPath"]))
    bundle_set_sha = sha256_json(bundle_digest_records)
    return {
        "source": header["source"],
        "metadataReader": header["metadataReader"],
        "sourceBundleSetSha256": bundle_set_sha,
        "bundleDigestRecordCount": len(bundle_digest_records),
        "bundles": bundle_specs,
        "targets": target_reports,
    }


def decode_streamed_frames(words):
    """Decode Unity StreamedClip's packed frame/key records exactly."""
    raw = _stream_words_to_bytes(words)
    frames = []
    offset = 0
    while offset < len(raw):
        if len(frames) >= MAX_STREAM_FRAMES or offset + 8 > len(raw):
            raise ValueError("streamed clip frame header is truncated or exceeds its bound")
        time_value, key_count = struct.unpack_from("<fi", raw, offset)
        offset += 8
        if not math.isfinite(time_value) or key_count < 0 or key_count > MAX_STREAM_KEYS_PER_FRAME:
            raise ValueError("streamed clip frame has invalid time/key count")
        if offset + key_count * 20 > len(raw):
            raise ValueError("streamed clip frame keys are truncated")
        keys = []
        for _ in range(key_count):
            index = struct.unpack_from("<i", raw, offset)[0]
            coefficients = struct.unpack_from("<4f", raw, offset + 4)
            offset += 20
            if index < 0 or not all(math.isfinite(item) for item in coefficients):
                raise ValueError("streamed clip key is invalid")
            keys.append({"index": index, "coefficients": list(coefficients), "value": coefficients[3]})
        frames.append({"time": time_value, "keys": keys})
    return frames


def _stream_words_to_bytes(words):
    if not isinstance(words, list) or len(words) > MAX_STREAM_WORDS or any(not isinstance(word, int) for word in words):
        raise ValueError("stream words are invalid or exceed their bound")
    return b"".join(struct.pack("<I", word & 0xFFFFFFFF) for word in words)


def decode_streamed_clip(words, curve_count):
    """Validate Unity's init/end sentinels and return only authored frames plus init seeds."""
    raw = _stream_words_to_bytes(words)
    if not isinstance(curve_count, int) or curve_count < 0 or curve_count > MAX_STREAM_KEYS_PER_FRAME:
        raise ValueError("streamed clip curve count is invalid")
    seed_word_count = 2 + curve_count * 5
    if len(words) < seed_word_count + 2:
        raise ValueError("streamed clip sentinel is missing or malformed")
    if (words[0] & 0xFFFFFFFF) != 0xFF7FFFFF or words[1] != curve_count:
        raise ValueError("streamed clip sentinel is missing or malformed")
    if (words[-2] & 0xFFFFFFFF) != 0x7F800000 or words[-1] != 0:
        raise ValueError("streamed clip sentinel is missing or malformed")

    initial_frames = decode_streamed_frames(words[:seed_word_count])
    initial_keys = initial_frames[0]["keys"] if len(initial_frames) == 1 else []
    initial_indices = [key["index"] for key in initial_keys]
    if len(initial_keys) != curve_count or set(initial_indices) != set(range(curve_count)):
        raise ValueError("streamed clip sentinel is missing or malformed")

    frames = decode_streamed_frames(words[seed_word_count:-2])
    previous_time = None
    for frame in frames:
        if previous_time is not None and frame["time"] <= previous_time:
            raise ValueError("streamed clip frame times are not strictly increasing")
        previous_time = frame["time"]
        indices = [key["index"] for key in frame["keys"]]
        if len(indices) != len(set(indices)) or any(index >= curve_count for index in indices):
            raise ValueError("streamed clip frame curve index is invalid")

    return {"initialKeys": initial_keys, "frames": frames}


def binding_width(type_id, attribute):
    # Unity Transform class ID is 4; these widths match AssetStudio's
    # AnimationClipBindingConstant.FindBinding scalar-slot mapping.
    if type_id == 4:
        if attribute in (1, 3, 4):
            return 3
        if attribute == 2:
            return 4
    return 1


def _raw_generic_binding_samples(component_curves, first_slot, type_id, attribute, path_hash):
    """Retain bounded raw values for unsupported generic bindings only."""
    source_kinds = sorted({str(curve.get("sourceKind", "unresolved")) for curve in component_curves})
    sample_count = sum(len(curve.get("keys", []) or []) for curve in component_curves)
    truncated = sample_count > MAX_RAW_GENERIC_BINDING_SAMPLES
    remaining = MAX_RAW_GENERIC_BINDING_SAMPLES
    captured_sample_count = 0
    invalid_sample_count = 0
    invalid_initial_value_count = 0
    components = []
    complete = bool(component_curves) and not truncated

    initial_sources = {
        "streamed": "streamed-initial-key",
        "dense": "dense-first-frame",
        "constant": "constant-curve-value",
    }
    time_sources = {
        "streamed": "streamed-frame-time",
        "dense": "dense-begin-time-and-sample-rate",
        "constant": "clip-start-time",
    }

    for component_index, curve in enumerate(component_curves):
        source_kind = str(curve.get("sourceKind", "unresolved"))
        initial_value = curve.get("initialValue")
        initial_value_present = initial_value is not None
        initial_value_finite = (
            isinstance(initial_value, (int, float))
            and not isinstance(initial_value, bool)
            and math.isfinite(float(initial_value))
        )
        if initial_value_present and not initial_value_finite:
            invalid_initial_value_count += 1
            complete = False
        elif not initial_value_finite:
            complete = False

        if source_kind not in initial_sources:
            complete = False

        raw_keys = curve.get("keys", []) or []
        keys = []
        for key in raw_keys:
            if remaining <= 0:
                break
            remaining -= 1
            if not isinstance(key, dict):
                invalid_sample_count += 1
                complete = False
                continue

            time_value = key.get("time")
            value = key.get("value")
            coefficients = key.get("coefficients")
            finite_values = (
                isinstance(time_value, (int, float)) and not isinstance(time_value, bool)
                and math.isfinite(float(time_value))
                and isinstance(value, (int, float)) and not isinstance(value, bool)
                and math.isfinite(float(value))
            )
            if source_kind == "streamed":
                finite_coefficients = (
                    isinstance(coefficients, list)
                    and len(coefficients) == 4
                    and all(
                        isinstance(item, (int, float))
                        and not isinstance(item, bool)
                        and math.isfinite(float(item))
                        for item in coefficients
                    )
                )
            else:
                finite_coefficients = coefficients is None

            if not finite_values or not finite_coefficients or source_kind not in time_sources:
                invalid_sample_count += 1
                complete = False
                continue

            keys.append({
                "time": float(time_value),
                "value": float(value),
                "coefficients": [float(item) for item in coefficients] if coefficients is not None else None,
                "timeProvenance": time_sources[source_kind],
                "coefficientProvenance": "streamed-hermite-coefficients" if source_kind == "streamed" else "not-present-in-source-kind",
            })
            captured_sample_count += 1

        components.append({
            "slotIndex": first_slot + component_index,
            "sourceKind": source_kind,
            "initialValue": float(initial_value) if initial_value_finite else None,
            "initialValuePresent": initial_value_present,
            "initialValueFinite": bool(initial_value_finite),
            "initialValueProvenance": initial_sources.get(source_kind, "unavailable"),
            "keys": keys,
        })

    return {
        "schemaVersion": 1,
        "bindingIdentity": {"typeId": type_id, "attribute": attribute, "pathHash": path_hash},
        "sourceKind": "+".join(source_kinds) if source_kinds else "absent",
        "captureComplete": bool(complete and invalid_sample_count == 0 and invalid_initial_value_count == 0),
        "truncated": truncated,
        "sampleCount": sample_count,
        "capturedSampleCount": captured_sample_count,
        "invalidSampleCount": invalid_sample_count,
        "invalidInitialValueCount": invalid_initial_value_count,
        "components": components,
    }


def _value_sequence_is_dynamic(values):
    flattened = [float(value) for value in values]
    if any(not math.isfinite(value) for value in flattened):
        return None
    if flattened and any(abs(value - flattened[0]) > TOLERANCE for value in flattened[1:]):
        return True
    return False


def _direct_curve_may_move(values, slopes):
    value_class = _value_sequence_is_dynamic(values)
    if value_class is not False or not slopes:
        return value_class
    # Direct Unity AnimationCurve tangents do not use StreamedClip's packed
    # polynomial representation. Keep the existing conservative treatment.
    return any(abs(float(value)) > TOLERANCE for group in slopes for value in group)


def _streamed_curve_is_dynamic(keys):
    """Classify cubic stream segments by actual excursion over each key interval."""
    if not keys:
        return False
    bounds = []
    for current, following in zip(keys, keys[1:]):
        delta_time = float(following["time"]) - float(current["time"])
        coefficients = [float(value) for value in current["coefficients"]]
        start_value = float(current["value"])
        end_value = float(following["value"])
        if delta_time <= 0 or not all(math.isfinite(value) for value in (delta_time, start_value, end_value, *coefficients)):
            return None

        cubic, quadratic, linear, _ = coefficients
        if cubic == 0.0 and quadratic == 0.0 and linear == 0.0:
            bounds.extend((start_value, end_value))
            continue

        endpoint = ((cubic * delta_time + quadratic) * delta_time + linear) * delta_time + start_value
        if not math.isfinite(endpoint) or abs(endpoint - end_value) > TOLERANCE:
            return None

        points = [0.0, delta_time]
        a, b, c = 3.0 * cubic, 2.0 * quadratic, linear
        if a == 0.0:
            if b != 0.0:
                root = -c / b
                if 0.0 < root < delta_time:
                    points.append(root)
        else:
            discriminant = b * b - 4.0 * a * c
            if discriminant >= 0.0:
                root = math.sqrt(discriminant)
                for candidate in ((-b - root) / (2.0 * a), (-b + root) / (2.0 * a)):
                    if 0.0 < candidate < delta_time:
                        points.append(candidate)
        for point in points:
            value = ((cubic * point + quadratic) * point + linear) * point + start_value
            if not math.isfinite(value):
                return None
            bounds.append(value)

    if not bounds:
        values = [float(key["value"]) for key in keys]
        if any(not math.isfinite(value) for value in values):
            return None
        bounds = values
    return max(bounds) - min(bounds) > TOLERANCE


def _vector_values(value, names):
    return [float(getattr(value, name)) for name in names]


def _read_source_bundle(source_root, spec):
    root = pathlib.Path(source_root).resolve(strict=True)
    if not root.is_dir() or pathlib.Path(source_root).is_symlink() or str(root) != os.path.abspath(source_root):
        raise ValueError("source root is not a pinned regular directory")
    archive_path = pathlib.Path(source_root, *pathlib.PurePosixPath(spec["archivePath"]).parts)
    archive_real = archive_path.resolve(strict=True)
    if not archive_real.is_file() or archive_path.is_symlink() or not archive_real.is_relative_to(root):
        raise ValueError("source archive escapes the pinned source root")
    archive_digest = hashlib.sha256()
    with archive_real.open("rb") as source_stream:
        for chunk in iter(lambda: source_stream.read(1024 * 1024), b""):
            archive_digest.update(chunk)
    if archive_digest.hexdigest() != spec["archiveSha256"]:
        raise ValueError("source archive bytes differ from the pinned index")
    if spec["kind"] == "bundle":
        data = archive_real.read_bytes()
    elif spec["kind"] == "archive":
        with zipfile.ZipFile(archive_real) as archive:
            matches = [item for item in archive.infolist() if item.filename == spec["entryPath"]]
            if len(matches) != 1 or matches[0].is_dir():
                raise ValueError("source archive entry is absent or ambiguous")
            data = archive.read(matches[0])
    else:
        raise ValueError("source archive kind is unsupported")
    if hashlib.sha256(data).hexdigest() != spec["entrySha256"]:
        raise ValueError("source bundle bytes differ from the pinned index")
    return data


def _reader_ref(reader, bundle_sha):
    return {
        "bundleSha256": bundle_sha,
        "serializedFile": str(reader.assets_file.name),
        "objectId": str(reader.path_id),
    }


def _reader_key(reader, bundle_sha):
    return source_ref_key(_reader_ref(reader, bundle_sha))


def _pointer_reader(pointer):
    if pointer is None or int(getattr(pointer, "m_PathID", 0) or 0) == 0:
        return None
    return pointer.deref()


def _pointer_source_reference(pointer, owner_obj, owner_bundle_sha, bundles):
    if pointer is None:
        return None
    if not hasattr(pointer, "m_PathID") or not hasattr(pointer, "m_FileID"):
        raise ValueError("Animator controller external file reference is invalid")
    try:
        path_id = int(getattr(pointer, "m_PathID", 0) or 0)
        file_id = int(getattr(pointer, "m_FileID", 0) or 0)
    except (TypeError, ValueError):
        raise ValueError("Animator controller external file reference is invalid") from None
    if path_id == 0:
        return None
    if file_id < 0:
        raise ValueError("Animator controller external file reference is invalid")
    if file_id == 0:
        serialized_file = str(owner_obj.assets_file.name)
        bundle_sha = str(owner_bundle_sha).lower()
    else:
        externals = list(getattr(owner_obj.assets_file, "externals", []) or [])
        if file_id > len(externals):
            raise ValueError("Animator controller external file reference is invalid")
        external_name = getattr(externals[file_id - 1], "name", None)
        if not isinstance(external_name, str) or not external_name:
            raise ValueError("Animator controller external file reference is invalid")
        serialized_file = external_name
        normalized_name = _normalized_file(serialized_file)
        matching_bundles = [
            str(digest).lower()
            for digest, spec in bundles.items()
            if any(_normalized_file(name) == normalized_name for name in spec.get("serializedFiles", []))
        ]
        if len(matching_bundles) != 1:
            raise ValueError("Animator controller external file is not uniquely present in source dependency closure")
        bundle_sha = matching_bundles[0]
    return {
        "bundleSha256": bundle_sha,
        "serializedFile": serialized_file,
        "objectId": str(path_id),
    }


def _controller_graph_clip_evidence(controller_reference, bundles, object_for):
    resolved = {}
    resolving = set()
    controller_references = {}
    clip_references = {}

    def animation_clip_reference(pointer, owner_obj, owner_bundle_sha):
        reference = _pointer_source_reference(pointer, owner_obj, owner_bundle_sha, bundles)
        if reference is None:
            return None
        try:
            object_for(reference, "AnimationClip")
        except Exception:
            raise ValueError("Animator controller clip reference is unresolved") from None
        key = source_ref_key(reference)
        clip_references[key] = reference
        return key

    def visit(reference):
        key = source_ref_key(reference)
        if key in resolved:
            return resolved[key]
        if key in resolving or len(resolved) + len(resolving) >= MAX_CONTROLLER_GRAPH_OBJECTS:
            raise ValueError("Animator controller graph is cyclic, incomplete, or unsupported")
        resolving.add(key)
        try:
            try:
                controller_obj = object_for(reference)
            except Exception:
                raise ValueError("Animator controller object reference is unresolved") from None
            controller_references[key] = reference
            controller_type = controller_obj.type.name
            controller_value = controller_obj.read()
            if controller_type == "AnimatorController":
                animation_clips = getattr(controller_value, "m_AnimationClips", None)
                if animation_clips is None:
                    raise ValueError("Animator controller graph is cyclic, incomplete, or unsupported")
                clips = set()
                for pointer in list(animation_clips or []):
                    clip_key = animation_clip_reference(pointer, controller_obj, reference["bundleSha256"])
                    if clip_key:
                        clips.add(clip_key)
            elif controller_type == "AnimatorOverrideController":
                base_pointer = getattr(controller_value, "m_Controller", None)
                base_reference = _pointer_source_reference(base_pointer, controller_obj, reference["bundleSha256"], bundles)
                if base_reference is None:
                    raise ValueError("Animator controller graph is cyclic, incomplete, or unsupported")
                base_clips = visit(base_reference)
                clips = set(base_clips)
                pairs = getattr(controller_value, "m_Clips", None)
                if pairs is None:
                    raise ValueError("Animator controller graph is cyclic, incomplete, or unsupported")
                for pair in list(pairs or []):
                    if not hasattr(pair, "m_OriginalClip") or not hasattr(pair, "m_OverrideClip"):
                        raise ValueError("Animator controller graph is cyclic, incomplete, or unsupported")
                    original_key = animation_clip_reference(
                        getattr(pair, "m_OriginalClip", None), controller_obj, reference["bundleSha256"],
                    )
                    if original_key is None:
                        raise ValueError("Animator controller clip reference is unresolved")
                    if original_key not in base_clips:
                        raise ValueError("Animator override source clip is absent from its base controller")
                    override_pointer = getattr(pair, "m_OverrideClip", None)
                    override_key = animation_clip_reference(override_pointer, controller_obj, reference["bundleSha256"])
                    if override_key:
                        clips.discard(original_key)
                        clips.add(override_key)
            else:
                raise ValueError("Animator controller graph is cyclic, incomplete, or unsupported")
            resolved[key] = clips
            return clips
        finally:
            resolving.remove(key)

    effective_clip_keys = visit(controller_reference)
    effective_clips = [clip_references[key] for key in sorted(effective_clip_keys)]
    return {
        "clipReferences": [clip_references[key] for key in sorted(clip_references)],
        "controllerReferences": [controller_references[key] for key in sorted(controller_references)],
        "effectiveClipReferences": effective_clips,
        "graphSha256": sha256_json({
            "controllers": [controller_references[key] for key in sorted(controller_references)],
            "clips": [clip_references[key] for key in sorted(clip_references)],
            "effectiveClips": effective_clips,
        }),
    }


def _controller_graph_clip_references(controller_reference, bundles, object_for):
    evidence = _controller_graph_clip_evidence(controller_reference, bundles, object_for)
    return {source_ref_key(reference) for reference in evidence["effectiveClipReferences"]}


def _select_action_animator_evidence(animators, source_clip_reference, bundles, object_for):
    target_key = source_ref_key(source_clip_reference)
    matches = []
    for transform_key, animator_obj, animator_bundle_sha in animators:
        animator = animator_obj.read()
        controller_pointer = getattr(animator, "m_Controller", None)
        if controller_pointer is None:
            continue
        if not hasattr(controller_pointer, "m_PathID") or not hasattr(controller_pointer, "m_FileID"):
            raise ValueError("Animator controller external file reference is invalid")
        try:
            controller_path_id = int(getattr(controller_pointer, "m_PathID", 0) or 0)
        except (TypeError, ValueError):
            raise ValueError("Animator controller external file reference is invalid") from None
        if controller_path_id == 0:
            continue
        controller_reference = _pointer_source_reference(
            controller_pointer, animator_obj, animator_bundle_sha, bundles,
        )
        if controller_reference is None:
            continue
        controller_evidence = _controller_graph_clip_evidence(controller_reference, bundles, object_for)
        controller_clips = {
            source_ref_key(reference) for reference in controller_evidence["effectiveClipReferences"]
        }
        if target_key in controller_clips:
            matches.append({
                "transformKey": transform_key,
                "componentReference": _reader_ref(animator_obj, animator_bundle_sha),
                "controllerReference": controller_reference,
                "controllerEvidence": controller_evidence,
            })
    if len(matches) != 1:
        raise ValueError("selected prefab does not have exactly one Animator assigned to the pinned source clip")
    match = matches[0]
    matching_clip_count = sum(
        1 for reference in match["controllerEvidence"]["effectiveClipReferences"]
        if source_ref_key(reference) == target_key
    )
    if matching_clip_count != 1:
        raise ValueError("selected prefab does not have exactly one Animator assigned to the pinned source clip")
    return {
        **match,
        "matchingAnimatorCount": len(matches),
        "matchingClipCount": matching_clip_count,
    }


def _select_action_animator(animators, source_clip_reference, bundles, object_for):
    return _select_action_animator_evidence(animators, source_clip_reference, bundles, object_for)["transformKey"]


def _relative_path(target_key, root_key, parent_by_key, refs_by_key, names_by_key):
    reverse = []
    current = target_key
    seen = set()
    while current not in seen:
        seen.add(current)
        if current not in names_by_key or current not in refs_by_key:
            raise ValueError("transform hierarchy pointer is unresolved")
        reverse.append({"name": names_by_key[current], "sourceReference": refs_by_key[current]})
        if current == root_key:
            return list(reversed(reverse))
        parent = parent_by_key.get(current)
        if parent is None:
            break
        current = parent
    raise ValueError("transform is outside the selected prefab root or hierarchy has a cycle")


def _path_relation(path, animator_path):
    path_keys = [source_ref_key(part["sourceReference"]) for part in path]
    animator_keys = [source_ref_key(part["sourceReference"]) for part in animator_path]
    if len(path_keys) >= len(animator_keys) and path_keys[:len(animator_keys)] == animator_keys:
        return "inside-animator-subtree"
    if len(path_keys) < len(animator_keys) and animator_keys[:len(path_keys)] == path_keys:
        return "ancestor-of-animator-root"
    if path_keys and animator_keys and path_keys[0] == animator_keys[0]:
        return "disjoint"
    return "unresolved"


def _curve_keyframes(curve):
    return list(getattr(curve, "m_Curve", []) or [])


def _curve_path_record(path, animator_paths_by_hash, values, coeffs=None, property_name="unknown", source_kind="direct"):
    path_tokens = [] if not path else str(path).replace("\\", "/").split("/")
    path_hash = unity_path_hash(path_tokens)
    matches = animator_paths_by_hash.get(path_hash, [])
    resolved = len(matches) == 1 and matches[0]["pathTokens"] == path_tokens
    value_class = _direct_curve_may_move(values, coeffs)
    if value_class is None or not resolved:
        value_class_name = "unresolved"
    else:
        value_class_name = "dynamic" if value_class else "constant"
    return {
        "bindingPathHash": path_hash,
        "pathTokens": path_tokens,
        "sourceTransformReference": matches[0]["sourceReference"] if resolved else None,
        "component": "Transform",
        "property": property_name,
        "bindingKind": "transform",
        "sourceKind": source_kind,
        "sampleCount": len(values),
        "valuesSha256": sha256_json({"values": values, "coefficients": coeffs or []}),
        "valueClass": value_class_name,
        "_pathResolved": resolved,
    }


def _decode_transform_bindings(animation_clip, animator_paths_by_hash):
    tracks = []
    diagnostics = []
    complete = True
    muscle = getattr(animation_clip, "m_MuscleClip", None)
    clip_pointer = getattr(muscle, "m_Clip", None) if muscle is not None else None
    clip_data = getattr(clip_pointer, "data", None) if clip_pointer is not None else None
    if muscle is not None and (clip_pointer is None or clip_data is None):
        complete = False
        diagnostics.append("MUSCLE_CLIP_DATA_MISSING")
    if clip_data is not None:
        binding_constant = getattr(animation_clip, "m_ClipBindingConstant", None)
        bindings = list(getattr(binding_constant, "genericBindings", []) or []) if binding_constant is not None else []
        if not bindings:
            complete = False
            diagnostics.append("GENERIC_BINDING_TABLE_MISSING")
        else:
            ranges = []
            slot_count = 0
            for binding_index, binding in enumerate(bindings):
                type_id = int(getattr(binding, "typeID", 0) or 0)
                attribute = int(getattr(binding, "attribute", 0) or 0)
                width = binding_width(type_id, attribute)
                ranges.append({"binding": binding, "bindingIndex": binding_index, "start": slot_count, "width": width,
                               "typeId": type_id, "attribute": attribute})
                slot_count += width

            streamed = getattr(clip_data, "m_StreamedClip", None)
            dense = getattr(clip_data, "m_DenseClip", None)
            constant = getattr(clip_data, "m_ConstantClip", None)
            streamed_count = int(getattr(streamed, "curveCount", 0) or 0)
            dense_count = int(getattr(dense, "m_CurveCount", 0) or 0)
            frame_count = int(getattr(dense, "m_FrameCount", 0) or 0)
            constant_values = [float(value) for value in (getattr(constant, "data", []) or [])]
            dense_values = [float(value) for value in (getattr(dense, "m_SampleArray", []) or [])]
            dense_rate = float(getattr(dense, "m_SampleRate", 0.0) or 0.0)
            dense_begin_time = float(getattr(dense, "m_BeginTime", 0.0) or 0.0)
            muscle_data = getattr(animation_clip, "m_MuscleClip", None)
            clip_start_time = float(getattr(muscle_data, "m_StartTime", 0.0) or 0.0)
            clip_stop_time = float(getattr(muscle_data, "m_StopTime", 0.0) or 0.0)
            if dense_count > 0 and (not math.isfinite(dense_rate) or dense_rate <= 0 or not math.isfinite(dense_begin_time)):
                complete = False
                diagnostics.append("DENSE_SAMPLE_TIMING_UNRESOLVED")
            if streamed_count + dense_count + len(constant_values) != slot_count:
                complete = False
                diagnostics.append("GENERIC_CURVE_SLOT_COUNT_MISMATCH")
            if dense_count < 0 or frame_count < 0 or len(dense_values) != dense_count * frame_count:
                complete = False
                diagnostics.append("DENSE_CURVE_SAMPLE_COUNT_MISMATCH")

            try:
                decoded_stream = decode_streamed_clip(list(getattr(streamed, "data", []) or []), streamed_count)
                frames = decoded_stream["frames"]
                initial_keys = decoded_stream["initialKeys"]
            except Exception:
                frames = []
                initial_keys = []
                complete = False
                diagnostics.append("STREAMED_CLIP_DECODE_FAILED")

            streamed_keys = defaultdict(lambda: defaultdict(list))
            streamed_initial_values = {}
            stream_counts = defaultdict(int)
            for key in initial_keys:
                streamed_initial_values[key["index"]] = key["value"]
                stream_counts[key["index"]] += 1
            for frame in frames:
                seen_indices = set()
                for key in frame["keys"]:
                    index = key["index"]
                    if index >= streamed_count or index in seen_indices:
                        complete = False
                        diagnostics.append("STREAMED_CURVE_INDEX_INVALID")
                        continue
                    seen_indices.add(index)
                    binding_row = next((item for item in ranges if item["start"] <= index < item["start"] + item["width"]), None)
                    if binding_row is None:
                        complete = False
                        diagnostics.append("STREAMED_CURVE_BINDING_UNRESOLVED")
                        continue
                    component_index = index - binding_row["start"]
                    streamed_keys[binding_row["bindingIndex"]][component_index].append({
                        "time": frame["time"],
                        "value": key["value"],
                        "coefficients": key["coefficients"],
                    })
                    stream_counts[index] += 1
            for index in range(streamed_count):
                if stream_counts[index] == 0:
                    complete = False
                    diagnostics.append("STREAMED_CURVE_SLOT_MISSING")

            for row in ranges:
                binding = row["binding"]
                type_id, attribute = row["typeId"], row["attribute"]
                is_transform = type_id == 4
                path_hash = int(getattr(binding, "path", 0) or 0) & 0xFFFFFFFF
                path_matches = animator_paths_by_hash.get(path_hash, [])
                path_match = path_matches[0] if len(path_matches) == 1 else None
                if is_transform and path_match is None:
                    complete = False
                    diagnostics.append("TRANSFORM_PATH_HASH_UNRESOLVED")

                component_name = "Transform" if is_transform else str(type_id)
                property_name = {1: "translation", 2: "rotation", 3: "scale", 4: "euler"}.get(attribute, f"attribute-{attribute}") if is_transform else "non-transform"
                values_by_component = []
                coeffs_by_component = []
                times_by_component = []
                initial_values_by_component = []
                component_curves = []
                dynamic_flags = []
                sources = []
                for component_index in range(row["width"]):
                    slot = row["start"] + component_index
                    values = []
                    coeffs = []
                    times = []
                    initial_value = None
                    if slot < streamed_count:
                        keys = streamed_keys[row["bindingIndex"]][component_index]
                        values.extend(key["value"] for key in keys)
                        coeffs.extend(key["coefficients"] for key in keys)
                        times.extend(key["time"] for key in keys)
                        initial_value = streamed_initial_values.get(slot)
                        if not values and initial_value is not None:
                            values.append(initial_value)
                        dynamic_flags.append(_streamed_curve_is_dynamic(keys))
                        sources.append("streamed")
                        component_curves.append({
                            "component": ("x", "y", "z", "w")[component_index],
                            "sourceKind": "streamed",
                            "initialValue": initial_value,
                            "keys": [{
                                "time": key["time"],
                                "value": key["value"],
                                "coefficients": key["coefficients"],
                            } for key in keys],
                        })
                    elif slot < streamed_count + dense_count:
                        dense_slot = slot - streamed_count
                        curve_keys = []
                        for frame_index in range(frame_count):
                            value = dense_values[frame_index * dense_count + dense_slot]
                            time_value = dense_begin_time + frame_index / dense_rate if dense_rate > 0 else float("nan")
                            values.append(value)
                            curve_keys.append({"time": time_value, "value": value, "coefficients": None})
                        dynamic_flags.append(_value_sequence_is_dynamic(values))
                        sources.append("dense")
                        component_curves.append({
                            "component": ("x", "y", "z", "w")[component_index],
                            "sourceKind": "dense",
                            "initialValue": values[0] if values else None,
                            "keys": curve_keys,
                        })
                    elif slot < streamed_count + dense_count + len(constant_values):
                        constant_slot = slot - streamed_count - dense_count
                        value = constant_values[constant_slot]
                        values.append(value)
                        dynamic_flags.append(_value_sequence_is_dynamic(values))
                        sources.append("constant")
                        component_curves.append({
                            "component": ("x", "y", "z", "w")[component_index],
                            "sourceKind": "constant",
                            "initialValue": value,
                            "keys": [{"time": clip_start_time, "value": value, "coefficients": None}],
                        })
                    else:
                        complete = False
                        diagnostics.append("GENERIC_CURVE_SLOT_OUT_OF_RANGE")
                        dynamic_flags.append(None)
                        component_curves.append({
                            "component": ("x", "y", "z", "w")[component_index],
                            "sourceKind": "unresolved",
                            "initialValue": None,
                            "keys": [],
                        })
                    values_by_component.append(values)
                    coeffs_by_component.append(coeffs)
                    times_by_component.append(times)
                    initial_values_by_component.append(initial_value)

                all_values = [value for component in values_by_component for value in component]
                if not all_values or any(flag is None for flag in dynamic_flags):
                    complete = False
                    diagnostics.append("GENERIC_CURVE_VALUE_UNRESOLVED")
                    value_class = "unresolved"
                elif any(dynamic_flags):
                    value_class = "dynamic"
                else:
                    value_class = "constant"
                source_kind = "+".join(sorted(set(sources))) or "absent"
                track = {
                    "curveIndex": row["bindingIndex"],
                    "bindingPathHash": path_hash,
                    "pathTokens": path_match["pathTokens"] if path_match else None,
                    "sourceTransformReference": path_match["sourceReference"] if path_match else None,
                    "component": component_name,
                    "property": property_name,
                    "bindingKind": "transform" if is_transform else "other",
                    "sourceKind": source_kind,
                    "sampleCount": len(all_values),
                    "valuesSha256": sha256_json({
                        "valuesByComponent": values_by_component,
                        "coefficientsByComponent": coeffs_by_component,
                        "timesByComponent": times_by_component,
                        "initialValuesByComponent": initial_values_by_component,
                    }),
                    "valueClass": value_class,
                    "componentCurves": component_curves if is_transform else [],
                    "sampleStartTime": clip_start_time,
                    "sampleStopTime": clip_stop_time,
                }
                if not is_transform or attribute not in (1, 2, 3, 4):
                    complete = False
                    diagnostics.append("GENERIC_BINDING_UNSUPPORTED")
                    track["valueClass"] = "unresolved"
                    track["rawGenericBindingSamples"] = _raw_generic_binding_samples(
                        component_curves, row["start"], type_id, attribute, path_hash,
                    )
                tracks.append(track)

    direct_groups = [
        ("m_PositionCurves", "translation", ("x", "y", "z")),
        ("m_RotationCurves", "rotation", ("x", "y", "z", "w")),
        ("m_EulerCurves", "euler", ("x", "y", "z")),
        ("m_ScaleCurves", "scale", ("x", "y", "z")),
    ]
    for field, property_name, components in direct_groups:
        for curve_index, curve_record in enumerate(getattr(animation_clip, field, []) or []):
            path = str(getattr(curve_record, "path", "") or "")
            curve = getattr(curve_record, "curve", None)
            keys = _curve_keyframes(curve)
            values_by_key = [_vector_values(getattr(key, "value"), components) for key in keys]
            flattened = [value for values in values_by_key for value in values]
            coefficients = []
            for key in keys:
                slopes = []
                for field_name in ("inSlope", "outSlope"):
                    value = getattr(key, field_name, None)
                    if value is not None:
                        try:
                            slopes.extend(_vector_values(value, components))
                        except Exception:
                            pass
                coefficients.append(slopes)
            track = _curve_path_record(path, animator_paths_by_hash, flattened, coefficients, property_name, field)
            track["curveIndex"] = curve_index
            track["valueClass"] = "unresolved"
            tracks.append(track)
            complete = False
            diagnostics.append("DIRECT_TRANSFORM_CURVE_SAMPLING_UNSUPPORTED")

    compressed = list(getattr(animation_clip, "m_CompressedRotationCurves", []) or [])
    if compressed:
        complete = False
        diagnostics.append("COMPRESSED_ROTATION_CURVE_UNSUPPORTED")
        for curve_index, curve in enumerate(compressed):
            path = str(getattr(curve, "m_Path", "") or "")
            path_tokens = path.split("/") if path else []
            path_hash = unity_path_hash(path_tokens)
            matches = animator_paths_by_hash.get(path_hash, [])
            tracks.append({
                "curveIndex": curve_index,
                "bindingPathHash": path_hash,
                "pathTokens": path_tokens,
                "sourceTransformReference": matches[0]["sourceReference"] if len(matches) == 1 else None,
                "component": "Transform",
                "property": "compressed-rotation",
                "bindingKind": "transform",
                "sourceKind": "compressed",
                "sampleCount": 0,
                "valuesSha256": sha256_json({"unsupported": True, "path": path}),
                "valueClass": "unresolved",
            })

    # Float/PPtr curves can change renderer blendshapes/material or visibility.
    # They are included in the digest and conservatively block proof when their
    # exact path is inside this prefab's transform hierarchy.
    for field in ("m_FloatCurves", "m_PPtrCurves"):
        for curve_index, curve in enumerate(getattr(animation_clip, field, []) or []):
            path = str(getattr(curve, "path", "") or "")
            path_tokens = path.split("/") if path else []
            path_hash = unity_path_hash(path_tokens)
            matches = animator_paths_by_hash.get(path_hash, [])
            complete = False
            diagnostics.append("NON_TRANSFORM_RENDERER_CURVE_REQUIRES_REVIEW")
            tracks.append({
                "curveIndex": curve_index,
                "bindingPathHash": path_hash,
                "pathTokens": path_tokens if len(matches) == 1 else None,
                "sourceTransformReference": matches[0]["sourceReference"] if len(matches) == 1 else None,
                "component": str(getattr(curve, "classID", "renderer")),
                "property": str(getattr(curve, "attribute", field)),
                "bindingKind": "renderer",
                "sourceKind": field,
                "sampleCount": 0,
                "valuesSha256": sha256_json({"unsupportedRendererCurve": True, "path": path, "attribute": str(getattr(curve, "attribute", ""))}),
                "valueClass": "unresolved",
            })

    return tracks, complete, sorted(set(diagnostics))


def _curve_event_points(curve, start_time, stop_time):
    events = {(float(start_time), "key"), (float(stop_time), "key")}
    keys = list(curve.get("keys", []))
    for key in keys:
        time_value = float(key["time"])
        if not math.isfinite(time_value) or time_value < start_time - TOLERANCE or time_value > stop_time + TOLERANCE:
            raise ValueError("source curve key lies outside its clip bounds")
        events.add((time_value, "key"))
    for current, following in zip(keys, keys[1:]):
        t0 = float(current["time"])
        t1 = float(following["time"])
        delta_time = t1 - t0
        if not math.isfinite(delta_time) or delta_time <= 0:
            raise ValueError("source curve key times are not strictly increasing")
        events.add(((t0 + t1) / 2.0, "midpoint"))
        coefficients = current.get("coefficients")
        if coefficients is None:
            continue
        if len(coefficients) != 4 or not all(math.isfinite(float(value)) for value in coefficients):
            raise ValueError("source curve cubic coefficients are malformed")
        cubic, quadratic, linear, start_value = [float(value) for value in coefficients]
        if abs(start_value - float(current["value"])) > TOLERANCE:
            raise ValueError("source curve polynomial seed differs from its key value")
        endpoint = ((cubic * delta_time + quadratic) * delta_time + linear) * delta_time + start_value
        if abs(endpoint - float(following["value"])) > TOLERANCE:
            raise ValueError("source curve polynomial endpoint differs from its next key")
        a, b, c = 3.0 * cubic, 2.0 * quadratic, linear
        roots = []
        if a == 0.0:
            if b != 0.0:
                roots.append(-c / b)
        else:
            discriminant = b * b - 4.0 * a * c
            if discriminant >= 0.0:
                root = math.sqrt(discriminant)
                roots.extend(((-b - root) / (2.0 * a), (-b + root) / (2.0 * a)))
        for relative in roots:
            if 0.0 < relative < delta_time:
                events.add((t0 + relative, "cubic-extremum"))
    return events


def _curve_value_at(curve, time_value):
    keys = list(curve.get("keys", []))
    if not keys:
        initial = curve.get("initialValue")
        if initial is None or not math.isfinite(float(initial)):
            raise ValueError("source curve has no resolved seed or keys")
        return float(initial)
    if time_value < float(keys[0]["time"]):
        initial = curve.get("initialValue")
        return float(keys[0]["value"] if initial is None else initial)
    for current, following in zip(keys, keys[1:]):
        t0 = float(current["time"])
        t1 = float(following["time"])
        if time_value > t1:
            continue
        relative = time_value - t0
        coefficients = current.get("coefficients")
        if coefficients is None:
            portion = relative / (t1 - t0)
            return float(current["value"]) + (float(following["value"]) - float(current["value"])) * portion
        cubic, quadratic, linear, start_value = [float(value) for value in coefficients]
        return ((cubic * relative + quadratic) * relative + linear) * relative + start_value
    return float(keys[-1]["value"])


def _source_trs_samples(tracks, local_trs, start_time, stop_time):
    by_property = defaultdict(dict)
    for track in tracks:
        if track.get("bindingKind") != "transform" or track.get("valueClass") == "unresolved":
            raise ValueError("source transform tracks are not fully resolved")
        property_name = track.get("property")
        if property_name == "euler":
            raise ValueError("Euler source transform curves are unsupported")
        if property_name not in {"translation", "rotation", "scale"}:
            raise ValueError("source transform property is unsupported")
        for component_curve in track.get("componentCurves", []):
            component = component_curve.get("component")
            if component not in {"x", "y", "z", "w"} or component in by_property[property_name]:
                raise ValueError("source transform component binding is ambiguous")
            by_property[property_name][component] = component_curve

    events = {(float(start_time), "key"), (float(stop_time), "key")}
    for component_curves in by_property.values():
        for curve in component_curves.values():
            events.update(_curve_event_points(curve, start_time, stop_time))
    if not events or any(not math.isfinite(time_value) for time_value, _ in events):
        raise ValueError("source transform sample times are invalid")

    samples = []
    for time_value, kind in sorted(events, key=lambda item: (item[0], item[1])):
        raw = {name: list(values) for name, values in local_trs.items()}
        for property_name, components in by_property.items():
            axis_names = ("x", "y", "z", "w")
            values = raw[property_name]
            for component_index, component in enumerate(axis_names[:len(values)]):
                curve = components.get(component)
                if curve is not None:
                    values[component_index] = _curve_value_at(curve, time_value)
        translation = [-float(raw["translation"][0]) / 100.0,
                       float(raw["translation"][1]) / 100.0,
                       float(raw["translation"][2]) / 100.0]
        rotation = [float(raw["rotation"][0]), -float(raw["rotation"][1]),
                    -float(raw["rotation"][2]), float(raw["rotation"][3])]
        norm = math.sqrt(sum(value * value for value in rotation))
        if not math.isfinite(norm) or norm <= 0.0:
            raise ValueError("source transform rotation is invalid")
        rotation = [value / norm for value in rotation]
        scale = [float(value) for value in raw["scale"]]
        if not all(math.isfinite(value) for value in (*translation, *rotation, *scale)):
            raise ValueError("source transform sample is non-finite")
        samples.append({
            "timeSec": time_value,
            "kind": kind,
            "translation": translation,
            "rotation": rotation,
            "scale": scale,
        })
    return samples


def inspect(request):
    _set_stage("python_import")
    import UnityPy

    source_root = request["sourceRoot"]
    bundles = request["bundles"]
    environments = {}

    def environment_for(reference):
        _set_stage("source_bundle_loading")
        digest = str(reference["bundleSha256"]).lower()
        if digest not in environments:
            spec = bundles.get(digest)
            if spec is None:
                raise ValueError("source bundle is missing from the pinned inventory")
            data = _read_source_bundle(source_root, spec)
            environments[digest] = UnityPy.load(data)
        return environments[digest]

    def object_for(reference, expected_type=None):
        env = environment_for(reference)
        _set_stage("source_object_lookup")
        matches = [obj for obj in env.objects
                   if str(obj.assets_file.name).lower() == str(reference["serializedFile"]).lower()
                   and str(obj.path_id) == str(reference["objectId"])]
        if len(matches) != 1:
            raise ValueError("source object reference is absent or ambiguous")
        if expected_type and matches[0].type.name != expected_type:
            raise ValueError("source object type differs from its expected type")
        return matches[0]

    prefab_ref = request["selectedPrefab"]
    _set_stage("prefab_hierarchy")
    root_prefab_obj = object_for(prefab_ref, "GameObject")
    prefab_env = environment_for(prefab_ref)
    prefab_bundle_sha = str(prefab_ref["bundleSha256"]).lower()
    prefab_serialized = str(prefab_ref["serializedFile"]).lower()

    transform_records = {}
    go_to_transform = defaultdict(list)
    for obj in prefab_env.objects:
        if obj.type.name != "Transform" or str(obj.assets_file.name).lower() != prefab_serialized:
            continue
        value = obj.read()
        reference = _reader_ref(obj, prefab_bundle_sha)
        key = source_ref_key(reference)
        go_reader = _pointer_reader(getattr(value, "m_GameObject", None))
        if go_reader is None:
            raise ValueError("prefab transform has no GameObject")
        go_key = _reader_key(go_reader, prefab_bundle_sha)
        game_object = go_reader.read()
        transform_records[key] = {
            "reader": obj,
            "value": value,
                "reference": reference,
                "name": str(getattr(game_object, "m_Name", "") or ""),
                "gameObjectKey": go_key,
                "localTrs": {
                    "translation": _vector_values(value.m_LocalPosition, ("x", "y", "z")),
                    "rotation": _vector_values(value.m_LocalRotation, ("x", "y", "z", "w")),
                    "scale": _vector_values(value.m_LocalScale, ("x", "y", "z")),
                },
            }
        go_to_transform[go_key].append(key)

    root_go_key = _reader_key(root_prefab_obj, prefab_bundle_sha)
    root_candidates = go_to_transform.get(root_go_key, [])
    if len(root_candidates) != 1:
        raise ValueError("selected prefab GameObject has no unique Transform")
    root_transform_key = root_candidates[0]

    parent_by_key = {}
    children_by_key = defaultdict(list)
    for key, record in transform_records.items():
        parent_reader = _pointer_reader(getattr(record["value"], "m_Father", None))
        if parent_reader is not None:
            parent_key = _reader_key(parent_reader, prefab_bundle_sha)
            parent_by_key[key] = parent_key
        for child_pointer in list(getattr(record["value"], "m_Children", []) or []):
            child_reader = _pointer_reader(child_pointer)
            if child_reader is None:
                raise ValueError("prefab child Transform pointer is null")
            child_key = _reader_key(child_reader, prefab_bundle_sha)
            children_by_key[key].append(child_key)

    reachable = set()
    pending = [(root_transform_key, 0)]
    while pending:
        current, depth = pending.pop()
        if current in reachable:
            raise ValueError("prefab transform tree contains a cycle or repeated child")
        if depth > MAX_HIERARCHY_DEPTH or current not in transform_records:
            raise ValueError("prefab transform tree is incomplete or exceeds its bound")
        reachable.add(current)
        for child in children_by_key.get(current, []):
            pending.append((child, depth + 1))
    names_by_key = {key: value["name"] for key, value in transform_records.items() if key in reachable}
    refs_by_key = {key: value["reference"] for key, value in transform_records.items() if key in reachable}

    root_ref = refs_by_key[root_transform_key]
    root_name = names_by_key[root_transform_key]
    clip_ref = request["sourceClip"]
    _set_stage("animation_clip_binding")
    clip_obj = object_for(clip_ref, "AnimationClip")
    animation_clip = clip_obj.read()
    clip_name = str(getattr(animation_clip, "m_Name", "") or "")
    if clip_name != request["clipName"]:
        raise ValueError("source AnimationClip name differs from the persisted action")

    _set_stage("animator_binding")
    animator_candidates = []
    for obj in prefab_env.objects:
        if obj.type.name != "Animator" or str(obj.assets_file.name).lower() != prefab_serialized:
            continue
        animator = obj.read()
        animator_go = _pointer_reader(getattr(animator, "m_GameObject", None))
        if animator_go is None:
            continue
        transform_keys = go_to_transform.get(_reader_key(animator_go, prefab_bundle_sha), [])
        if len(transform_keys) == 1 and transform_keys[0] in reachable:
            animator_candidates.append((transform_keys[0], obj, prefab_bundle_sha))
    animator_selection = _select_action_animator_evidence(animator_candidates, clip_ref, bundles, object_for)
    animator_root_key = animator_selection["transformKey"]
    animator_path = _relative_path(animator_root_key, root_transform_key, parent_by_key, refs_by_key, names_by_key)
    animator_path_tokens = [item["name"] for item in animator_path[1:]]
    animator_root_ref = refs_by_key[animator_root_key]

    animator_paths_by_hash = defaultdict(list)
    animator_descendants = set()
    pending = [animator_root_key]
    while pending:
        current = pending.pop()
        if current in animator_descendants:
            raise ValueError("prefab transform tree contains a cycle or repeated child")
        animator_descendants.add(current)
        pending.extend(children_by_key.get(current, []))
    for key in animator_descendants:
        path = _relative_path(key, animator_root_key, parent_by_key, refs_by_key, names_by_key)
        tokens = [item["name"] for item in path[1:]]
        path_record = {"pathTokens": tokens, "sourceReference": refs_by_key[key]}
        animator_paths_by_hash[unity_path_hash(tokens)].append(path_record)

    renderer_obj = object_for(request["rendererReference"], "SkinnedMeshRenderer")
    renderer_value = renderer_obj.read()
    renderer_go = _pointer_reader(getattr(renderer_value, "m_GameObject", None))
    if renderer_go is None:
        raise ValueError("source renderer has no GameObject")
    renderer_transform_candidates = go_to_transform.get(_reader_key(renderer_go, prefab_bundle_sha), [])
    if len(renderer_transform_candidates) != 1:
        raise ValueError("source renderer GameObject has no unique Transform")
    renderer_transform_key = renderer_transform_candidates[0]
    if renderer_transform_key not in reachable:
        raise ValueError("source renderer is outside the selected prefab tree")

    scope_transform_rows = []
    _set_stage("scope_binding")
    seen_scope = set()
    for item in request["scopeTransforms"]:
        reference = item["sourceReference"]
        key = source_ref_key(reference)
        if key in seen_scope:
            raise ValueError("scope transform identity is duplicated")
        seen_scope.add(key)
        if key not in transform_records or key not in reachable:
            raise ValueError("scope transform does not resolve inside selected prefab")
        path = _relative_path(key, root_transform_key, parent_by_key, refs_by_key, names_by_key)
        path_keys = [source_ref_key(part["sourceReference"]) for part in path]
        animator_path_keys = [source_ref_key(part["sourceReference"]) for part in animator_path]
        if len(path_keys) >= len(animator_path_keys) and path_keys[:len(animator_path_keys)] == animator_path_keys:
            animator_relation = "inside-animator-subtree"
            animation_path_tokens = [part["name"] for part in path[len(animator_path):]]
        elif len(path_keys) < len(animator_path_keys) and animator_path_keys[:len(path_keys)] == path_keys:
            animator_relation = "ancestor-of-animator-root"
            animation_path_tokens = None
        else:
            animator_relation = "disjoint"
            animation_path_tokens = None
        scope_transform_rows.append({
            "roles": sorted(set(item["roles"])),
            "sourceReference": refs_by_key[key],
            "name": names_by_key[key],
            "path": path,
            "pathSha256": sha256_json(path),
            "animatorRelation": animator_relation,
            "animationPathTokens": animation_path_tokens,
        })
    scope_transform_rows.sort(key=lambda item: (source_ref_key(item["sourceReference"]), ",".join(item["roles"])))

    _set_stage("curve_decode")
    tracks, decoder_complete, diagnostics = _decode_transform_bindings(animation_clip, animator_paths_by_hash)
    scope_keys = {source_ref_key(item["sourceReference"]) for item in request["scopeTransforms"]}
    for track in tracks:
        if track.get("bindingKind") == "other" and track.get("sourceTransformReference"):
            if source_ref_key(track["sourceTransformReference"]) in scope_keys:
                decoder_complete = False
                track["valueClass"] = "unresolved"
                diagnostics.append("NON_TRANSFORM_RELEVANT_BINDING_UNSUPPORTED")
    diagnostics = sorted(set(diagnostics))
    tracks.sort(key=lambda item: (int(item.get("curveIndex", -1)), int(item.get("bindingPathHash", 0)), str(item.get("property", ""))))
    prefab_path_by_key = {
        key: _relative_path(key, root_transform_key, parent_by_key, refs_by_key, names_by_key)
        for key in reachable
    }
    tracks_by_target = defaultdict(list)
    for track in tracks:
        reference = track.get("sourceTransformReference")
        key = source_ref_key(reference) if isinstance(reference, dict) else None
        path = prefab_path_by_key.get(key)
        track["sourceTarget"] = None if path is None else {
            "reference": refs_by_key[key],
            "path": path,
            "pathSha256": sha256_json(path),
            "animatorRelation": _path_relation(path, animator_path),
            "sourceLocalTrs": transform_records[key]["localTrs"],
        }
        if key is not None and path is not None:
            tracks_by_target[key].append(track)
    for key, target_tracks in tracks_by_target.items():
        try:
            source_samples = _source_trs_samples(
                target_tracks,
                transform_records[key]["localTrs"],
                float(getattr(getattr(animation_clip, "m_MuscleClip", None), "m_StartTime", 0.0) or 0.0),
                float(getattr(getattr(animation_clip, "m_MuscleClip", None), "m_StopTime", 0.0) or 0.0),
            )
        except Exception:
            complete = False
            diagnostics.append("SOURCE_TRANSFORM_SAMPLE_UNRESOLVED")
            for track in target_tracks:
                track["valueClass"] = "unresolved"
                track["sourceSamples"] = []
        else:
            for track in target_tracks:
                track["sourceSamples"] = source_samples
    diagnostics = sorted(set(diagnostics))
    tracks.sort(key=lambda item: (int(item.get("curveIndex", -1)), int(item.get("bindingPathHash", 0)), str(item.get("property", ""))))

    # Keep exact profile-known ancestry and direct references independently
    # checkable by the TS coordinator.
    return {
        "selectedPrefab": prefab_ref,
        "rootTransformReference": root_ref,
        "prefabRootName": root_name,
        "animatorRootReference": animator_root_ref,
        "animatorRootPath": animator_path,
        "animator": {
            "componentReference": animator_selection["componentReference"],
            "rootReference": animator_root_ref,
            "path": animator_path,
            "controllerReference": animator_selection["controllerReference"],
            "controllerGraph": {
                "complete": True,
                "references": animator_selection["controllerEvidence"]["controllerReferences"],
                "clipReferences": animator_selection["controllerEvidence"]["clipReferences"],
                "effectiveClipReferences": animator_selection["controllerEvidence"]["effectiveClipReferences"],
                "sha256": animator_selection["controllerEvidence"]["graphSha256"],
            },
            "selectedClipReference": clip_ref,
            "matchingAnimatorCount": animator_selection["matchingAnimatorCount"],
            "matchingClipCount": animator_selection["matchingClipCount"],
        },
        "rendererTransformReference": refs_by_key[renderer_transform_key],
        "scopeTransforms": scope_transform_rows,
        "sourceClip": clip_ref,
        "clipName": clip_name,
        "tracks": tracks,
        "curveSet": {
            "complete": decoder_complete,
            "coverageStatus": "complete" if decoder_complete else "incomplete",
            "totalBindingCount": len(tracks),
            "genericBindingCount": len(list(getattr(getattr(animation_clip, "m_ClipBindingConstant", None), "genericBindings", []) or [])),
            "directCurveCount": sum(1 for item in tracks if item.get("sourceKind") in {"m_PositionCurves", "m_RotationCurves", "m_EulerCurves", "m_ScaleCurves"}),
            "decoderDiagnostics": diagnostics,
            "sha256": sha256_json({"clipReference": clip_ref, "clipName": clip_name, "tracks": tracks, "complete": decoder_complete}),
        },
    }


def main():
    request = json.load(sys.stdin)
    _set_stage("request")
    result = resolve_inventory(request) if request.get("mode") == "resolve-inventory" else inspect(request)
    sys.stdout.write(json.dumps(result, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # Never echo local paths or connection material from exceptions.
        sys.stdout.write(json.dumps(helper_failure_payload(error, CURRENT_STAGE), separators=(",", ":")))
        sys.exit(1)
