import importlib.util
from pathlib import Path
import unittest
import hashlib
import tempfile
from types import SimpleNamespace as NS
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('root_rotations', Path(__file__).with_name('export-root-rotations.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class RootRotationTest(unittest.TestCase):
    def duplicate_export(self, tracks):
        root = NS(m_GameObject=NS(read=lambda: NS(m_Name='Root')), m_Father=NS(path_id=0))
        bone = NS(m_GameObject=NS(read=lambda: NS(m_Name='Bone')), m_Father=NS(path_id=1, read=lambda: root),
                  m_LocalRotation=NS(x=0, y=0, z=0, w=1), m_LocalPosition=NS(x=0, y=0, z=0))
        renderer = NS(m_RootBone=NS(path_id=2, read=lambda: bone), m_Bones=[])
        reader = NS(assets_file=NS(name='CAB'), path_id=1, read=lambda: renderer)
        clips = [NS(type=NS(name='AnimationClip'), read=lambda: NS(m_Name='Idle', m_MuscleClip=NS(m_StopTime=1)))
                 for _ in tracks]
        with tempfile.TemporaryDirectory() as directory:
            bundle = Path(directory) / 'prefab'
            bundle.write_bytes(b'fixture')
            digest = hashlib.sha256(b'fixture').hexdigest()
            manifest = {'bundles': {digest: str(bundle)}, 'animationBundles': ['animation'], 'clips': ['Idle'],
                        'renderers': [{'hierarchyPath': 'Root/Body', 'sourceReference': {
                            'bundleSha256': digest, 'serializedFile': 'CAB', 'objectId': '1'}}]}
            with patch.object(module.UnityPy, 'load', side_effect=[NS(objects=[reader]), NS(objects=clips)]), \
                 patch.object(module, '_decode_transform_bindings', side_effect=[(value, True, []) for value in tracks]):
                return module.export(manifest)

    def track(self, value=1):
        return {'pathTokens': ['Bone'], 'property': 'translation', 'valueClass': 'constant',
                'componentCurves': [{'component': c, 'initialValue': value, 'keys': []} for c in ['x', 'y', 'z']]}

    def test_duplicate_names_with_only_one_relevant_skeleton_are_allowed(self):
        result = self.duplicate_export([[], [self.track()]])
        self.assertEqual(len(result['tracks']), 1)
        self.assertEqual(result['warnings'], [])

    def test_identical_duplicate_skeletal_tracks_are_deduplicated(self):
        result = self.duplicate_export([[self.track()], [self.track()]])
        self.assertEqual(len(result['tracks']), 1)
        self.assertEqual(result['warnings'], [])

    def test_conflicting_duplicate_skeletal_tracks_keep_exported_channel(self):
        result = self.duplicate_export([[self.track()], [self.track(2)], [self.track()]])
        self.assertEqual(result['tracks'], [])
        self.assertEqual(len(result['warnings']), 1)
        self.assertIn('Idle / Root/Bone / translation', result['warnings'][0])

    def test_reflects_source_axes_and_normalizes(self):
        self.assertEqual(module.reflected([0, 0, 2, 0]), [0, 0, -1, 0])
        self.assertEqual(module.reflected([2, 0, 0, 0]), [1, 0, 0, 0])
    def test_rejects_invalid_rotation(self):
        for values in [[0, 0, 0, 0], [float('nan'), 0, 0, 1]]:
            with self.assertRaises(ValueError):
                module.reflected(values)
if __name__ == '__main__':
    unittest.main()
