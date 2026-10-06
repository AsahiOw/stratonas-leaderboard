"""Capture face skin weights from exact source renderer and mesh identities."""
import hashlib
import json
import sys
from pathlib import Path

import UnityPy
from UnityPy.helpers.MeshHelper import MeshHandler, unpack_ints


def source_weights(mesh, helper):
    compressed = getattr(mesh, "m_CompressedMesh", None)
    if compressed and compressed.m_Weights.m_NumItems > 0:
        # Packed Unity weights use a total of 31; the fourth influence is implicit.
        packed = unpack_ints(compressed.m_Weights)
        weights = [[0.0] * 4 for _ in helper.m_Vertices]
        vertex = component = total = 0
        for weight in packed:
            if vertex >= len(weights) or not 0 <= weight <= 31 or total + weight > 31:
                raise ValueError("Invalid packed source weights")
            weights[vertex][component] = weight / 31
            total += weight
            component += 1
            if total == 31 or component == 3:
                if total < 31:
                    weights[vertex][3] = (31 - total) / 31
                vertex += 1
                component = total = 0
        if vertex != len(weights) or component:
            raise ValueError("Incomplete packed source weights")
        return weights
    if helper.m_BoneWeights is not None:
        return helper.m_BoneWeights
    channels = mesh.m_VertexData.m_Channels
    # Unity rigid skins may omit blend weights and store exactly one index.
    if (len(channels) > 13 and channels[12].dimension == 0
            and channels[13].dimension == 1 and helper.m_BoneIndices is not None
            and len(helper.m_BoneIndices) == len(helper.m_Vertices)
            and all(len(row) == 1 for row in helper.m_BoneIndices)):
        return [[1.0] for _ in helper.m_Vertices]
    raise ValueError("Source skin has no supported weight channel")


def export(manifest):
    environments = {}

    def resolve(reference):
        digest = reference["bundleSha256"]
        if digest not in environments:
            data = Path(manifest["bundles"][digest]).read_bytes()
            if hashlib.sha256(data).hexdigest() != digest:
                raise ValueError("Face skin bundle hash mismatch")
            environments[digest] = UnityPy.load(data)
        matches = [obj for obj in environments[digest].objects
                   if obj.assets_file.name == reference["serializedFile"]
                   and str(obj.path_id) == reference["objectId"]]
        if len(matches) != 1:
            raise ValueError("Face skin source object is not unique")
        return matches[0].read()

    result = []
    for item in manifest["renderers"]:
        renderer = resolve(item["sourceReference"])
        mesh = resolve(item["meshReference"])
        helper = MeshHandler(mesh)
        helper.process()
        bones = [bone.read().m_GameObject.read().m_Name for bone in renderer.m_Bones]
        if len(bones) != len(mesh.m_BindPose):
            raise ValueError("Face skin bone and bind-pose counts differ")
        result.append({**item, "bones": bones, "positions": helper.m_Vertices,
                       "joints": helper.m_BoneIndices, "weights": source_weights(mesh, helper),
                       "uvs": helper.m_UV0, "normals": helper.m_Normals})
    return result


if __name__ == "__main__":
    Path(sys.argv[2]).write_text(json.dumps(export(json.loads(Path(sys.argv[1]).read_text(encoding='utf-8')))), encoding='utf-8')
