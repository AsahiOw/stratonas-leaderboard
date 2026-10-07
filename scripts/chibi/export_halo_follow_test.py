import importlib.util
from pathlib import Path
import unittest
from types import SimpleNamespace as NS
from unittest.mock import patch
from tempfile import TemporaryDirectory
import hashlib
import json
import subprocess
import sys
spec = importlib.util.spec_from_file_location('halo_follow', Path(__file__).with_name('export-halo-follow.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class HaloFollowTest(unittest.TestCase):
    def test_helpers_read_utf8_manifests_with_legacy_windows_encoding(self):
        manifest = {'bundles': {}, 'renderers': [], 'animationBundles': [], 'paths': [], 'clips': [], 'note': 'あ'}
        with TemporaryDirectory() as directory:
            source = Path(directory) / 'manifest.json'
            source.write_text(json.dumps(manifest, ensure_ascii=False), encoding='utf-8')
            for name in ['export-halo-follow.py', 'export-face-skin.py', 'export-root-rotations.py', 'export-renderer-active.py']:
                with self.subTest(helper=name):
                    target = Path(directory) / (name + '.json')
                    result = subprocess.run([sys.executable, '-X', 'utf8=0', str(Path(__file__).with_name(name)), str(source), str(target)],
                                            capture_output=True)
                    self.assertEqual(result.returncode, 0, result.stderr.decode('utf-8', errors='replace'))
                    json.loads(target.read_text(encoding='utf-8'))

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

    def test_static_mesh_rest_requires_exact_renderer_and_no_source_position_binding(self):
        root = NS(object_reader=NS(path_id=1), m_GameObject=NS(read=lambda: NS(m_Name='Prefab')), m_Father=NS(path_id=0))
        transform = NS(object_reader=NS(path_id=2), m_GameObject=NS(read=lambda: NS(m_Name='Halo')),
                       m_Father=NS(path_id=1, read=lambda: root), m_LocalPosition=NS(x=0, y=-1, z=.2))
        go = NS(m_Component=[NS(component=NS(type=NS(name='Transform'), read=lambda: transform))])
        renderer = NS(type=NS(name='MeshRenderer'), assets_file=NS(name='CAB'), path_id=3,
                      read=lambda: NS(m_GameObject=NS(read=lambda: go)))
        clips = [NS(type=NS(name='AnimationClip'), read=lambda: NS(m_Name='Idle', m_PositionCurves=[],
                    m_ClipBindingConstant=NS(genericBindings=[]))),
                 NS(type=NS(name='AnimationClip'), read=lambda: NS(m_Name='Moving', m_PositionCurves=[],
                    m_ClipBindingConstant=NS(genericBindings=[NS(typeID=4, attribute=1, path=module.zlib.crc32(b'Halo'))])))]
        with TemporaryDirectory() as directory:
            bundle = Path(directory) / 'prefab'; bundle.write_bytes(b'fixture')
            digest = hashlib.sha256(b'fixture').hexdigest()
            ref = {'bundleSha256': digest, 'serializedFile': 'CAB', 'objectId': '3'}
            manifest = {'bundles': {digest: str(bundle)}, 'renderers': [{'sourceReference': ref, 'hierarchyPath': 'Prefab/Halo'}],
                        'animationBundles': ['animations'], 'clips': ['Idle', 'Moving']}
            with patch.object(module.UnityPy, 'load', side_effect=lambda data: NS(objects=clips if data == 'animations' else [renderer])):
                result = module.export(manifest)['staticMeshTranslations']
                self.assertEqual(result, [{'hierarchyPath': 'Prefab/Halo', 'sourceReference': ref,
                                          'restTranslation': [0, -1, .2], 'clips': ['Idle']}])
                ref['objectId'] = '4'
                self.assertEqual(module.export(manifest)['staticMeshTranslations'], [])
if __name__ == '__main__': unittest.main()
