import importlib.util
from pathlib import Path
from types import SimpleNamespace as NS
import unittest
import zlib
import struct

spec = importlib.util.spec_from_file_location('renderer_active', Path(__file__).with_name('export-renderer-active.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ActivationTest(unittest.TestCase):
    def fixture(self, value=0):
        data = NS(m_StreamedClip=NS(curveCount=0), m_DenseClip=NS(m_CurveCount=0), m_ConstantClip=NS(data=[1, 2, 3, value]))
        bindings = [NS(typeID=4, attribute=1, path=0), NS(typeID=1, attribute=zlib.crc32(b'm_IsActive'), path=42, isPPtrCurve=0)]
        return NS(m_Name='Idle', m_MuscleClip=NS(m_Clip=NS(data=data)), m_ClipBindingConstant=NS(genericBindings=bindings))

    def test_exact_constant_after_transform_slots(self):
        self.assertEqual(module.constant_active(self.fixture(), {42: ['Root/Face']}), [dict(clip='Idle', hierarchyPath='Root/Face', active=False)])

    def test_renderer_enabled_binding(self):
        clip = self.fixture()
        binding = clip.m_ClipBindingConstant.genericBindings[-1]
        binding.typeID = 25
        binding.attribute = zlib.crc32(b'm_Enabled')
        self.assertEqual(module.constant_active(clip, {42: ['Root/Face']}), [dict(clip='Idle', hierarchyPath='Root/Face', active=False)])
        binding.attribute = zlib.crc32(b'other')
        self.assertEqual(module.constant_active(clip, {42: ['Root/Face']}), [])

    def test_ambiguous_paths_and_non_boolean_values(self):
        self.assertEqual(module.constant_active(self.fixture(), {42: ['Root/Face', 'Root/Other']}), [])
        self.assertEqual(module.constant_active(self.fixture(.5), {42: ['Root/Face']}), [])

    def test_dynamic_track_is_not_mistaken_for_constant(self):
        clip = self.fixture()
        clip.m_MuscleClip.m_Clip.data.m_StreamedClip.curveCount = 4
        self.assertEqual(module.constant_active(clip, {42: ['Root/Face']}), [])

    def test_streamed_constant_activation_and_changing_track(self):
        def word(value):
            return struct.unpack('<I', struct.pack('<f', value))[0]
        clip = self.fixture()
        clip.m_ClipBindingConstant.genericBindings = clip.m_ClipBindingConstant.genericBindings[1:]
        data = clip.m_MuscleClip.m_Clip.data
        data.m_StreamedClip.curveCount = 1
        data.m_StreamedClip.data = [0xFF7FFFFF, 1, 0, 0, 0, 0, word(0), word(0), 1, 0, 0, 0, 0, word(0), 0x7F800000, 0]
        self.assertEqual(module.constant_active(clip, {42: ['Root/Face']}), [dict(clip='Idle', hierarchyPath='Root/Face', active=False)])
        data.m_StreamedClip.data[-3] = word(1)
        self.assertEqual(module.constant_active(clip, {42: ['Root/Face']}), [])


if __name__ == '__main__':
    unittest.main()

