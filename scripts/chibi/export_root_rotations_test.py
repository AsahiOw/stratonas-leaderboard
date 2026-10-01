import importlib.util
from pathlib import Path
import unittest
spec = importlib.util.spec_from_file_location('root_rotations', Path(__file__).with_name('export-root-rotations.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class RootRotationTest(unittest.TestCase):
    def test_reflects_source_axes_and_normalizes(self):
        self.assertEqual(module.reflected([0, 0, 2, 0]), [0, 0, -1, 0])
        self.assertEqual(module.reflected([2, 0, 0, 0]), [1, 0, 0, 0])
    def test_rejects_invalid_rotation(self):
        for values in [[0, 0, 0, 0], [float('nan'), 0, 0, 1]]:
            with self.assertRaises(ValueError):
                module.reflected(values)
if __name__ == '__main__':
    unittest.main()
