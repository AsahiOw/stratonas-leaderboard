#!/usr/bin/env python3
"""Fail-closed component evidence for an exact Unity FX target PPtr.

The caller must load the supplied UnityPy environment from bytes whose SHA-256
it has verified, then pass that digest as ``loaded_bundle_sha256``.  The
``target`` and ``targetReference`` fields use the inventory.py pointer schema;
names are recorded only as evidence and never used to resolve an object.
"""

from __future__ import annotations

import re
from collections import Counter
from collections.abc import Mapping
from pathlib import PurePosixPath


_SHA256_RE = re.compile(r"^[0-9a-fA-F]{64}$")
_TRANSFORM_TYPES = {"Transform", "RectTransform"}
_PARTICLE_TYPES = {"ParticleSystem", "ParticleSystemRenderer"}
_CORE_TYPES = {
    "MeshFilter",
    "MeshRenderer",
    "SkinnedMeshRenderer",
    "SpriteRenderer",
    "LineRenderer",
    "TrailRenderer",
}
_STRUCTURAL_TYPES = _TRANSFORM_TYPES | {"GameObject"}
_MONOBEHAVIOUR_BASE_FIELDS = {
    "m_CorrespondingSourceObject",
    "m_EditorClassIdentifier",
    "m_EditorHideFlags",
    "m_Enabled",
    "m_GameObject",
    "m_Name",
    "m_PrefabAsset",
    "m_PrefabInstance",
    "m_Script",
}

# Read-only v12 source census: the exact MonoScript objects referenced by the
# 267 complete InstantiateFx target graphs.  A class name alone never grants
# this policy; both the prefab PPtr and this pinned script source identity must
# match.  The DLL implementation is unavailable, so this policy is limited to
# excluding complete particle-only target graphs and never infers callbacks.
FX_MONOSCRIPT_BUNDLE_SHA256 = "e1fb78acaa16173dcf2e50f28bc43d8e18ddbdc0717f89a892b0ce6eac9dec29"
FX_MONOSCRIPT_SERIALIZED_FILE = "CAB-4e374e23f1bd4e7218b8fbcbec01546f"
FX_MONOSCRIPT_EXTERNAL_GUID = "00000000000000000000000000000000"
FX_TARGET_POLICY_VERSION = "chibi-particle-only-instantiate-fx-v1"
_APPROVED_MONOSCRIPTS = {
    "460590081893560622": {
        "class": "CharacterAnimationEventEffect",
        "fields": {"LifeMode", "TimerTypeDuration", "ParentIndex"},
    },
    "-529717931869727251": {
        "class": "FxBillboard",
        "fields": {"FixedY", "cameraFindMode", "targetCamera"},
        "nullFields": {"targetCamera"},
    },
    "4955142931926258075": {
        "class": "FxParticleMixCharLightColor",
        "fields": {
            "customInfo", "lifetimeInfo", "mixColorBySpeed", "mixColorOverLifetime",
            "mixCustomData", "mixStartColor", "speedInfo", "startColorInfo",
        },
    },
}


def _field(value, name, default=None):
    if isinstance(value, Mapping):
        return value.get(name, default)
    return getattr(value, name, default)


def _object_type(obj):
    value = _field(obj, "type")
    name = _field(value, "name")
    return str(name or "")


def _path_id(value):
    if isinstance(value, bool):
        raise ValueError("boolean is not a Unity path ID")
    result = int(value)
    return result


def _asset_name(asset):
    return str(_field(asset, "name", "") or "")


def _pointer_parts(pointer):
    if pointer is None:
        return None
    if isinstance(pointer, Mapping):
        file_id = pointer.get("m_FileID", pointer.get("file_id", 0))
        path_id = pointer.get("m_PathID", pointer.get("path_id", 0))
    else:
        file_id = _field(pointer, "file_id", _field(pointer, "m_FileID", 0))
        path_id = _field(pointer, "path_id", _field(pointer, "m_PathID", 0))
    try:
        return int(file_id or 0), _path_id(path_id or 0)
    except (TypeError, ValueError, OverflowError):
        return None


def _target_context(context, loaded_bundle_sha256):
    """Validate the inventory PPtr/source identity before resolving anything."""
    if not isinstance(context, Mapping):
        return None, None, "target context is not an object"
    target = context.get("target")
    if target is None:
        return None, None, "target PPtr is null"
    if not isinstance(target, Mapping):
        return None, None, "target PPtr is malformed"
    try:
        target_path_id = _path_id(target.get("pathId", target.get("m_PathID")))
    except (TypeError, ValueError, OverflowError):
        return None, None, "target PPtr path ID is invalid"
    if target_path_id == 0:
        return None, None, "target PPtr is null"
    target_file = str(target.get("file", "") or "")
    if not target_file:
        return None, None, "target PPtr serialized file is missing"

    reference = context.get("targetReference")
    if not isinstance(reference, Mapping):
        return None, None, "exact target source reference is missing"
    try:
        reference_path_id = _path_id(reference.get("objectId"))
    except (TypeError, ValueError, OverflowError):
        return None, None, "target source object ID is invalid"
    reference_file = str(reference.get("serializedFile", "") or "")
    reference_sha = str(reference.get("bundleSha256", "") or "")
    loaded_sha = str(loaded_bundle_sha256 or "")
    if not reference_file or reference_file != target_file or reference_path_id != target_path_id:
        return None, None, "PPtr does not match its exact source reference"
    if not _SHA256_RE.fullmatch(reference_sha) or not _SHA256_RE.fullmatch(loaded_sha):
        return None, None, "bundle SHA-256 context is missing or invalid"
    if reference_sha.lower() != loaded_sha.lower():
        return None, None, "loaded bundle SHA-256 does not match target source reference"

    normalized_target = {
        "file": target_file,
        "pathId": str(target_path_id),
    }
    if target.get("externalGuid"):
        normalized_target["externalGuid"] = str(target["externalGuid"]).replace("-", "").lower()
    normalized_reference = {
        "bundleSha256": reference_sha.lower(),
        "serializedFile": reference_file,
        "objectId": str(reference_path_id),
    }
    return normalized_target, normalized_reference, None


def _empty_result(target, reference, classification, reason):
    return {
        "schemaVersion": 1,
        "target": target,
        "targetReference": reference,
        "rootType": None,
        "rootName": None,
        "completeTraversal": False,
        "classification": classification,
        "acceptedPresentationFx": False,
        "gameObjectCount": 0,
        "componentTypeCounts": {},
        "rendererTypeCounts": {},
        "monoBehaviours": [],
        "gameObjectReferences": [],
        "transformReferences": [],
        "componentReferences": [],
        "rendererAssets": [],
        "rendererAssetEvidenceComplete": False,
        "particleComponentTypes": [],
        "coreComponentTypes": [],
        "unknownComponentTypes": [],
        "approvedMonoScriptReferences": [],
        "monoScriptPolicyComplete": False,
        "targetGraphPolicyVersion": FX_TARGET_POLICY_VERSION,
        "targetGraphEligible": False,
        "targetGraphEvidence": [],
        "reasons": [reason],
    }


def _object_index(environment):
    index = {}
    for obj in getattr(environment, "objects", ()):
        asset = _field(obj, "assets_file")
        file_name = _asset_name(asset)
        try:
            path_id = _path_id(_field(obj, "path_id", _field(obj, "m_PathID")))
        except (TypeError, ValueError, OverflowError):
            continue
        if file_name:
            index.setdefault((file_name, path_id), []).append(obj)
    return index


def _resolve_pointer(pointer, owner_asset, objects):
    parts = _pointer_parts(pointer)
    if not parts:
        return None, "malformed or null hierarchy PPtr"
    file_id, path_id = parts
    if path_id == 0:
        return None, "null hierarchy PPtr"
    file_name = _asset_name(owner_asset)
    if file_id:
        externals = getattr(owner_asset, "externals", ()) or ()
        if file_id < 0 or file_id > len(externals):
            return None, "hierarchy PPtr file ID is outside the external table"
        external = externals[file_id - 1]
        file_name = str(_field(external, "name", "") or "")
        if not file_name:
            file_name = PurePosixPath(str(_field(external, "path", "") or "").replace("\\", "/")).name
    if not file_name:
        return None, "hierarchy PPtr has no serialized file identity"
    matches = objects.get((file_name, path_id), [])
    if not matches:
        return None, "hierarchy PPtr target is not present in the loaded bundle"
    if len(matches) != 1:
        return None, "hierarchy PPtr target is ambiguous in the loaded bundle"
    return matches[0], None


def _read_tree(obj):
    reader = _field(obj, "read_typetree")
    if not callable(reader):
        raise ValueError("Unity object has no typetree reader")
    value = reader()
    if not isinstance(value, Mapping):
        raise ValueError("Unity object typetree is not an object")
    return value


def _component_pointer(entry):
    if isinstance(entry, Mapping) and "component" in entry:
        return entry["component"]
    return entry


def _pointer_identity(pointer, owner_asset, objects, *, script_pointer=False):
    """Resolve PPtr fileID through its source external table, never by name hints."""
    if isinstance(pointer, Mapping):
        has_file_id = "m_FileID" in pointer or "file_id" in pointer
        has_path_id = "m_PathID" in pointer or "path_id" in pointer
    else:
        has_file_id = hasattr(pointer, "file_id") or hasattr(pointer, "m_FileID")
        has_path_id = hasattr(pointer, "path_id") or hasattr(pointer, "m_PathID")
    if pointer is None or not has_file_id or not has_path_id:
        return {"identityResolved": False, "objectResolved": False, "resolution": "malformed"}, "PPtr is missing or malformed"
    parts = _pointer_parts(pointer)
    if parts is None:
        return {"identityResolved": False, "objectResolved": False, "resolution": "malformed"}, "PPtr fileID or pathID is invalid"
    file_id, path_id = parts
    file_name = _asset_name(owner_asset)
    external_guid = None
    if file_id < 0:
        return {
            "fileID": file_id, "serializedFile": None, "pathId": str(path_id),
            "externalGuid": None, "identityResolved": False, "objectResolved": False,
            "resolution": "invalid-file-id",
        }, "PPtr fileID is negative"
    if file_id:
        externals = getattr(owner_asset, "externals", ()) or ()
        if file_id > len(externals):
            return {
                "fileID": file_id, "serializedFile": None, "pathId": str(path_id),
                "externalGuid": None, "identityResolved": False, "objectResolved": False,
                "resolution": "external-out-of-range",
            }, "PPtr fileID is outside the external table"
        external = externals[file_id - 1]
        file_name = str(_field(external, "name", "") or "")
        if not file_name:
            file_name = PurePosixPath(str(_field(external, "path", "") or "").replace("\\", "/")).name
        raw_guid = _field(external, "guid")
        if isinstance(raw_guid, (bytes, bytearray, memoryview)):
            external_guid = bytes(raw_guid).hex().lower()
        elif raw_guid:
            external_guid = str(raw_guid).replace("-", "").lower()
    if not file_name:
        return {
            "fileID": file_id, "serializedFile": None, "pathId": str(path_id),
            "externalGuid": external_guid, "identityResolved": False, "objectResolved": False,
            "resolution": "missing-serialized-file",
        }, "PPtr has no serialized-file identity"

    identity = {
        "fileID": file_id,
        "serializedFile": file_name,
        "pathId": str(path_id),
        "externalGuid": external_guid,
        "identityResolved": True,
        "objectResolved": False,
        "resolution": "null" if path_id == 0 else "external-identity-only" if file_id else "local-object-missing",
    }
    if path_id == 0:
        if script_pointer:
            identity["identityResolved"] = False
            identity["resolution"] = "null-script-pointer"
            return identity, "MonoBehaviour m_Script PPtr is null"
        return identity, None

    matches = objects.get((file_name, path_id), [])
    if len(matches) > 1:
        identity["identityResolved"] = False
        identity["resolution"] = "ambiguous-object"
        return identity, "PPtr target is ambiguous in the loaded bundle"
    if not matches:
        if file_id:
            # The exact external serialized-file/pathID identity is known from
            # the PPtr table, even when that external asset was not loaded here.
            return identity, None
        if script_pointer:
            identity["identityResolved"] = False
            return identity, "local MonoScript PPtr target is absent from the loaded bundle"
        identity["identityResolved"] = False
        return identity, "local PPtr target is absent from the loaded bundle"

    resolved_type = _object_type(matches[0])
    identity["objectResolved"] = True
    identity["resolvedObjectType"] = resolved_type
    identity["resolution"] = "loaded-object"
    if script_pointer and resolved_type != "MonoScript":
        identity["identityResolved"] = False
        identity["resolution"] = "wrong-script-target-type"
        return identity, "MonoBehaviour m_Script PPtr resolves to a non-MonoScript object"
    return identity, None


def _serialized_field_pointers(value, asset, objects, field_path=""):
    """Return exact PPtr identities found inside serialized custom fields."""
    references = []
    errors = []
    if isinstance(value, Mapping):
        if "m_FileID" in value or "file_id" in value or "m_PathID" in value or "path_id" in value:
            identity, error = _pointer_identity(value, asset, objects)
            identity["fieldPath"] = field_path
            references.append(identity)
            if error:
                errors.append(f"{field_path or '<root>'}: {error}")
            return references, errors
        for key in sorted(value, key=str):
            child_path = f"{field_path}.{key}" if field_path else str(key)
            child_refs, child_errors = _serialized_field_pointers(value[key], asset, objects, child_path)
            references.extend(child_refs)
            errors.extend(child_errors)
    elif isinstance(value, (list, tuple)):
        for index, child in enumerate(value):
            child_path = f"{field_path}[{index}]"
            child_refs, child_errors = _serialized_field_pointers(child, asset, objects, child_path)
            references.extend(child_refs)
            errors.extend(child_errors)
    references.sort(key=lambda item: (item.get("fieldPath", ""), item.get("serializedFile") or "", item.get("pathId", "")))
    return references, errors


def _source_reference(bundle_sha256, serialized_file, object_id):
    return {
        "bundleSha256": str(bundle_sha256).lower(),
        "serializedFile": str(serialized_file),
        "objectId": str(object_id),
    }


def _object_reference(obj, bundle_sha256):
    asset = _field(obj, "assets_file")
    try:
        object_id = _path_id(_field(obj, "path_id", _field(obj, "m_PathID")))
    except (TypeError, ValueError, OverflowError):
        return None
    serialized_file = _asset_name(asset)
    if not serialized_file:
        return None
    return _source_reference(bundle_sha256, serialized_file, object_id)


def _renderer_asset_pointer(pointer, owner_asset, objects, bundle_sha256):
    identity, error = _pointer_identity(pointer, owner_asset, objects)
    if error:
        return None, error
    file_name = identity.get("serializedFile")
    path_id = identity.get("pathId")
    source = None
    if identity.get("fileID") == 0 and identity.get("identityResolved") and path_id not in (None, "0"):
        source = _source_reference(bundle_sha256, file_name, path_id)
    return {
        "pointer": {
            "file": file_name,
            "pathId": path_id,
            **({"externalGuid": identity["externalGuid"]} if identity.get("externalGuid") else {}),
        },
        "fileID": identity.get("fileID"),
        "identityResolved": bool(identity.get("identityResolved")),
        "objectResolved": bool(identity.get("objectResolved")),
        "sourceReference": source,
    }, None


def _shader_pointer_for_material(material_evidence, objects, bundle_sha256):
    """Resolve a material's shader PPtr when the exact material object is loaded."""
    material_reference = material_evidence.get("sourceReference") if isinstance(material_evidence, Mapping) else None
    if not isinstance(material_reference, Mapping):
        return {"status": "material-object-unresolved", "shader": None}
    try:
        material_key = (str(material_reference["serializedFile"]), _path_id(material_reference["objectId"]))
    except (KeyError, TypeError, ValueError, OverflowError):
        return {"status": "material-reference-malformed", "shader": None}
    matches = objects.get(material_key, [])
    if len(matches) != 1:
        return {"status": "material-object-ambiguous" if matches else "material-object-unresolved", "shader": None}
    try:
        tree = _read_tree(matches[0])
    except Exception as error:
        return {"status": f"material-typetree-unreadable:{type(error).__name__}", "shader": None}
    if "m_Shader" not in tree:
        return {"status": "shader-field-missing", "shader": None}
    shader, error = _renderer_asset_pointer(
        tree["m_Shader"], _field(matches[0], "assets_file"), objects, bundle_sha256,
    )
    return {"status": "resolved" if error is None else "shader-pointer-unresolved", "shader": shader}


def _approved_script_reference(monobehaviour):
    pointer = monobehaviour.get("scriptPPtr")
    if not isinstance(pointer, Mapping):
        return None
    if (pointer.get("fileID") != 1
            or pointer.get("serializedFile") != FX_MONOSCRIPT_SERIALIZED_FILE
            or pointer.get("externalGuid") != FX_MONOSCRIPT_EXTERNAL_GUID
            or pointer.get("identityResolved") is not True):
        return None
    path_id = str(pointer.get("pathId", ""))
    approved = _APPROVED_MONOSCRIPTS.get(path_id)
    if not approved:
        return None
    if set(monobehaviour.get("serializedFieldNames", [])) != approved["fields"]:
        return None
    null_fields = approved.get("nullFields", set())
    pptrs = monobehaviour.get("serializedFieldPPtrs", [])
    seen_null_fields = set()
    for reference in pptrs:
        field_path = str(reference.get("fieldPath", ""))
        if (not reference.get("identityResolved")
                or reference.get("pathId") != "0"
                or field_path not in null_fields):
            return None
        seen_null_fields.add(field_path)
    if seen_null_fields != null_fields:
        return None
    return _source_reference(
        FX_MONOSCRIPT_BUNDLE_SHA256,
        FX_MONOSCRIPT_SERIALIZED_FILE,
        path_id,
    )


def extract_fx_target_evidence(environment, context, loaded_bundle_sha256, *, include_subtree_inventory=False):
    """Summarize one exact FX prefab root and its complete Transform subtree.

    ``context`` must contain the inventory fields ``target`` (the resolved
    exact PPtr file/pathId) and ``targetReference`` (bundleSha256,
    serializedFile, objectId).  ``loaded_bundle_sha256`` must be the digest of
    the same bytes from which ``environment`` was loaded.

    Only a fully traversed tree with ParticleSystemRenderer content, no core or
    unknown components other than MonoBehaviour, and exact source-pinned
    MonoScript identities/field schemas is accepted as presentation-only.
    Missing, ambiguous, incomplete, mixed/core, and unapproved-script trees
    fail closed.  The pinned script identities do not imply runtime behavior.
    """
    target, reference, context_error = _target_context(context, loaded_bundle_sha256)
    if context_error:
        classification = "missing" if "null" in context_error else "ambiguous"
        return _empty_result(target, reference, classification, context_error)

    objects = _object_index(environment)
    root_key = (target["file"], int(target["pathId"]))
    roots = objects.get(root_key, [])
    if not roots:
        return _empty_result(target, reference, "missing", "exact target object is absent from loaded bundle")
    if len(roots) != 1:
        return _empty_result(target, reference, "ambiguous", "exact target object is duplicated in loaded bundle")
    root = roots[0]
    root_type = _object_type(root)
    if root_type != "GameObject":
        result = _empty_result(target, reference, "unknown", f"target root type is {root_type or 'unavailable'}, not GameObject")
        result["rootType"] = root_type or None
        return result

    component_counts = Counter()
    mono_behaviours = []
    game_object_references = []
    transform_references = []
    component_references = []
    renderer_assets = []
    subtree_nodes = []
    subtree_renderer_evidence_complete = True
    subtree_renderer_count = 0
    subtree_material_count = 0
    subtree_shader_pointer_count = 0
    subtree_shader_resolved_count = 0
    renderer_asset_evidence_complete = True
    visited_game_objects = set()
    visited_transforms = set()
    reasons = set()
    root_name = None
    complete = True

    def mark_incomplete(reason):
        nonlocal complete
        complete = False
        reasons.add(reason)

    def visit_game_object(obj, key):
        nonlocal root_name, subtree_renderer_evidence_complete, subtree_renderer_count
        nonlocal subtree_material_count, subtree_shader_pointer_count, subtree_shader_resolved_count
        if key in visited_game_objects:
            mark_incomplete("GameObject cycle or duplicate child reference detected")
            return
        visited_game_objects.add(key)
        game_object_reference = _object_reference(obj, loaded_bundle_sha256)
        if game_object_reference is None:
            mark_incomplete("GameObject source identity is unavailable")
        else:
            game_object_references.append(game_object_reference)
        try:
            tree = _read_tree(obj)
        except Exception as error:
            mark_incomplete(f"GameObject typetree could not be read: {type(error).__name__}")
            return
        if key == root_key:
            root_name = str(tree.get("m_Name", "") or "") or None
        components = tree.get("m_Component")
        if not isinstance(components, (list, tuple)):
            mark_incomplete("GameObject component list is missing or malformed")
            return

        transforms = []
        seen_components = set()
        subtree_components = []
        for serialized_component_index, entry in enumerate(components):
            pointer = _component_pointer(entry)
            component, error = _resolve_pointer(pointer, _field(obj, "assets_file"), objects)
            if error:
                mark_incomplete(error)
                continue
            component_key = (_asset_name(_field(component, "assets_file")), _path_id(_field(component, "path_id", _field(component, "m_PathID"))))
            if component_key in seen_components:
                mark_incomplete("duplicate component reference on GameObject")
                continue
            seen_components.add(component_key)
            component_type = _object_type(component)
            if not component_type:
                mark_incomplete("component type is unavailable")
                continue
            component_counts[component_type] += 1
            component_reference = _object_reference(component, loaded_bundle_sha256)
            if component_reference is None:
                mark_incomplete("component source identity is unavailable")
            else:
                component_references.append({"sourceReference": component_reference, "type": component_type})
            if component_type == "ParticleSystemRenderer":
                try:
                    renderer_tree = _read_tree(component)
                except Exception as error:
                    renderer_asset_evidence_complete = False
                    reasons.add(f"ParticleSystemRenderer typetree could not be read: {type(error).__name__}")
                    renderer_tree = {}
                mesh = None
                materials = []
                if "m_Mesh" not in renderer_tree:
                    renderer_asset_evidence_complete = False
                    reasons.add("ParticleSystemRenderer mesh PPtr field is missing")
                else:
                    mesh, mesh_error = _renderer_asset_pointer(
                        renderer_tree.get("m_Mesh"), _field(component, "assets_file"), objects, loaded_bundle_sha256
                    )
                    if mesh_error:
                        renderer_asset_evidence_complete = False
                        reasons.add(f"ParticleSystemRenderer mesh PPtr is unresolved: {mesh_error}")
                raw_materials = renderer_tree.get("m_Materials")
                if not isinstance(raw_materials, (list, tuple)):
                    renderer_asset_evidence_complete = False
                    reasons.add("ParticleSystemRenderer material PPtr list is missing or malformed")
                else:
                    for raw_material in raw_materials:
                        material, material_error = _renderer_asset_pointer(
                            raw_material, _field(component, "assets_file"), objects, loaded_bundle_sha256
                        )
                        if material_error:
                            renderer_asset_evidence_complete = False
                            reasons.add(f"ParticleSystemRenderer material PPtr is unresolved: {material_error}")
                        else:
                            materials.append(material)
                renderer_assets.append({
                    "rendererReference": component_reference,
                    "mesh": mesh,
                    "materials": materials,
                })
            subtree_renderer_assets = None
            if include_subtree_inventory and (component_type.endswith("Renderer") or component_type == "MeshFilter"):
                subtree_renderer_count += 1
                try:
                    component_tree = _read_tree(component)
                except Exception:
                    component_tree = {}
                    subtree_renderer_evidence_complete = False
                mesh = None
                if "m_Mesh" in component_tree:
                    mesh, mesh_error = _renderer_asset_pointer(
                        component_tree["m_Mesh"], _field(component, "assets_file"), objects, loaded_bundle_sha256
                    )
                    if mesh_error:
                        subtree_renderer_evidence_complete = False
                elif component_type in {"MeshFilter", "SkinnedMeshRenderer", "ParticleSystemRenderer"}:
                    subtree_renderer_evidence_complete = False
                materials = []
                if component_type.endswith("Renderer"):
                    raw_materials = component_tree.get("m_Materials")
                    if not isinstance(raw_materials, (list, tuple)):
                        subtree_renderer_evidence_complete = False
                    else:
                        for material_index, raw_material in enumerate(raw_materials):
                            material, material_error = _renderer_asset_pointer(
                                raw_material, _field(component, "assets_file"), objects, loaded_bundle_sha256
                            )
                            shader = _shader_pointer_for_material(material or {}, objects, loaded_bundle_sha256)
                            subtree_material_count += 1
                            subtree_shader_pointer_count += 1
                            if material_error or shader["status"] != "resolved":
                                subtree_renderer_evidence_complete = False
                            if shader["status"] == "resolved":
                                subtree_shader_resolved_count += 1
                            materials.append({
                                "materialIndex": material_index,
                                "material": material,
                                "shader": shader,
                            })
                subtree_renderer_assets = {"mesh": mesh, "materials": materials}
            subtree_components.append({
                "componentIndex": serialized_component_index,
                "sourceReference": component_reference,
                "type": component_type,
                "rendererAssets": subtree_renderer_assets,
            })
            if component_type == "MonoBehaviour":
                component_identity = {
                    "serializedFile": _asset_name(_field(component, "assets_file")),
                    "pathId": str(component_key[1]),
                    "type": component_type,
                }
                game_object_identity = {
                    "serializedFile": _asset_name(_field(obj, "assets_file")),
                    "pathId": str(_path_id(_field(obj, "path_id", _field(obj, "m_PathID")))),
                    "name": str(tree.get("m_Name", "") or "") or None,
                }
                try:
                    mono_tree = _read_tree(component)
                except Exception as error:
                    mark_incomplete(f"MonoBehaviour typetree could not be read: {type(error).__name__}")
                    mono_tree = {}
                script_reference, script_error = _pointer_identity(
                    mono_tree.get("m_Script"), _field(component, "assets_file"), objects, script_pointer=True
                )
                if script_error:
                    mark_incomplete(script_error)
                field_names = sorted(str(name) for name in mono_tree if name not in _MONOBEHAVIOUR_BASE_FIELDS)
                field_values = {name: mono_tree[name] for name in field_names}
                field_references, field_errors = _serialized_field_pointers(
                    field_values, _field(component, "assets_file"), objects
                )
                for error in field_errors:
                    mark_incomplete(f"MonoBehaviour serialized field PPtr is unresolved: {error}")
                mono_behaviours.append({
                    "componentIdentity": component_identity,
                    "gameObjectIdentity": game_object_identity,
                    "scriptPPtr": script_reference,
                    "serializedFieldNames": field_names,
                    "serializedFieldPPtrs": field_references,
                })
            if component_type in _TRANSFORM_TYPES:
                transforms.append((component, component_key))

        if len(transforms) != 1:
            mark_incomplete("GameObject does not have exactly one resolvable Transform")
            return
        transform, transform_key = transforms[0]
        if transform_key in visited_transforms:
            mark_incomplete("Transform cycle or duplicate child reference detected")
            return
        visited_transforms.add(transform_key)
        transform_reference = _object_reference(transform, loaded_bundle_sha256)
        if transform_reference is None:
            mark_incomplete("Transform source identity is unavailable")
        else:
            transform_references.append(transform_reference)
        try:
            transform_tree = _read_tree(transform)
        except Exception as error:
            mark_incomplete(f"Transform typetree could not be read: {type(error).__name__}")
            return

        parent_transform_reference = None
        if include_subtree_inventory:
            if "m_Father" not in transform_tree:
                mark_incomplete("subtree Transform parent field is missing")
            else:
                parent_parts = _pointer_parts(transform_tree.get("m_Father"))
                if parent_parts is None:
                    mark_incomplete("subtree Transform parent pointer is malformed")
                elif parent_parts[1] != 0:
                    parent_transform, parent_error = _resolve_pointer(
                        transform_tree.get("m_Father"), _field(transform, "assets_file"), objects,
                    )
                    if parent_error or _object_type(parent_transform) not in _TRANSFORM_TYPES:
                        mark_incomplete(parent_error or "subtree Transform parent is not a Transform")
                    else:
                        parent_transform_reference = _object_reference(parent_transform, loaded_bundle_sha256)
                        if parent_transform_reference is None:
                            mark_incomplete("subtree Transform parent source identity is unavailable")

        back_pointer = transform_tree.get("m_GameObject")
        back_object, back_error = _resolve_pointer(back_pointer, _field(transform, "assets_file"), objects)
        if back_error or back_object is not obj:
            mark_incomplete(back_error or "Transform GameObject back-reference does not match")
        children = transform_tree.get("m_Children")
        if not isinstance(children, (list, tuple)):
            mark_incomplete("Transform child list is missing or malformed")
            return
        child_edges = []
        for serialized_child_index, child_pointer in enumerate(children):
            child_transform, child_error = _resolve_pointer(child_pointer, _field(transform, "assets_file"), objects)
            if child_error:
                mark_incomplete(child_error)
                continue
            if _object_type(child_transform) not in _TRANSFORM_TYPES:
                mark_incomplete("Transform child PPtr resolved to a non-Transform object")
                continue
            try:
                child_tree = _read_tree(child_transform)
            except Exception as error:
                mark_incomplete(f"child Transform typetree could not be read: {type(error).__name__}")
                continue
            child_go, child_go_error = _resolve_pointer(
                child_tree.get("m_GameObject"), _field(child_transform, "assets_file"), objects
            )
            if child_go_error:
                mark_incomplete(child_go_error)
                continue
            if _object_type(child_go) != "GameObject":
                mark_incomplete("child Transform does not point to a GameObject")
                continue
            child_transform_reference = _object_reference(child_transform, loaded_bundle_sha256)
            child_game_object_reference = _object_reference(child_go, loaded_bundle_sha256)
            if include_subtree_inventory:
                if child_transform_reference is None or child_game_object_reference is None:
                    mark_incomplete("subtree child edge source identity is unavailable")
                child_edges.append({
                    "serializedChildIndex": serialized_child_index,
                    "childTransformReference": child_transform_reference,
                    "childGameObjectReference": child_game_object_reference,
                })
            visit_game_object(child_go, (_asset_name(_field(child_go, "assets_file")), _path_id(_field(child_go, "path_id", _field(child_go, "m_PathID")))))
        if include_subtree_inventory:
            subtree_nodes.append({
                "gameObjectReference": game_object_reference,
                "transformReference": transform_reference,
                "parentTransformReference": parent_transform_reference,
                "components": subtree_components,
                "children": child_edges,
            })

    visit_game_object(root, root_key)

    particle_types = sorted(name for name in component_counts if name in _PARTICLE_TYPES)
    core_types = sorted(
        name for name in component_counts
        if name in _CORE_TYPES or (name.endswith("Renderer") and name not in _PARTICLE_TYPES)
    )
    unknown_types = sorted(
        name for name in component_counts
        if name not in _STRUCTURAL_TYPES
        and name not in _PARTICLE_TYPES
        and name not in _CORE_TYPES
        and not (name.endswith("Renderer") and name not in _PARTICLE_TYPES)
    )
    if not complete:
        classification = "incomplete"
    elif unknown_types:
        classification = "unknown"
    elif particle_types and core_types:
        classification = "mixed"
    elif core_types:
        classification = "contains-core-renderer"
    elif particle_types:
        classification = "particle-only"
    else:
        classification = "other"

    renderer_counts = {
        name: component_counts[name]
        for name in sorted(component_counts)
        if name.endswith("Renderer")
    }
    mono_behaviours.sort(key=lambda item: (
        item["componentIdentity"]["serializedFile"],
        int(item["componentIdentity"]["pathId"]),
    ))
    approved_scripts = []
    mono_script_policy_complete = True
    for mono_behaviour in mono_behaviours:
        approved_reference = _approved_script_reference(mono_behaviour)
        if approved_reference is None:
            mono_script_policy_complete = False
        else:
            approved_scripts.append(approved_reference)
    approved_scripts.sort(key=lambda item: (item["bundleSha256"], item["serializedFile"], int(item["objectId"])))
    target_graph_eligible = (
        complete
        and classification in {"particle-only", "unknown"}
        and bool(particle_types)
        and component_counts.get("ParticleSystemRenderer", 0) > 0
        and not core_types
        and not [name for name in unknown_types if name != "MonoBehaviour"]
        and mono_script_policy_complete
        and renderer_asset_evidence_complete
        and bool(visited_game_objects)
    )
    target_graph_evidence = []
    if target_graph_eligible:
        target_graph_evidence.extend([
            f"exact FX target source reference {reference['bundleSha256']}:{reference['serializedFile']}:{reference['objectId']}",
            f"complete Transform traversal covered {len(visited_game_objects)} GameObjects",
            "all target graph renderers are ParticleSystemRenderer components",
            "every ParticleSystemRenderer mesh/material PPtr is recorded",
        ])
        target_graph_evidence.extend(
            "approved MonoScript source reference "
            f"{item['bundleSha256']}:{item['serializedFile']}:{item['objectId']}"
            for item in approved_scripts
        )
        if mono_behaviours:
            target_graph_evidence.append("all serialized MonoBehaviour field schemas match the pinned source census")
    result = {
        "schemaVersion": 1,
        "target": target,
        "targetReference": reference,
        "rootType": root_type,
        "rootName": root_name,
        "completeTraversal": complete,
        "classification": classification,
        "acceptedPresentationFx": target_graph_eligible,
        "gameObjectCount": len(visited_game_objects),
        "componentTypeCounts": {name: component_counts[name] for name in sorted(component_counts)},
        "rendererTypeCounts": renderer_counts,
        "monoBehaviours": mono_behaviours,
        "gameObjectReferences": sorted(game_object_references, key=lambda item: (item["serializedFile"].lower(), int(item["objectId"]))),
        "transformReferences": sorted(transform_references, key=lambda item: (item["serializedFile"].lower(), int(item["objectId"]))),
        "componentReferences": sorted(component_references, key=lambda item: (
            item["sourceReference"]["serializedFile"].lower(), int(item["sourceReference"]["objectId"]), item["type"]
        )),
        "rendererAssets": sorted(renderer_assets, key=lambda item: (
            (item["rendererReference"] or {}).get("serializedFile", "").lower(),
            int((item["rendererReference"] or {}).get("objectId", "0")),
        )),
        "rendererAssetEvidenceComplete": renderer_asset_evidence_complete,
        "approvedMonoScriptReferences": approved_scripts,
        "monoScriptPolicyComplete": mono_script_policy_complete,
        "targetGraphPolicyVersion": FX_TARGET_POLICY_VERSION,
        "targetGraphEligible": target_graph_eligible,
        "targetGraphEvidence": target_graph_evidence,
        "particleComponentTypes": particle_types,
        "coreComponentTypes": core_types,
        "unknownComponentTypes": unknown_types,
        "reasons": sorted(reasons),
    }
    if include_subtree_inventory:
        subtree_nodes.sort(key=lambda item: (
            (item["gameObjectReference"] or {}).get("serializedFile", "").lower(),
            int((item["gameObjectReference"] or {}).get("objectId", "0")),
        ))
        result["subtreeInventory"] = {
            "schemaVersion": 1,
            "completeTraversal": complete,
            "rootGameObjectReference": _object_reference(root, loaded_bundle_sha256),
            "nodes": subtree_nodes,
            "nodeCount": len(subtree_nodes),
            "componentCount": sum(len(item["components"]) for item in subtree_nodes),
            "rendererAssetEvidenceComplete": subtree_renderer_evidence_complete,
            "rendererComponentCount": subtree_renderer_count,
            "materialReferenceCount": subtree_material_count,
            "shaderPointerCount": subtree_shader_pointer_count,
            "shaderResolvedCount": subtree_shader_resolved_count,
        }
    return result


def inspect_transform_component_subtree(environment, transform_reference, loaded_bundle_sha256):
    """Inventory one exact Transform's GameObject descendants and component PPtrs.

    This is descriptive only; classifier decisions are not included in its
    result and do not promote or exclude the subtree.
    """
    if not isinstance(transform_reference, Mapping):
        raise ValueError("exact target Transform source reference is missing")
    if (
        not _SHA256_RE.fullmatch(str(transform_reference.get("bundleSha256", "")))
        or str(transform_reference.get("bundleSha256", "")).lower() != str(loaded_bundle_sha256 or "").lower()
        or not transform_reference.get("serializedFile")
    ):
        raise ValueError("target Transform does not match the loaded pinned bundle")
    try:
        transform_path_id = _path_id(transform_reference.get("objectId"))
    except (TypeError, ValueError, OverflowError) as error:
        raise ValueError("target Transform object ID is invalid") from error
    objects = _object_index(environment)
    matches = objects.get((str(transform_reference["serializedFile"]), transform_path_id), [])
    if len(matches) != 1 or _object_type(matches[0]) not in _TRANSFORM_TYPES:
        raise ValueError("target Transform is absent, duplicated, or has the wrong type")
    transform = matches[0]
    transform_tree = _read_tree(transform)
    game_object, error = _resolve_pointer(
        transform_tree.get("m_GameObject"), _field(transform, "assets_file"), objects,
    )
    if error or _object_type(game_object) != "GameObject":
        raise ValueError("target Transform has no exact resolvable GameObject owner")
    game_object_reference = _object_reference(game_object, loaded_bundle_sha256)
    if game_object_reference is None:
        raise ValueError("target Transform GameObject owner has no exact source identity")
    context = {
        "target": {
            "file": game_object_reference["serializedFile"],
            "pathId": game_object_reference["objectId"],
        },
        "targetReference": game_object_reference,
    }
    evidence = extract_fx_target_evidence(
        environment, context, loaded_bundle_sha256, include_subtree_inventory=True,
    )
    subtree = evidence.get("subtreeInventory")
    if not isinstance(subtree, Mapping):
        raise ValueError("exact child subtree inventory was not produced")
    root_transforms = [item.get("transformReference") for item in subtree.get("nodes", [])
                       if item.get("gameObjectReference") == game_object_reference]
    if root_transforms != [dict(transform_reference)]:
        raise ValueError("subtree root Transform does not match the requested exact identity")
    return {
        "schemaVersion": 1,
        "kind": "chibi-exact-transform-component-subtree",
        "targetTransformReference": dict(transform_reference),
        "rootGameObjectReference": game_object_reference,
        "completeTraversal": subtree["completeTraversal"],
        "nodes": subtree["nodes"],
        "nodeCount": subtree["nodeCount"],
        "componentCount": subtree["componentCount"],
        "rendererAssetEvidenceComplete": subtree["rendererAssetEvidenceComplete"],
        "rendererComponentCount": subtree["rendererComponentCount"],
        "materialReferenceCount": subtree["materialReferenceCount"],
        "shaderPointerCount": subtree["shaderPointerCount"],
        "shaderResolvedCount": subtree["shaderResolvedCount"],
    }
