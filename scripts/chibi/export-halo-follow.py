"""Export explicit prefab follow-component targets; never infer a head by name."""
import hashlib
import json
import math
import sys
import zlib
from pathlib import Path
import UnityPy


def hierarchy(transform):
    names, seen = [], set()
    while transform:
        if transform.object_reader.path_id in seen:
            raise ValueError('Cyclic halo transform hierarchy')
        seen.add(transform.object_reader.path_id)
        names.insert(0, transform.m_GameObject.read().m_Name)
        transform = transform.m_Father.read() if transform.m_Father.path_id else None
    return '/'.join(names)


def vector(value):
    result = [float(value[k]) for k in ['x', 'y', 'z']]
    if not all(math.isfinite(x) for x in result):
        raise ValueError('Invalid halo follow vector')
    return [-result[0], result[1], result[2]]


def rotation(value):
    q = [float(value[k]) for k in ['x', 'y', 'z', 'w']]
    length = math.sqrt(sum(x*x for x in q))
    if not math.isfinite(length) or length < 1e-8:
        raise ValueError('Invalid halo follow rotation')
    return [q[0]/length, -q[1]/length, -q[2]/length, q[3]/length]


def export(manifest):
    bindings, warnings = [], []
    static_translations = []
    animation_paths = {}
    for bundle in manifest.get('animationBundles', []):
        for obj in UnityPy.load(bundle).objects:
            if obj.type.name != 'AnimationClip':
                continue
            clip = obj.read()
            if clip.m_Name not in manifest.get('clips', []):
                continue
            paths = animation_paths.setdefault(clip.m_Name, set())
            for binding in getattr(getattr(clip, 'm_ClipBindingConstant', None), 'genericBindings', []):
                if binding.typeID == 4 and binding.attribute == 1:
                    paths.add(binding.path)
            paths.update(zlib.crc32(curve.path.encode()) for curve in getattr(clip, 'm_PositionCurves', []))
    for digest in {r['sourceReference']['bundleSha256'] for r in manifest['renderers']}:
        data = Path(manifest['bundles'][digest]).read_bytes()
        if hashlib.sha256(data).hexdigest() != digest:
            raise ValueError('Halo prefab bundle hash mismatch')
        env = UnityPy.load(data)
        roots = {(r['sourceReference']['serializedFile'], r['hierarchyPath'].split('/')[0])
                 for r in manifest['renderers'] if r['sourceReference']['bundleSha256'] == digest}
        for renderer in manifest['renderers']:
            ref = renderer['sourceReference']
            if ref['bundleSha256'] != digest:
                continue
            matches = [o for o in env.objects if o.type.name == 'MeshRenderer'
                       and o.assets_file.name == ref['serializedFile'] and str(o.path_id) == ref.get('objectId')]
            if len(matches) != 1:
                continue
            go = matches[0].read().m_GameObject.read()
            transforms = [c.component.read() for c in go.m_Component if c.component.type.name == 'Transform']
            if len(transforms) != 1 or hierarchy(transforms[0]) != renderer['hierarchyPath']:
                continue
            transform = transforms[0]
            relative = renderer['hierarchyPath'].split('/', 1)[1]
            clips = [clip for clip, paths in animation_paths.items() if zlib.crc32(relative.encode()) not in paths]
            static_translations.append({'hierarchyPath': renderer['hierarchyPath'], 'sourceReference': ref,
                'restTranslation': vector({k: getattr(transform.m_LocalPosition, k) for k in ['x', 'y', 'z']}), 'clips': clips})
        for obj in env.objects:
            if obj.type.name != 'MonoBehaviour':
                continue
            tree = obj.read_typetree()
            if not {'FollowTarget', 'TargetRelativePosition', 'TargetRelativeRotation',
                    'FollowPositionPower', 'FollowRotationPower', 'ClampMinOffset', 'ClampMaxOffset',
                    'FixYRotation'}.issubset(tree):
                continue
            component = obj.read()
            go = component.m_GameObject.read()
            transforms = [c.component.read() for c in go.m_Component if c.component.type.name == 'Transform']
            if len(transforms) != 1:
                continue
            halo = transforms[0]
            path = hierarchy(halo)
            if (obj.assets_file.name, path.split('/')[0]) not in roots:
                continue
            try:
                pointer = tree['FollowTarget']
                if pointer['m_FileID'] != 0 or not pointer['m_PathID']:
                    raise ValueError('FollowTarget is not an exact same-prefab transform')
                targets = [o for o in env.objects if o.assets_file.name == obj.assets_file.name
                           and o.path_id == pointer['m_PathID'] and o.type.name == 'Transform']
                if len(targets) != 1:
                    raise ValueError('FollowTarget is ambiguous')
                target = targets[0].read()
                target_path = hierarchy(target)
                if target_path.split('/')[0] != path.split('/')[0] or not component.m_Enabled:
                    continue
                powers = [float(tree[k]) for k in ['FollowPositionPower', 'FollowRotationPower']]
                if not all(math.isfinite(x) and 0 <= x <= 1 for x in powers):
                    raise ValueError('Invalid follow power')
                reference = lambda object_id: {'bundleSha256': digest, 'serializedFile': obj.assets_file.name,
                                                'objectId': str(object_id)}
                low, high = vector(tree['ClampMinOffset']), vector(tree['ClampMaxOffset'])
                bindings.append({'sourceReference': reference(obj.path_id),
                    'haloReference': reference(halo.object_reader.path_id),
                    'targetReference': reference(target.object_reader.path_id),
                    'haloPath': path, 'targetPath': target_path,
                    'haloRestPosition': vector({k: getattr(halo.m_LocalPosition, k) for k in ['x', 'y', 'z']}),
                    'offset': vector(tree['TargetRelativePosition']),
                    'rotation': rotation(tree['TargetRelativeRotation']),
                    'clampMin': [min(a,b) for a,b in zip(low,high)],
                    'clampMax': [max(a,b) for a,b in zip(low,high)],
                    'positionPower': powers[0], 'rotationPower': powers[1],
                    'fixYRotation': bool(tree['FixYRotation'])})
            except (ValueError, KeyError) as error:
                warnings.append(f'Halo follow {path}: {error}')
    return {'bindings': bindings, 'warnings': warnings, 'staticMeshTranslations': static_translations}


if __name__ == '__main__':
    Path(sys.argv[2]).write_text(json.dumps(export(json.loads(Path(sys.argv[1]).read_text(encoding='utf-8')))), encoding='utf-8')
