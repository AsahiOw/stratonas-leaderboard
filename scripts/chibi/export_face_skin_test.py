import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("export_face_skin", Path(__file__).with_name("export-face-skin.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SourceWeightsTest(unittest.TestCase):
    def fixture(self):
        mesh = SimpleNamespace(m_VertexData=SimpleNamespace(m_Channels=[
            SimpleNamespace(dimension=0) for _ in range(13)] + [SimpleNamespace(dimension=1)]))
        helper = SimpleNamespace(m_BoneWeights=None, m_BoneIndices=[[0], [1]], m_Vertices=[(0, 0, 0), (1, 0, 0)])
        return mesh, helper

    def test_packed_fourth_weight_uses_normalized_remainder(self):
        mesh, helper = self.fixture()
        mesh.m_CompressedMesh = SimpleNamespace(m_Weights=SimpleNamespace(m_NumItems=4))
        with patch.object(module, "unpack_ints", return_value=[21, 4, 2, 31]):
            weights = module.source_weights(mesh, helper)
        self.assertEqual(weights, [[21 / 31, 4 / 31, 2 / 31, 4 / 31], [1, 0, 0, 0]])
        self.assertAlmostEqual(sum(weights[0]), 1)

    def test_packed_weights_reject_incomplete_data(self):
        mesh, helper = self.fixture()
        mesh.m_CompressedMesh = SimpleNamespace(m_Weights=SimpleNamespace(m_NumItems=1))
        with patch.object(module, "unpack_ints", return_value=[21]):
            with self.assertRaisesRegex(ValueError, "Incomplete"):
                module.source_weights(mesh, helper)

    def test_rigid_index_only_skin(self):
        mesh, helper = self.fixture()
        self.assertEqual(module.source_weights(mesh, helper), [[1.0], [1.0]])

    def test_preserves_authored_weights(self):
        mesh, helper = self.fixture()
        helper.m_BoneWeights = [[0.75, 0.25], [1.0, 0.0]]
        self.assertIs(module.source_weights(mesh, helper), helper.m_BoneWeights)

    def test_rejects_missing_weights_for_multiple_indices(self):
        mesh, helper = self.fixture()
        mesh.m_VertexData.m_Channels[13].dimension = 2
        helper.m_BoneIndices = [[0, 1], [0, 1]]
        with self.assertRaisesRegex(ValueError, "no supported weight channel"):
            module.source_weights(mesh, helper)


if __name__ == "__main__":
    unittest.main()
