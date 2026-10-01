import struct
import hashlib
import json
import tempfile
import unittest
import zlib
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from chibi_v12_motion_proof_unitypy import (
    _decode_transform_bindings,
    _iter_inventory_file_records,
    _path_relation,
    _raw_generic_binding_samples,
    _select_action_animator,
    _select_action_animator_evidence,
    _source_trs_samples,
    _streamed_curve_is_dynamic,
    binding_width,
    decode_streamed_clip,
    decode_streamed_frames,
    helper_failure_payload,
    resolve_inventory,
    source_ref_key,
    unity_path_hash,
)


def word(float_value):
    return struct.unpack("<I", struct.pack("<f", float_value))[0]


def streamed_record(time_value, keys):
    words = [word(time_value), len(keys)]
    for index, coefficients in keys:
        words.append(index)
        words.extend(word(value) for value in coefficients)
    return words


def streamed_clip_words(curve_count, seed_values, frames=()):
    words = [0xFF7FFFFF, curve_count]
    for index, value in enumerate(seed_values):
        words.extend([index, word(0.0), word(0.0), word(0.0), word(value)])
    for time_value, keys in frames:
        words.extend(streamed_record(time_value, keys))
    words.extend([0x7F800000, 0])
    return words


def generic_binding_clip(type_id, attribute, *, streamed_data=None, streamed_curve_count=0,
                         dense_count=0, frame_count=0, dense_values=(), dense_rate=0.0,
                         dense_begin_time=0.0, constant_values=(), clip_start=0.0, clip_stop=1.0):
    if streamed_data is None:
        streamed_data = streamed_clip_words(0, [])
    clip_data = SimpleNamespace(
        m_StreamedClip=SimpleNamespace(curveCount=streamed_curve_count, data=streamed_data),
        m_DenseClip=SimpleNamespace(
            m_CurveCount=dense_count,
            m_FrameCount=frame_count,
            m_SampleArray=list(dense_values),
            m_SampleRate=dense_rate,
            m_BeginTime=dense_begin_time,
        ),
        m_ConstantClip=SimpleNamespace(data=list(constant_values)),
    )
    return SimpleNamespace(
        m_MuscleClip=SimpleNamespace(
            m_Clip=SimpleNamespace(data=clip_data),
            m_StartTime=clip_start,
            m_StopTime=clip_stop,
        ),
        m_ClipBindingConstant=SimpleNamespace(genericBindings=[
            SimpleNamespace(typeID=type_id, attribute=attribute, path=123456789),
        ]),
    )


class FakePointer:
    def __init__(self, file_id, path_id):
        self.m_FileID = file_id
        self.m_PathID = path_id


class FakeExternal:
    def __init__(self, name):
        self.name = name


class FakeAssetFile:
    def __init__(self, name, externals=()):
        self.name = name
        self.externals = list(externals)


class FakeReader:
    def __init__(self, kind, reference, value, externals=()):
        self.type = type("FakeType", (), {"name": kind})()
        self.assets_file = FakeAssetFile(reference["serializedFile"], externals)
        self.path_id = int(reference["objectId"])
        self.value = value

    def read(self):
        return self.value


def controller_fixture():
    bundle_prefab = "a" * 64
    bundle_override = "b" * 64
    bundle_base = "c" * 64
    bundle_original_clip = "d" * 64
    bundle_action_clip = "e" * 64
    bundles = {
        bundle_prefab: {"serializedFiles": ["CAB-PREFAB"]},
        bundle_override: {"serializedFiles": ["CAB-OVERRIDE"]},
        bundle_base: {"serializedFiles": ["CAB-BASE"]},
        bundle_original_clip: {"serializedFiles": ["CAB-ORIGINAL-CLIP"]},
        bundle_action_clip: {"serializedFiles": ["CAB-ACTION-CLIP"]},
    }
    controller_reference = {"bundleSha256": bundle_override, "serializedFile": "CAB-OVERRIDE", "objectId": "100"}
    base_reference = {"bundleSha256": bundle_base, "serializedFile": "CAB-BASE", "objectId": "200"}
    original_clip = {"bundleSha256": bundle_original_clip, "serializedFile": "CAB-ORIGINAL-CLIP", "objectId": "10"}
    action_clip = {"bundleSha256": bundle_action_clip, "serializedFile": "CAB-ACTION-CLIP", "objectId": "42"}

    controller = FakeReader("AnimatorOverrideController", controller_reference, type("Override", (), {
        "m_Controller": FakePointer(1, 200),
        "m_Clips": [type("ClipPair", (), {
            "m_OriginalClip": FakePointer(2, 10),
            "m_OverrideClip": FakePointer(3, 42),
        })()],
    })(), [FakeExternal("CAB-BASE"), FakeExternal("CAB-ORIGINAL-CLIP"), FakeExternal("CAB-ACTION-CLIP")])
    base = FakeReader("AnimatorController", base_reference, type("BaseController", (), {
        "m_AnimationClips": [FakePointer(1, 10)],
    })(), [FakeExternal("CAB-ORIGINAL-CLIP")])
    original = FakeReader("AnimationClip", original_clip, type("Clip", (), {"m_Name": "BaseIdle"})())
    action = FakeReader("AnimationClip", action_clip, type("Clip", (), {"m_Name": "CafeIdle"})())
    root_animator = FakeReader("Animator", {"bundleSha256": bundle_prefab, "serializedFile": "CAB-PREFAB", "objectId": "1"}, type("Animator", (), {
        "m_Controller": FakePointer(1, 100),
    })(), [FakeExternal("CAB-OVERRIDE")])
    halo_animator = FakeReader("Animator", {"bundleSha256": bundle_prefab, "serializedFile": "CAB-PREFAB", "objectId": "2"}, type("Animator", (), {
        "m_Controller": FakePointer(0, 0),
    })())
    objects = {
        source_ref_key(controller_reference): controller,
        source_ref_key(base_reference): base,
        source_ref_key(original_clip): original,
        source_ref_key(action_clip): action,
    }

    def object_for(reference, expected_type=None):
        result = objects[source_ref_key(reference)]
        if expected_type and result.type.name != expected_type:
            raise ValueError("unexpected fake source object type")
        return result

    return {
        "bundles": bundles,
        "actionClip": action_clip,
        "rootAnimator": root_animator,
        "haloAnimator": halo_animator,
        "objectFor": object_for,
        "bundleSha256": bundle_prefab,
    }


class MotionProofUnityPyTests(unittest.TestCase):
    def assert_generic_binding_remains_unresolved(self, track, complete, diagnostics):
        self.assertFalse(complete)
        self.assertIn("GENERIC_BINDING_UNSUPPORTED", diagnostics)
        self.assertEqual(track["bindingKind"], "other" if track["component"] != "Transform" else "transform")
        self.assertEqual(track["valueClass"], "unresolved")
        if track["bindingKind"] == "other":
            self.assertEqual(track["componentCurves"], [])

    def test_unity_crc32_path_hash(self):
        self.assertEqual(unity_path_hash(["abc"]), zlib.crc32(b"abc") & 0xFFFFFFFF)
        self.assertEqual(unity_path_hash([]), 0)

    def test_generic_binding_widths_follow_transform_component_counts(self):
        self.assertEqual(binding_width(4, 1), 3)
        self.assertEqual(binding_width(4, 2), 4)
        self.assertEqual(binding_width(4, 3), 3)
        self.assertEqual(binding_width(4, 4), 3)
        self.assertEqual(binding_width(95, 1), 1)

    def test_streamed_frame_decodes_all_curve_coefficients(self):
        words = [word(0.25), 1, 2, word(0.0), word(0.0), word(0.0), word(3.5)]
        frames = decode_streamed_frames(words)
        self.assertEqual(len(frames), 1)
        self.assertEqual(frames[0]["time"], 0.25)
        self.assertEqual(frames[0]["keys"][0]["index"], 2)
        self.assertEqual(frames[0]["keys"][0]["coefficients"], [0.0, 0.0, 0.0, 3.5])

    def test_streamed_frame_rejects_truncation_or_invalid_index(self):
        with self.assertRaises(ValueError):
            decode_streamed_frames([word(0.0), 1])
        with self.assertRaises(ValueError):
            decode_streamed_frames([word(0.0), 1, 0xFFFFFFFF, word(0.0), word(0.0), word(0.0), word(1.0)])

    def test_streamed_clip_excludes_exact_sentinels_but_preserves_seed_coverage(self):
        words = streamed_clip_words(2, [3.0, 4.0], [(0.0, [(0, (0.0, 0.0, 0.0, 3.0))])])
        decoded = decode_streamed_clip(words, 2)
        self.assertEqual([key["index"] for key in decoded["initialKeys"]], [0, 1])
        self.assertEqual([key["value"] for key in decoded["initialKeys"]], [3.0, 4.0])
        self.assertEqual(len(decoded["frames"]), 1)
        self.assertEqual(decoded["frames"][0]["time"], 0.0)
        self.assertEqual([key["index"] for key in decoded["frames"][0]["keys"]], [0])

    def test_streamed_clip_rejects_malformed_sentinels_and_interior_records(self):
        valid = streamed_clip_words(1, [2.0], [(0.0, [(0, (0.0, 0.0, 0.0, 2.0))])])
        malformed = []
        malformed.append(valid[2:])  # no leading init sentinel
        wrong_seed_count = list(valid)
        wrong_seed_count[1] = 0
        malformed.append(wrong_seed_count)
        duplicate_seed = [0xFF7FFFFF, 2, 0, word(0.0), word(0.0), word(0.0), word(1.0),
                          0, word(0.0), word(0.0), word(0.0), word(1.0), 0x7F800000, 0]
        malformed.append(duplicate_seed)
        malformed.append(valid[:-2])  # missing terminal sentinel
        wrong_terminal_count = list(valid)
        wrong_terminal_count[-1] = 1
        malformed.append(wrong_terminal_count)
        malformed.append([*valid[:-2], word(float("inf")), 1])  # nonzero terminator key count
        malformed.append(streamed_clip_words(1, [2.0], [(float("nan"), [(0, (0.0, 0.0, 0.0, 2.0))])]))
        malformed.append([*streamed_clip_words(1, [2.0]), word(0.0)])  # partial frame header before terminator
        for words in malformed:
            with self.subTest(words=words[:4]):
                with self.assertRaises(ValueError):
                    decode_streamed_clip(words, 1)

    def test_streamed_clip_rejects_duplicate_or_out_of_range_interior_indices(self):
        duplicate = streamed_clip_words(1, [1.0], [(0.0, [
            (0, (0.0, 0.0, 0.0, 1.0)), (0, (0.0, 0.0, 0.0, 1.0)),
        ])])
        outside = streamed_clip_words(1, [1.0], [(0.0, [(1, (0.0, 0.0, 0.0, 1.0))])])
        for words in (duplicate, outside):
            with self.assertRaisesRegex(ValueError, "curve index"):
                decode_streamed_clip(words, 1)

    def test_streamed_curve_classification_uses_interval_polynomial_excursion(self):
        tiny = [
            {"time": 0.0, "value": 0.0, "coefficients": [0.0, 0.0, 1e-4, 0.0]},
            {"time": 0.001, "value": 1e-7, "coefficients": [0.0, 0.0, 0.0, 1e-7]},
        ]
        interior_extremum = [
            {"time": 0.0, "value": 0.0, "coefficients": [0.0, -4.0, 4.0, 0.0]},
            {"time": 1.0, "value": 0.0, "coefficients": [0.0, 0.0, 0.0, 0.0]},
        ]
        stepped = [
            {"time": 0.0, "value": 0.0, "coefficients": [0.0, 0.0, 0.0, 0.0]},
            {"time": 1.0, "value": 1.0, "coefficients": [0.0, 0.0, 0.0, 1.0]},
        ]
        self.assertFalse(_streamed_curve_is_dynamic(tiny))
        self.assertTrue(_streamed_curve_is_dynamic(interior_extremum))
        self.assertTrue(_streamed_curve_is_dynamic(stepped))
        self.assertIsNone(_streamed_curve_is_dynamic([
            {"time": 0.0, "value": 0.0, "coefficients": [0.0, 0.0, 1.0, 0.0]},
            {"time": 1.0, "value": 2.0, "coefficients": [0.0, 0.0, 0.0, 2.0]},
        ]))

    def test_source_trs_samples_include_keys_midpoints_and_cubic_extrema(self):
        track = {
            "bindingKind": "transform",
            "valueClass": "dynamic",
            "property": "translation",
            "componentCurves": [
                {"component": "x", "sourceKind": "streamed", "initialValue": 0.0,
                 "keys": [
                     {"time": 0.0, "value": 0.0, "coefficients": [0.0, -4.0, 4.0, 0.0]},
                     {"time": 1.0, "value": 0.0, "coefficients": [0.0, 0.0, 0.0, 0.0]},
                 ]},
            ],
        }
        samples = _source_trs_samples([track], {
            "translation": [0.0, 0.0, 0.0],
            "rotation": [0.0, 0.0, 0.0, 1.0],
            "scale": [1.0, 1.0, 1.0],
        }, 0.0, 1.0)
        midpoint_rows = [row for row in samples if row["timeSec"] == 0.5]
        self.assertEqual({row["kind"] for row in midpoint_rows}, {"midpoint", "cubic-extremum"})
        self.assertTrue(all(abs(row["translation"][0] + 0.01) < 1e-9 for row in midpoint_rows))
        self.assertEqual(samples[0]["kind"], "key")
        self.assertEqual(samples[-1]["kind"], "key")

    def test_source_trs_samples_reject_unresolved_or_ambiguous_curves(self):
        base = {
            "translation": [0.0, 0.0, 0.0], "rotation": [0.0, 0.0, 0.0, 1.0], "scale": [1.0, 1.0, 1.0],
        }
        unresolved = {"bindingKind": "transform", "valueClass": "unresolved", "property": "translation", "componentCurves": []}
        with self.assertRaisesRegex(ValueError, "not fully resolved"):
            _source_trs_samples([unresolved], base, 0.0, 1.0)
        duplicate = {"bindingKind": "transform", "valueClass": "constant", "property": "translation",
                     "componentCurves": [
                         {"component": "x", "initialValue": 0.0, "keys": []},
                         {"component": "x", "initialValue": 0.0, "keys": []},
                     ]}
        with self.assertRaisesRegex(ValueError, "ambiguous"):
            _source_trs_samples([duplicate], base, 0.0, 1.0)

    def test_streamed_clip_offset_pointer_uses_init_values_for_seed_only_slots(self):
        stream = SimpleNamespace(curveCount=3, data=streamed_clip_words(3, [1.0, 2.0, 3.0]))
        clip_data = SimpleNamespace(
            m_StreamedClip=stream,
            m_DenseClip=SimpleNamespace(m_CurveCount=0, m_FrameCount=0, m_SampleArray=[]),
            m_ConstantClip=SimpleNamespace(data=[]),
        )
        clip = SimpleNamespace(
            m_MuscleClip=SimpleNamespace(m_Clip=SimpleNamespace(data=clip_data)),
            m_ClipBindingConstant=SimpleNamespace(genericBindings=[SimpleNamespace(typeID=4, attribute=1, path=0)]),
        )
        source_reference = {"bundleSha256": "a" * 64, "serializedFile": "CAB", "objectId": "1"}
        tracks, complete, diagnostics = _decode_transform_bindings(
            clip, {0: [{"pathTokens": [], "sourceReference": source_reference}]},
        )
        self.assertTrue(complete)
        self.assertEqual(diagnostics, [])
        self.assertEqual(len(tracks), 1)
        self.assertEqual(tracks[0]["sampleCount"], 3)
        self.assertEqual(tracks[0]["valueClass"], "constant")

    def test_all_generic_bindings_are_retained_as_distinct_tracks(self):
        clip = SimpleNamespace(
            m_MuscleClip=SimpleNamespace(m_Clip=SimpleNamespace(data=SimpleNamespace(
                m_StreamedClip=SimpleNamespace(curveCount=0, data=[0xFF7FFFFF, 0, 0x7F800000, 0]),
                m_DenseClip=SimpleNamespace(m_CurveCount=0, m_FrameCount=0, m_SampleArray=[], m_SampleRate=0, m_BeginTime=0),
                m_ConstantClip=SimpleNamespace(data=[0.0, 0.0, 0.0, 1.0, 1.0, 1.0]),
            )), m_StartTime=0.0, m_StopTime=1.0),
            m_ClipBindingConstant=SimpleNamespace(genericBindings=[
                SimpleNamespace(typeID=4, attribute=1, path=0),
                SimpleNamespace(typeID=4, attribute=3, path=0),
            ]),
        )
        reference = {"bundleSha256": "a" * 64, "serializedFile": "CAB", "objectId": "1"}
        tracks, complete, diagnostics = _decode_transform_bindings(
            clip, {0: [{"pathTokens": [], "sourceReference": reference}]},
        )
        self.assertTrue(complete, diagnostics)
        self.assertEqual(len(tracks), 2)
        self.assertEqual([track["property"] for track in tracks], ["translation", "scale"])
        self.assertTrue(all(len(track["componentCurves"]) == 3 for track in tracks))

    def test_unsupported_streamed_binding_retains_bounded_raw_keys_and_hermite_coefficients(self):
        stream = streamed_clip_words(1, [0.125], [
            (0.0, [(0, (0.0, 0.0, 0.5, 0.0))]),
            (0.5, [(0, (0.0, 0.0, 0.25, 0.5))]),
            (1.0, [(0, (0.0, 0.0, 0.0, 1.0))]),
        ])
        clip = generic_binding_clip(1, 2086281974, streamed_data=stream, streamed_curve_count=1)
        tracks, complete, diagnostics = _decode_transform_bindings(clip, {})

        self.assertEqual(len(tracks), 1)
        track = tracks[0]
        self.assert_generic_binding_remains_unresolved(track, complete, diagnostics)
        self.assertEqual(track["property"], "non-transform")
        raw = track["rawGenericBindingSamples"]
        self.assertEqual(raw["bindingIdentity"], {
            "typeId": 1,
            "attribute": 2086281974,
            "pathHash": 123456789,
        })
        self.assertEqual(raw["sourceKind"], "streamed")
        self.assertTrue(raw["captureComplete"])
        self.assertFalse(raw["truncated"])
        self.assertEqual((raw["sampleCount"], raw["capturedSampleCount"]), (3, 3))
        component = raw["components"][0]
        self.assertEqual(component["slotIndex"], 0)
        self.assertEqual(component["sourceKind"], "streamed")
        self.assertEqual(component["initialValueProvenance"], "streamed-initial-key")
        self.assertEqual(component["initialValue"], 0.125)
        self.assertEqual([sample["time"] for sample in component["keys"]], [0.0, 0.5, 1.0])
        self.assertEqual([sample["value"] for sample in component["keys"]], [0.0, 0.5, 1.0])
        self.assertEqual(component["keys"][1]["coefficients"], [0.0, 0.0, 0.25, 0.5])
        self.assertEqual(component["keys"][1]["timeProvenance"], "streamed-frame-time")
        self.assertEqual(component["keys"][1]["coefficientProvenance"], "streamed-hermite-coefficients")

    def test_unsupported_dense_binding_retains_exact_times_and_initial_provenance(self):
        clip = generic_binding_clip(
            23, 7, dense_count=1, frame_count=3, dense_values=[2.0, -1.0, 4.5],
            dense_rate=2.0, dense_begin_time=0.25,
        )
        tracks, complete, diagnostics = _decode_transform_bindings(clip, {})
        track = tracks[0]
        self.assert_generic_binding_remains_unresolved(track, complete, diagnostics)
        raw = track["rawGenericBindingSamples"]
        self.assertEqual(raw["sourceKind"], "dense")
        self.assertTrue(raw["captureComplete"])
        component = raw["components"][0]
        self.assertEqual(component["initialValue"], 2.0)
        self.assertEqual(component["initialValueProvenance"], "dense-first-frame")
        self.assertEqual([sample["time"] for sample in component["keys"]], [0.25, 0.75, 1.25])
        self.assertEqual([sample["value"] for sample in component["keys"]], [2.0, -1.0, 4.5])
        self.assertTrue(all(sample["coefficients"] is None for sample in component["keys"]))
        self.assertTrue(all(sample["coefficientProvenance"] == "not-present-in-source-kind" for sample in component["keys"]))

    def test_unsupported_constant_binding_retains_clip_start_and_initial_provenance(self):
        clip = generic_binding_clip(95, 19, constant_values=[3.75], clip_start=0.375)
        tracks, complete, diagnostics = _decode_transform_bindings(clip, {})
        track = tracks[0]
        self.assert_generic_binding_remains_unresolved(track, complete, diagnostics)
        raw = track["rawGenericBindingSamples"]
        self.assertEqual(raw["sourceKind"], "constant")
        self.assertTrue(raw["captureComplete"])
        component = raw["components"][0]
        self.assertEqual(component["initialValue"], 3.75)
        self.assertEqual(component["initialValueProvenance"], "constant-curve-value")
        self.assertEqual(component["keys"], [{
            "time": 0.375,
            "value": 3.75,
            "coefficients": None,
            "timeProvenance": "clip-start-time",
            "coefficientProvenance": "not-present-in-source-kind",
        }])

    def test_unsupported_raw_binding_nonfinite_samples_are_omitted_and_marked_incomplete(self):
        clip = generic_binding_clip(
            1, 2086281974, dense_count=1, frame_count=2,
            dense_values=[float("nan"), 2.0], dense_rate=1.0, dense_begin_time=0.0,
        )
        tracks, complete, diagnostics = _decode_transform_bindings(clip, {})
        track = tracks[0]
        self.assert_generic_binding_remains_unresolved(track, complete, diagnostics)
        raw = track["rawGenericBindingSamples"]
        self.assertFalse(raw["captureComplete"])
        self.assertEqual(raw["invalidInitialValueCount"], 1)
        self.assertEqual(raw["invalidSampleCount"], 1)
        self.assertEqual(raw["components"][0]["initialValue"], None)
        self.assertEqual([sample["value"] for sample in raw["components"][0]["keys"]], [2.0])
        json.dumps(raw, allow_nan=False)

    def test_unsupported_raw_binding_nonfinite_dense_times_are_omitted(self):
        clip = generic_binding_clip(
            1, 2086281974, dense_count=1, frame_count=2,
            dense_values=[1.0, 2.0], dense_rate=1.0, dense_begin_time=float("nan"),
        )
        tracks, complete, diagnostics = _decode_transform_bindings(clip, {})
        track = tracks[0]
        self.assert_generic_binding_remains_unresolved(track, complete, diagnostics)
        raw = track["rawGenericBindingSamples"]
        self.assertFalse(raw["captureComplete"])
        self.assertEqual(raw["invalidSampleCount"], 2)
        self.assertEqual(raw["capturedSampleCount"], 0)
        self.assertEqual(raw["components"][0]["keys"], [])
        json.dumps(raw, allow_nan=False)

    def test_unsupported_raw_binding_missing_slot_is_incomplete_not_promoted(self):
        clip = generic_binding_clip(1, 2086281974)
        tracks, complete, diagnostics = _decode_transform_bindings(clip, {})
        track = tracks[0]
        self.assert_generic_binding_remains_unresolved(track, complete, diagnostics)
        raw = track["rawGenericBindingSamples"]
        self.assertFalse(raw["captureComplete"])
        self.assertEqual(raw["sourceKind"], "unresolved")
        self.assertEqual(raw["sampleCount"], 0)
        self.assertEqual(raw["components"][0]["initialValuePresent"], False)
        self.assertEqual(raw["components"][0]["keys"], [])

    def test_empty_raw_generic_binding_capture_is_incomplete(self):
        raw = _raw_generic_binding_samples([], 0, 1, 2086281974, 123456789)
        self.assertFalse(raw["captureComplete"])
        self.assertEqual(raw["sourceKind"], "absent")
        self.assertEqual(raw["sampleCount"], 0)
        self.assertEqual(raw["components"], [])

    def test_unsupported_raw_binding_truncates_at_fixed_cap(self):
        clip = generic_binding_clip(
            1, 2086281974, dense_count=1, frame_count=3,
            dense_values=[1.0, 2.0, 3.0], dense_rate=1.0, dense_begin_time=0.0,
        )
        with patch("chibi_v12_motion_proof_unitypy.MAX_RAW_GENERIC_BINDING_SAMPLES", 2):
            tracks, complete, diagnostics = _decode_transform_bindings(clip, {})
        track = tracks[0]
        self.assert_generic_binding_remains_unresolved(track, complete, diagnostics)
        raw = track["rawGenericBindingSamples"]
        self.assertFalse(raw["captureComplete"])
        self.assertTrue(raw["truncated"])
        self.assertEqual((raw["sampleCount"], raw["capturedSampleCount"]), (3, 2))
        self.assertEqual([sample["value"] for sample in raw["components"][0]["keys"]], [1.0, 2.0])

    def test_unsupported_transform_attribute_retains_raw_slot_without_claiming_property(self):
        clip = generic_binding_clip(4, 99, constant_values=[0.5])
        tracks, complete, diagnostics = _decode_transform_bindings(clip, {})
        track = tracks[0]
        self.assert_generic_binding_remains_unresolved(track, complete, diagnostics)
        self.assertEqual(track["property"], "attribute-99")
        self.assertEqual(track["bindingPathHash"], 123456789)
        self.assertEqual(track["rawGenericBindingSamples"]["components"][0]["keys"][0]["value"], 0.5)

    def test_streamed_clip_without_offset_pointer_data_fails_closed(self):
        clip = SimpleNamespace(
            m_MuscleClip=SimpleNamespace(m_Clip=SimpleNamespace(m_StreamedClip=SimpleNamespace(curveCount=0, data=[]))),
            m_ClipBindingConstant=SimpleNamespace(genericBindings=[]),
        )
        tracks, complete, diagnostics = _decode_transform_bindings(clip, {})
        self.assertFalse(complete)
        self.assertEqual(tracks, [])
        self.assertIn("MUSCLE_CLIP_DATA_MISSING", diagnostics)

    def test_animator_selection_uses_exact_override_clip_and_ignores_controllerless_sibling(self):
        fixture = controller_fixture()
        selected = _select_action_animator(
            [
                ("Cafe_CH0332", fixture["rootAnimator"], fixture["bundleSha256"]),
                ("Cafe_CH0332/HaloRoot/CH0332_Halo", fixture["haloAnimator"], fixture["bundleSha256"]),
            ],
            fixture["actionClip"], fixture["bundles"], fixture["objectFor"],
        )
        self.assertEqual(selected, "Cafe_CH0332")

    def test_animator_selection_returns_exact_controller_graph_and_clip_identity(self):
        fixture = controller_fixture()
        selected = _select_action_animator_evidence(
            [("Cafe_CH0332", fixture["rootAnimator"], fixture["bundleSha256"])],
            fixture["actionClip"], fixture["bundles"], fixture["objectFor"],
        )
        evidence = selected["controllerEvidence"]
        self.assertEqual(selected["transformKey"], "Cafe_CH0332")
        self.assertEqual(selected["matchingAnimatorCount"], 1)
        self.assertEqual(selected["matchingClipCount"], 1)
        self.assertEqual(selected["componentReference"]["objectId"], "1")
        self.assertEqual(selected["controllerReference"]["objectId"], "100")
        self.assertEqual(evidence["effectiveClipReferences"], [fixture["actionClip"]])
        self.assertEqual(len(evidence["controllerReferences"]), 2)
        self.assertEqual(len(evidence["graphSha256"]), 64)

    def test_animator_selection_rejects_two_controllers_bound_to_the_exact_clip(self):
        fixture = controller_fixture()
        duplicate = FakeReader("Animator", {"bundleSha256": "a" * 64, "serializedFile": "CAB-PREFAB", "objectId": "3"}, type("Animator", (), {
            "m_Controller": FakePointer(1, 100),
        })(), [FakeExternal("CAB-OVERRIDE")])
        with self.assertRaisesRegex(ValueError, "exactly one Animator"):
            _select_action_animator(
                [("root", fixture["rootAnimator"], fixture["bundleSha256"]), ("duplicate", duplicate, fixture["bundleSha256"])],
                fixture["actionClip"], fixture["bundles"], fixture["objectFor"],
            )

    def test_animator_selection_fails_closed_on_missing_external_file_entry(self):
        fixture = controller_fixture()
        invalid = FakeReader("Animator", {"bundleSha256": "a" * 64, "serializedFile": "CAB-PREFAB", "objectId": "4"}, type("Animator", (), {
            "m_Controller": FakePointer(2, 100),
        })(), [FakeExternal("CAB-OVERRIDE")])
        with self.assertRaisesRegex(ValueError, "external file reference is invalid"):
            _select_action_animator(
                [("root", invalid, fixture["bundleSha256"])], fixture["actionClip"],
                fixture["bundles"], fixture["objectFor"],
            )

    def test_transform_relation_distinguishes_inside_ancestor_and_disjoint(self):
        def part(name, object_id):
            return {"name": name, "sourceReference": {
                "bundleSha256": "a" * 64, "serializedFile": "CAB", "objectId": str(object_id),
            }}

        root, parent, animator, child, sibling = [part(name, index) for index, name in enumerate(
            ("Root", "Parent", "Animator", "Child", "Sibling"), 1,
        )]
        animator_path = [root, parent, animator]
        self.assertEqual(_path_relation(animator_path + [child], animator_path), "inside-animator-subtree")
        self.assertEqual(_path_relation([root, parent], animator_path), "ancestor-of-animator-root")
        self.assertEqual(_path_relation([root, sibling], animator_path), "disjoint")
        self.assertEqual(_path_relation([part("Other", 99)], animator_path), "unresolved")

    def test_unresolved_float_and_pointer_curves_are_retained(self):
        clip = SimpleNamespace(
            m_FloatCurves=[SimpleNamespace(path="Outside/Unknown", classID=23, attribute=1)],
            m_PPtrCurves=[SimpleNamespace(path="Another/Unknown", classID=23, attribute=2)],
        )
        tracks, complete, diagnostics = _decode_transform_bindings(clip, {})
        self.assertFalse(complete)
        self.assertEqual(len(tracks), 2)
        self.assertTrue(all(track["valueClass"] == "unresolved" for track in tracks))
        self.assertTrue(all(track["sourceTransformReference"] is None for track in tracks))
        self.assertIn("NON_TRANSFORM_RENDERER_CURVE_REQUIRES_REVIEW", diagnostics)

    def test_helper_failure_payload_is_stage_aware_and_never_echoes_unknown_details(self):
        known = helper_failure_payload(ValueError("source inventory bytes differ from the pinned digest"), "source_index_records")
        self.assertEqual(known, {
            "error": "VALUEFAILURE",
            "stage": "source_index_records",
            "message": "SOURCE_INDEX_DIGEST_MISMATCH",
        })
        unknown = helper_failure_payload(ValueError("secret path D:\\private\\bundle.bundle"), "invalid/path")
        self.assertEqual(unknown, {
            "error": "VALUEFAILURE",
            "stage": "request",
            "message": "UNCLASSIFIED_HELPER_FAILURE",
        })

    def test_pinned_inventory_scanner_resolves_exact_clip_inside_identity_closure(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            prefab_bundle_sha = "a" * 64
            clip_bundle_sha = "b" * 64
            inventory = {
                "version": 2,
                "source": str(root),
                "metadataReader": "test-reader-v1",
                "files": [{
                    "path": "AssetBundles/FullPatch.zip",
                    "sha256": "c" * 64,
                    "kind": "archive",
                    "entries": [
                        {
                            "path": "character-test-_mxload-ab-2025-01-01_assets_all_1.bundle",
                            "sha256": prefab_bundle_sha,
                            "metadata": {
                                "serializedFiles": ["CAB-PREFAB"],
                                "dependencies": [{"name": "CAB-CLIPS"}],
                                "containers": [{"path": "Assets/_MX/Characters/test/test.prefab"}],
                                "objects": [],
                            },
                        },
                        {
                            "path": "test-clips.bundle",
                            "sha256": clip_bundle_sha,
                            "metadata": {
                                "serializedFiles": ["CAB-CLIPS"],
                                "dependencies": [],
                                "containers": [],
                                "objects": [{
                                    "type": "AnimationClip", "name": "Walk", "file": "CAB-CLIPS", "pathId": "42",
                                    "sourceReference": {"bundleSha256": clip_bundle_sha, "serializedFile": "CAB-CLIPS", "objectId": "42"},
                                }],
                            },
                        },
                    ],
                }],
            }
            index_path = root / "inventory.raw.json"
            payload = json.dumps(inventory, separators=(",", ":")).encode("utf-8")
            index_path.write_bytes(payload)
            result = resolve_inventory({
                "mode": "resolve-inventory",
                "sourceRoot": str(root),
                "indexPath": str(index_path),
                "inventorySha256": hashlib.sha256(payload).hexdigest(),
                "expectedSource": str(root),
                "expectedMetadataReader": "test-reader-v1",
                "targets": [{"sourceIdentity": "test", "prefabBundleSha256": prefab_bundle_sha, "prefabPath": "Assets/_MX/Characters/test/test.prefab", "clipNames": ["Walk"]}],
            })
            self.assertEqual(result["targets"][0]["clips"]["Walk"][0]["objectId"], "42")
            self.assertEqual(result["bundleDigestRecordCount"], 2)
            self.assertEqual(result["targets"][0]["bundleSha256s"], sorted([prefab_bundle_sha, clip_bundle_sha]))
            self.assertEqual(set(result["bundles"]), {prefab_bundle_sha, clip_bundle_sha})
            self.assertEqual(result["bundles"][prefab_bundle_sha]["serializedFiles"], ["cab-prefab"])

    def test_pinned_inventory_scanner_rejects_wrong_index_digest(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            payload = json.dumps({"version": 2, "source": str(root), "metadataReader": "reader", "files": []}, separators=(",", ":")).encode()
            index_path = root / "inventory.raw.json"
            index_path.write_bytes(payload)
            with self.assertRaisesRegex(ValueError, "pinned digest"):
                resolve_inventory({
                    "mode": "resolve-inventory", "sourceRoot": str(root), "indexPath": str(index_path),
                    "inventorySha256": "0" * 64, "expectedSource": str(root), "expectedMetadataReader": "reader", "targets": [],
                })

    def test_inventory_streaming_counts_each_record_not_the_aggregate_array(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            records = [
                {"path": "one", "nested": [{"text": "braces { } brackets [ ] quote " + chr(34) + " slash " + chr(92) + " newline\nseparator\u2028"}]},
                {"path": "two", "nested": [[1, {"text": "escaped { } " + chr(92) + chr(34) + "quoted" + chr(92) + chr(34) + " newline\nseparator\u2028"}]]},
            ]
            encoded_records = [json.dumps(record, separators=(",", ":")).encode("utf-8") for record in records]
            self.assertTrue(all(len(record) < 128 for record in encoded_records))
            self.assertGreater(sum(map(len, encoded_records)), 128)
            document = {"version": 2, "source": str(root), "metadataReader": "reader", "files": records}
            payload = json.dumps(document, separators=(",", ":")).encode("utf-8")
            self.assertIn(b"\\n", payload)
            self.assertIn(b"\\u2028", payload)
            index_path = root / "inventory.raw.json"
            index_path.write_bytes(payload)
            with patch("chibi_v12_motion_proof_unitypy.MAX_INDEX_RECORD_BYTES", 128), patch("chibi_v12_motion_proof_unitypy.INDEX_CHUNK_BYTES", 64):
                parsed = list(_iter_inventory_file_records(str(index_path), hashlib.sha256(payload).hexdigest()))
            self.assertEqual(parsed, records)

    def test_inventory_streaming_rejects_one_record_over_the_bound(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            document = {"version": 2, "source": str(root), "metadataReader": "reader", "files": [{"path": "large", "payload": "x" * 256}]}
            payload = json.dumps(document, separators=(",", ":")).encode("utf-8")
            index_path = root / "inventory.raw.json"
            index_path.write_bytes(payload)
            with patch("chibi_v12_motion_proof_unitypy.MAX_INDEX_RECORD_BYTES", 128), patch("chibi_v12_motion_proof_unitypy.INDEX_CHUNK_BYTES", 64):
                with self.assertRaisesRegex(ValueError, "record exceeds its bound"):
                    list(_iter_inventory_file_records(str(index_path), hashlib.sha256(payload).hexdigest()))


if __name__ == "__main__":
    unittest.main()
