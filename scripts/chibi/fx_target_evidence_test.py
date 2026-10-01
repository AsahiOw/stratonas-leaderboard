"""Focused tests for exact-PPtr FX component evidence."""

from __future__ import annotations

import pathlib
import sys
import unittest
from types import SimpleNamespace

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from fx_target_evidence import extract_fx_target_evidence  # noqa: E402


BUNDLE_SHA256 = "a" * 64
SERIALIZED_FILE = "CAB-FX"
SCRIPT_FILE = "CAB-SCRIPTS"
SCRIPT_GUID = bytes.fromhex("00112233445566778899aabbccddeeff")
FAKE_ASSET = SimpleNamespace(
    name=SERIALIZED_FILE,
    externals=[SimpleNamespace(name=SCRIPT_FILE, path=SCRIPT_FILE, guid=SCRIPT_GUID)],
)


class FakeUnityObject:
    def __init__(self, path_id: int, type_name: str, tree=None, asset=FAKE_ASSET):
        self.path_id = path_id
        self.type = SimpleNamespace(name=type_name)
        self.assets_file = asset
        self._tree = tree or {}

    def read_typetree(self):
        return self._tree


def _pointer(path_id: int) -> dict[str, int]:
    return {"m_FileID": 0, "m_PathID": path_id}


def _game_object(
    path_id: int,
    name: str,
    transform_id: int,
    child_transform_ids: list[int],
    component_types: list[str],
    *,
    mono_fields: dict | None = None,
    script_pointer: dict[str, int] | None = None,
    asset=FAKE_ASSET,
):
    component_ids = [transform_id, *range(transform_id + 1, transform_id + len(component_types) + 1)]
    components = [{"component": _pointer(component_id)} for component_id in component_ids]
    game_object = FakeUnityObject(path_id, "GameObject", {"m_Name": name, "m_Component": components}, asset)
    transform = FakeUnityObject(
        transform_id,
        "Transform",
        {
            "m_GameObject": _pointer(path_id),
            "m_Father": _pointer(0),
            "m_Children": [_pointer(child_id) for child_id in child_transform_ids],
        },
        asset,
    )
    components = []
    for component_id, component_type in zip(component_ids[1:], component_types):
        tree = None
        if component_type == "MonoBehaviour":
            tree = {
                "m_GameObject": _pointer(path_id),
                "m_Enabled": 1,
                "m_Script": script_pointer or {"m_FileID": 1, "m_PathID": 777},
                **(mono_fields or {}),
            }
        elif component_type == "ParticleSystemRenderer":
            tree = {"m_Mesh": _pointer(0), "m_Materials": []}
        components.append(FakeUnityObject(component_id, component_type, tree, asset))
    return [game_object, transform, *components]


def _context(path_id: int):
    return {
        "target": {"file": SERIALIZED_FILE, "pathId": str(path_id)},
        "targetReference": {
            "bundleSha256": BUNDLE_SHA256,
            "serializedFile": SERIALIZED_FILE,
            "objectId": str(path_id),
        },
    }


class FxTargetEvidenceTests(unittest.TestCase):
    def test_accepts_fully_traversed_nested_particle_only_hierarchy(self):
        objects = []
        objects.extend(_game_object(100, "FxRoot", 101, [201], ["ParticleSystem", "ParticleSystemRenderer"]))
        objects.extend(_game_object(200, "FxChild", 201, [], ["ParticleSystem", "ParticleSystemRenderer"]))
        environment = SimpleNamespace(objects=objects)

        result = extract_fx_target_evidence(environment, _context(100), BUNDLE_SHA256)

        self.assertTrue(result["completeTraversal"])
        self.assertEqual(result["classification"], "particle-only")
        self.assertTrue(result["acceptedPresentationFx"])
        self.assertEqual(result["gameObjectCount"], 2)
        self.assertEqual(result["componentTypeCounts"], {
            "ParticleSystem": 2,
            "ParticleSystemRenderer": 2,
            "Transform": 2,
        })

    def test_rejects_mixed_particle_and_core_renderer_tree(self):
        objects = []
        objects.extend(_game_object(100, "FxRoot", 101, [201], ["ParticleSystem"]))
        objects.extend(_game_object(200, "FxChild", 201, [], ["MeshFilter", "MeshRenderer"]))
        environment = SimpleNamespace(objects=objects)

        result = extract_fx_target_evidence(environment, _context(100), BUNDLE_SHA256)

        self.assertTrue(result["completeTraversal"])
        self.assertEqual(result["classification"], "mixed")
        self.assertFalse(result["acceptedPresentationFx"])
        self.assertEqual(result["coreComponentTypes"], ["MeshFilter", "MeshRenderer"])

    def test_missing_exact_target_is_not_inferred_from_names(self):
        environment = SimpleNamespace(objects=[])

        result = extract_fx_target_evidence(environment, _context(100), BUNDLE_SHA256)

        self.assertFalse(result["completeTraversal"])
        self.assertEqual(result["classification"], "missing")
        self.assertFalse(result["acceptedPresentationFx"])

    def test_null_target_is_fail_closed(self):
        context = {"target": {"file": SERIALIZED_FILE, "pathId": "0"}, "targetReference": None}

        result = extract_fx_target_evidence(SimpleNamespace(objects=[]), context, BUNDLE_SHA256)

        self.assertFalse(result["completeTraversal"])
        self.assertEqual(result["classification"], "missing")
        self.assertFalse(result["acceptedPresentationFx"])

    def test_unknown_component_and_unresolved_child_both_fail_closed(self):
        unknown_objects = _game_object(100, "FxRoot", 101, [], ["MonoBehaviour"])
        unknown_result = extract_fx_target_evidence(
            SimpleNamespace(objects=unknown_objects), _context(100), BUNDLE_SHA256
        )
        self.assertTrue(unknown_result["completeTraversal"])
        self.assertEqual(unknown_result["classification"], "unknown")
        self.assertFalse(unknown_result["acceptedPresentationFx"])

        incomplete_objects = _game_object(100, "FxRoot", 101, [999], [])
        incomplete_result = extract_fx_target_evidence(
            SimpleNamespace(objects=incomplete_objects), _context(100), BUNDLE_SHA256
        )
        self.assertFalse(incomplete_result["completeTraversal"])
        self.assertEqual(incomplete_result["classification"], "incomplete")
        self.assertFalse(incomplete_result["acceptedPresentationFx"])

    def test_records_exact_script_identity_and_custom_field_pptrs(self):
        objects = _game_object(
            100,
            "FxRoot",
            101,
            [],
            ["MonoBehaviour"],
            mono_fields={
                "LifeMode": 1,
                "targetCamera": {"m_FileID": 0, "m_PathID": 0},
                "nested": {"object": {"m_FileID": 1, "m_PathID": 888}},
            },
        )

        result = extract_fx_target_evidence(SimpleNamespace(objects=objects), _context(100), BUNDLE_SHA256)

        self.assertTrue(result["completeTraversal"])
        self.assertEqual(result["classification"], "unknown")
        self.assertFalse(result["acceptedPresentationFx"])
        self.assertEqual(len(result["monoBehaviours"]), 1)
        mono = result["monoBehaviours"][0]
        self.assertEqual(mono["componentIdentity"], {
            "serializedFile": SERIALIZED_FILE,
            "pathId": "102",
            "type": "MonoBehaviour",
        })
        self.assertEqual(mono["scriptPPtr"], {
            "fileID": 1,
            "serializedFile": SCRIPT_FILE,
            "pathId": "777",
            "externalGuid": "00112233445566778899aabbccddeeff",
            "identityResolved": True,
            "objectResolved": False,
            "resolution": "external-identity-only",
        })
        self.assertEqual(mono["serializedFieldNames"], ["LifeMode", "nested", "targetCamera"])
        self.assertEqual(
            [(ref["fieldPath"], ref["pathId"], ref["identityResolved"]) for ref in mono["serializedFieldPPtrs"]],
            [("nested.object", "888", True), ("targetCamera", "0", True)],
        )
        self.assertEqual(mono["serializedFieldPPtrs"][0]["serializedFile"], SCRIPT_FILE)
        self.assertEqual(mono["serializedFieldPPtrs"][1]["resolution"], "null")

    def test_sorts_monobehaviour_component_identity(self):
        objects = _game_object(100, "FxRoot", 101, [], ["MonoBehaviour", "MonoBehaviour"])
        objects[0]._tree["m_Component"].reverse()

        result = extract_fx_target_evidence(SimpleNamespace(objects=objects), _context(100), BUNDLE_SHA256)

        self.assertEqual(
            [mono["componentIdentity"]["pathId"] for mono in result["monoBehaviours"]],
            ["102", "103"],
        )
        self.assertFalse(result["acceptedPresentationFx"])

    def test_malformed_or_unresolved_script_pointer_fails_closed(self):
        malformed_cases = [
            {"m_FileID": 2, "m_PathID": 777},
            {"m_FileID": 1, "m_PathID": 0},
            {"m_FileID": 0, "m_PathID": 999},
            {"m_FileID": 1},
        ]
        for script_pointer in malformed_cases:
            with self.subTest(script_pointer=script_pointer):
                objects = _game_object(
                    100, "FxRoot", 101, [], ["MonoBehaviour"], script_pointer=script_pointer
                )
                result = extract_fx_target_evidence(SimpleNamespace(objects=objects), _context(100), BUNDLE_SHA256)
                self.assertFalse(result["completeTraversal"])
                self.assertEqual(result["classification"], "incomplete")
                self.assertFalse(result["acceptedPresentationFx"])
                self.assertFalse(result["monoBehaviours"][0]["scriptPPtr"]["identityResolved"])

    def test_rejects_bundle_or_pointer_context_mismatch(self):
        objects = _game_object(100, "FxRoot", 101, [], ["ParticleSystem"])
        wrong_digest = extract_fx_target_evidence(
            SimpleNamespace(objects=objects), _context(100), "b" * 64
        )
        wrong_pointer = _context(100)
        wrong_pointer["targetReference"]["objectId"] = "101"
        wrong_source = extract_fx_target_evidence(
            SimpleNamespace(objects=objects), wrong_pointer, BUNDLE_SHA256
        )

        self.assertEqual(wrong_digest["classification"], "ambiguous")
        self.assertFalse(wrong_digest["acceptedPresentationFx"])
        self.assertEqual(wrong_source["classification"], "ambiguous")
        self.assertFalse(wrong_source["acceptedPresentationFx"])

    def test_accepts_exact_pinned_script_on_complete_particle_only_graph(self):
        script_asset = SimpleNamespace(
            name=SERIALIZED_FILE,
            externals=[SimpleNamespace(
                name="CAB-4e374e23f1bd4e7218b8fbcbec01546f",
                path="CAB-4e374e23f1bd4e7218b8fbcbec01546f",
                guid=bytes(16),
            )],
        )
        objects = _game_object(
            100, "FxRoot", 101, [], ["ParticleSystem", "ParticleSystemRenderer", "MonoBehaviour"],
            mono_fields={"LifeMode": 1, "TimerTypeDuration": 8.0, "ParentIndex": 9},
            script_pointer={"m_FileID": 1, "m_PathID": 460590081893560622}, asset=script_asset,
        )

        result = extract_fx_target_evidence(SimpleNamespace(objects=objects), _context(100), BUNDLE_SHA256)

        self.assertEqual(result["classification"], "unknown")
        self.assertTrue(result["completeTraversal"])
        self.assertTrue(result["rendererAssetEvidenceComplete"])
        self.assertTrue(result["monoScriptPolicyComplete"])
        self.assertTrue(result["targetGraphEligible"])
        self.assertEqual(result["approvedMonoScriptReferences"], [{
            "bundleSha256": "e1fb78acaa16173dcf2e50f28bc43d8e18ddbdc0717f89a892b0ce6eac9dec29",
            "serializedFile": "CAB-4e374e23f1bd4e7218b8fbcbec01546f",
            "objectId": "460590081893560622",
        }])
        self.assertEqual(len(result["gameObjectReferences"]), 1)
        self.assertEqual(len(result["transformReferences"]), 1)
        self.assertEqual(len(result["rendererAssets"]), 1)

    def test_wrong_script_identity_or_field_schema_fails_closed(self):
        script_asset = SimpleNamespace(
            name=SERIALIZED_FILE,
            externals=[SimpleNamespace(
                name="CAB-4e374e23f1bd4e7218b8fbcbec01546f",
                path="CAB-4e374e23f1bd4e7218b8fbcbec01546f",
                guid=bytes(16),
            )],
        )
        wrong_path = _game_object(
            100, "FxRoot", 101, [], ["ParticleSystem", "ParticleSystemRenderer", "MonoBehaviour"],
            mono_fields={"LifeMode": 1, "TimerTypeDuration": 8.0, "ParentIndex": 9},
            script_pointer={"m_FileID": 1, "m_PathID": 12345}, asset=script_asset,
        )
        wrong_schema = _game_object(
            200, "FxRoot", 201, [], ["ParticleSystem", "ParticleSystemRenderer", "MonoBehaviour"],
            mono_fields={"LifeMode": 1, "TimerTypeDuration": 8.0, "ParentIndex": 9, "extra": 1},
            script_pointer={"m_FileID": 1, "m_PathID": 460590081893560622}, asset=script_asset,
        )

        wrong_path_result = extract_fx_target_evidence(SimpleNamespace(objects=wrong_path), _context(100), BUNDLE_SHA256)
        wrong_schema_result = extract_fx_target_evidence(SimpleNamespace(objects=wrong_schema), _context(200), BUNDLE_SHA256)

        self.assertFalse(wrong_path_result["targetGraphEligible"])
        self.assertFalse(wrong_path_result["monoScriptPolicyComplete"])
        self.assertFalse(wrong_schema_result["targetGraphEligible"])
        self.assertFalse(wrong_schema_result["monoScriptPolicyComplete"])

    def test_fx_billboard_allows_only_its_census_null_camera_pointer(self):
        script_asset = SimpleNamespace(
            name=SERIALIZED_FILE,
            externals=[SimpleNamespace(
                name="CAB-4e374e23f1bd4e7218b8fbcbec01546f",
                path="CAB-4e374e23f1bd4e7218b8fbcbec01546f",
                guid=bytes(16),
            )],
        )
        objects = _game_object(
            100, "FxRoot", 101, [], ["ParticleSystem", "ParticleSystemRenderer", "MonoBehaviour"],
            mono_fields={"FixedY": 1, "cameraFindMode": 0, "targetCamera": _pointer(0)},
            script_pointer={"m_FileID": 1, "m_PathID": -529717931869727251}, asset=script_asset,
        )

        result = extract_fx_target_evidence(SimpleNamespace(objects=objects), _context(100), BUNDLE_SHA256)

        self.assertTrue(result["targetGraphEligible"])
        self.assertEqual(result["approvedMonoScriptReferences"][0]["objectId"], "-529717931869727251")


if __name__ == "__main__":
    unittest.main()
