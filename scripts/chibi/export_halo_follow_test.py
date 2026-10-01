import importlib.util
from pathlib import Path
import unittest
from types import SimpleNamespace as NS
from unittest.mock import patch
from tempfile import TemporaryDirectory
import hashlib
spec = importlib.util.spec_from_file_location('halo_follow', Path(__file__).with_name('export-halo-follow.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class HaloFollowTest(unittest.TestCase):
    def test_reflects_source_vectors_and_rotation(self):
        self.assertEqual(module.vector({'x': 2, 'y': 3, 'z': 4}), [-2, 3, 4])
        self.assertEqual(module.rotation({'x': 0, 'y': 2, 'z': 0, 'w': 0}), [0, -1, 0, 0])
    def test_rejects_invalid_values(self):
        with self.assertRaises(ValueError): module.vector({'x': float('nan'), 'y': 0, 'z': 0})
        with self.assertRaises(ValueError): module.rotation({'x': 0, 'y': 0, 'z': 0, 'w': 0})
    def test_exact_pointer_controls_target_and_cross_prefab_is_rejected(self):
        def pointer(value): return NS(path_id=1, read=lambda: value, type=NS(name='Transform'))
        root = NS(object_reader=NS(path_id=1), m_GameObject=NS(read=lambda: NS(m_Name='Prefab')), m_Father=NS(path_id=0))
        target = NS(object_reader=NS(path_id=2), m_GameObject=NS(read=lambda: NS(m_Name='UnusualTarget')), m_Father=pointer(root))
        halo = NS(object_reader=NS(path_id=3), m_GameObject=NS(read=lambda: NS(m_Name='Hover')), m_Father=pointer(root), m_LocalPosition=NS(x=0,y=1,z=0))
        go = NS(m_Component=[NS(component=pointer(halo))])
        tree = {'FollowTarget': {'m_FileID':0,'m_PathID':2}, 'TargetRelativePosition':dict(x=1,y=2,z=3),
                'TargetRelativeRotation':dict(x=0,y=0,z=0,w=1), 'FollowPositionPower':.1, 'FollowRotationPower':.07,
                'ClampMinOffset':dict(x=-1,y=-1,z=-1), 'ClampMaxOffset':dict(x=1,y=1,z=1), 'FixYRotation':False}
        obj = NS(type=NS(name='MonoBehaviour'), read_typetree=lambda:tree, read=lambda:NS(m_GameObject=NS(read=lambda:go),m_Enabled=True), assets_file=NS(name='CAB'),path_id=4)
        target_obj = NS(type=NS(name='Transform'),assets_file=NS(name='CAB'),path_id=2,read=lambda:target)
        with TemporaryDirectory() as directory:
            bundle=Path(directory)/'prefab';bundle.write_bytes(b'fixture');digest=hashlib.sha256(b'fixture').hexdigest()
            manifest={'bundles':{digest:str(bundle)},'renderers':[{'sourceReference':{'bundleSha256':digest,'serializedFile':'CAB'},'hierarchyPath':'Prefab/AnyRenderer'}]}
            with patch.object(module.UnityPy,'load',return_value=NS(objects=[obj,target_obj])):
                result=module.export(manifest)
                self.assertEqual(result['bindings'][0]['targetPath'],'Prefab/UnusualTarget')
                self.assertEqual(result['bindings'][0]['targetReference']['objectId'],'2')
                tree['FollowTarget']['m_FileID']=1
                result=module.export(manifest)
                self.assertEqual(result['bindings'],[])
                self.assertEqual(len(result['warnings']),1)
    def test_rejects_changed_prefab_bytes(self):
        manifest = {'bundles': {'0'*64: __file__}, 'renderers': [{'sourceReference': {'bundleSha256': '0'*64}}]}
        with self.assertRaisesRegex(ValueError, 'hash mismatch'): module.export(manifest)
if __name__ == '__main__': unittest.main()
