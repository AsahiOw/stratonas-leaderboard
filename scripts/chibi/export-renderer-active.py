"""Preserve constant GameObject and Renderer visibility curves lost by FBX conversion."""
import json
import sys
import zlib
from pathlib import Path

import UnityPy
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from chibi_v12_motion_proof_unitypy import decode_streamed_clip


def constant_active(clip, paths):
    pointer = getattr(getattr(clip, 'm_MuscleClip', None), 'm_Clip', None)
    data = getattr(pointer, 'data', None)
    bindings = getattr(getattr(clip, 'm_ClipBindingConstant', None), 'genericBindings', [])
    if data is None or not bindings:
        return []
    offset = 0
    constant_start = data.m_StreamedClip.curveCount + data.m_DenseClip.m_CurveCount
    words = getattr(data.m_StreamedClip, 'data', [])
    stream = decode_streamed_clip(words, data.m_StreamedClip.curveCount) if words else None
    result = []
    for binding in bindings:
        # Unity transform bindings occupy 3 scalar slots (position/scale/euler)
        # or 4 (quaternion); other component bindings occupy one.
        width = (4 if binding.attribute == 2 else 3 if binding.attribute in (1, 3, 4) else 1) if binding.typeID == 4 else 1
        matches = paths.get(binding.path, [])
        visibility_binding = ((binding.typeID == 1 and binding.attribute == zlib.crc32(b'm_IsActive'))
                              or (binding.typeID == 25 and binding.attribute == zlib.crc32(b'm_Enabled')))
        if (visibility_binding
                and not binding.isPPtrCurve and len(matches) == 1):
            value = None
            if offset >= constant_start:
                value = data.m_ConstantClip.data[offset - constant_start]
            elif offset < data.m_StreamedClip.curveCount and stream:
                keys = [key for key in stream['initialKeys'] if key['index'] == offset]
                keys.extend(key for frame in stream['frames'] for key in frame['keys'] if key['index'] == offset)
                if (keys and all(key['value'] == keys[0]['value'] and all(coefficient == 0 for coefficient in key['coefficients'][:3]) for key in keys)):
                    value = keys[0]['value']
            if value in (0.0, 1.0):
                result.append({'clip': clip.m_Name, 'hierarchyPath': matches[0], 'active': bool(value)})
        offset += width
    return result


def export(manifest):
    paths = {}
    for path in manifest['paths']:
        relative = path.split('/', 1)[1] if '/' in path else ''
        paths.setdefault(zlib.crc32(relative.encode()), []).append(path)
    result = []
    for bundle in manifest['bundles']:
        for obj in UnityPy.load(bundle).objects:
            if obj.type.name != 'AnimationClip':
                continue
            clip = obj.read()
            if clip.m_Name in manifest['clips']:
                result.extend(constant_active(clip, paths))
    return result


if __name__ == '__main__':
    Path(sys.argv[2]).write_text(json.dumps(export(json.loads(Path(sys.argv[1]).read_text()))))
