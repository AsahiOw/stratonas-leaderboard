"""Retain exact animated skin bone rotations and positions lost in FBX conversion."""
import hashlib
import json
import math
import sys
import zlib
from pathlib import Path
import UnityPy
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from chibi_v12_motion_proof_unitypy import _decode_transform_bindings, _curve_value_at


def reflected(values):
    x, y, z, w = values
    norm = math.sqrt(x*x + y*y + z*z + w*w)
    if not math.isfinite(norm) or norm <= 0:
        raise ValueError('Invalid source root rotation')
    return [x/norm, -y/norm, -z/norm, w/norm]


def export(manifest):
    environments = {}
    roots = {}
    positions = {}
    for item in manifest['renderers']:
        ref = item['sourceReference']
        digest = ref['bundleSha256']
        if digest not in environments:
            data = Path(manifest['bundles'][digest]).read_bytes()
            if hashlib.sha256(data).hexdigest() != digest:
                raise ValueError('Root rotation bundle hash mismatch')
            environments[digest] = UnityPy.load(data)
        objects = [o for o in environments[digest].objects if o.assets_file.name == ref['serializedFile'] and str(o.path_id) == ref['objectId']]
        if len(objects) != 1:
            raise ValueError('Root renderer reference is ambiguous')
        renderer = objects[0].read()
        for pointer in [renderer.m_RootBone, *renderer.m_Bones]:
            if not pointer.path_id:
                continue
            transform = pointer.read()
            transforms = [transform]
            chain = [transform.m_GameObject.read().m_Name]
            parent = transform.m_Father
            while parent.path_id:
                value = parent.read()
                chain.insert(0, value.m_GameObject.read().m_Name)
                transforms.insert(0, value)
                parent = value.m_Father
            animator = item['hierarchyPath'].split('/')[0]
            if chain[0] != animator:
                continue
            for index, transform in enumerate(transforms[1:], 1):
                path = '/'.join(chain[:index + 1])
                rotation = transform.m_LocalRotation
                roots[path] = reflected([rotation.x, rotation.y, rotation.z, rotation.w])
                position = transform.m_LocalPosition
                positions[path] = [-position.x, position.y, position.z]
    paths = {}
    for path in roots:
        tokens = path.split('/')[1:]
        paths.setdefault(zlib.crc32('/'.join(tokens).encode()), []).append({'pathTokens': tokens, 'sourceReference': {}})
    result = []
    seen = set()
    for bundle in manifest['animationBundles']:
        for obj in UnityPy.load(bundle).objects:
            if obj.type.name != 'AnimationClip':
                continue
            clip = obj.read()
            if clip.m_Name not in manifest['clips']:
                continue
            if clip.m_Name in seen:
                raise ValueError('Selected root animation is ambiguous')
            seen.add(clip.m_Name)
            tracks, _, _ = _decode_transform_bindings(clip, paths)
            stop = clip.m_MuscleClip.m_StopTime
            for track in tracks:
                tokens = track.get('pathTokens')
                if not tokens or track['property'] not in ['rotation', 'translation'] or track['valueClass'] == 'unresolved':
                    continue
                matches = [path for path in roots if path.split('/')[1:] == tokens]
                curves = track['componentCurves']
                rotation_track = track['property'] == 'rotation'
                if len(matches) != 1 or [c['component'] for c in curves] != (['x', 'y', 'z', 'w'] if rotation_track else ['x', 'y', 'z']):
                    continue
                times = sorted({0.0, float(stop), *[min(i / 60, stop) for i in range(math.ceil(stop*60))],
                                *[float(k['time']) for c in curves for k in c.get('keys', []) if 0 <= k['time'] <= stop]})
                values = [[_curve_value_at(c, t) for c in curves] for t in times]
                if rotation_track:
                    values = [reflected(value) for value in values]
                    for i in range(1, len(values)):
                        if sum(a*b for a, b in zip(values[i-1], values[i])) < 0:
                            values[i] = [-v for v in values[i]]
                else:
                    values = [[-x, y, z] for x, y, z in values]
                result.append({'clip': clip.m_Name, 'hierarchyPath': matches[0], 'targetPath': track['property'],
                               'restRotation': roots[matches[0]], 'restTranslation': positions[matches[0]], 'times': times, 'values': values})
    return result


if __name__ == '__main__':
    Path(sys.argv[2]).write_text(json.dumps(export(json.loads(Path(sys.argv[1]).read_text()))))
