import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

function pythonCommand() {
  if (process.env.CHIBI_PYTHON) return { command: process.env.CHIBI_PYTHON, args: [] }
  return process.platform === 'win32' ? { command: 'py', args: ['-3.12'] } : { command: 'python3.12', args: [] }
}

test('inventory records a corrupt zip as a source error', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-inventory '))
  try {
    const source = path.join(root, 'BAAD')
    const output = path.join(root, 'inventory.raw.json')
    await mkdir(source, { recursive: true })
    await writeFile(path.join(source, 'broken.zip'), Buffer.from('not a zip archive'))
    const python = pythonCommand()
    const result = spawnSync(python.command, [...python.args, path.resolve('scripts/chibi/inventory.py'), source, output], { encoding: 'utf8', windowsHide: true })
    assert.equal(result.status, 0, result.stderr || result.error?.message)
    const report = JSON.parse(await readFile(output, 'utf8'))
    assert.equal(report.files.length, 1)
    assert.equal(report.files[0].kind, 'archive')
    assert.match(report.files[0].error, /BadZipFile/)
    assert.deepEqual(report.files[0].entries, [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('FX graph evidence dispatch accepts source Effects and Prefeb path spellings without broadening other containers', () => {
  const python = pythonCommand()
  const fixture = String.raw`
import json
import sys
sys.path.insert(0, 'scripts/chibi')
from inventory import is_fx_prefab_container_path
paths = [
    'Assets/_MX/Characters/CH0001/Effect/Prefab/FX.prefab',
    'Assets/_MX/Characters/CH0002/Effects/Prefab/FX.prefab',
    'Assets/_MX/Characters/CH0003/Effect/Prefeb/FX.prefab',
    'Assets/_MX/Characters/CH0004/Cafe/Cafe_CH0004.prefab',
    'Assets/_MX/Characters/CH0005/Effect/Prefabulous/FX.prefab',
]
print(json.dumps([is_fx_prefab_container_path(path) for path in paths]))
`
  const result = spawnSync(python.command, [...python.args, '-c', fixture], { encoding: 'utf8', windowsHide: true })
  assert.equal(result.status, 0, result.stderr || result.error?.message)
  assert.deepEqual(JSON.parse(result.stdout), [true, true, true, false, false])
})

test('only the two exact InstantiateFx literals receive their source AnimationClip object identity', () => {
  const python = pythonCommand()
  const fixture = String.raw`
import json
import sys
sys.path.insert(0, 'scripts/chibi')
from inventory import fx_event_source_clip_reference
functions = ['AniEvt_InstantiateFx', 'InstantiateFx', 'InstantiateFX', 'xInstantiateFx', 'InstantiateFxExtra', 'PlayAudio']
references = [fx_event_source_clip_reference(value, 'a' * 64, 'CAB-animation', 501) for value in functions]
print(json.dumps(references))
`
  const result = spawnSync(python.command, [...python.args, '-c', fixture], { encoding: 'utf8', windowsHide: true })
  assert.equal(result.status, 0, result.stderr || result.error?.message)
  const expected = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-animation', objectId: '501' }
  assert.deepEqual(JSON.parse(result.stdout), [expected, expected, null, null, null, null])
})

test('inventory resolves exact equipment bone relations and retains duplicate or missing ambiguity evidence', () => {
  const python = pythonCommand()
  const fixture = String.raw`
import json
import sys
from types import SimpleNamespace

sys.path.insert(0, 'scripts/chibi')
from inventory import character_assembly

asset = SimpleNamespace(name='CAB-prefab', externals=[])

def pointer(path_id):
    return {'m_FileID': 0, 'm_PathID': int(path_id)}

def unity_object(type_name, path_id, value):
    return SimpleNamespace(
        type=SimpleNamespace(name=type_name),
        path_id=int(path_id),
        assets_file=asset,
        read_typetree=lambda: value,
    )

def game_object(path_id, name):
    return unity_object('GameObject', path_id, {'m_Name': name, 'm_IsActive': True})

def transform(path_id, game_object_id, parent_id):
    return unity_object('Transform', path_id, {
        'm_GameObject': pointer(game_object_id),
        'm_Father': pointer(parent_id),
    })

objects = [
    game_object(1, 'Cafe_A'), transform(2, 1, 0),
    game_object(3, 'A_Weapon'), transform(4, 3, 2),
    game_object(5, 'A_Weapon_Duplicate'), transform(6, 5, 2),
    game_object(8, 'Bip001_Weapon'), transform(7, 8, 2),
    game_object(10, 'Bip001_Weapon_02'), transform(9, 10, 2),
    unity_object('SkinnedMeshRenderer', 22, {
        'm_GameObject': pointer(3), 'm_Enabled': True, 'm_RootBone': pointer(7),
        'm_Bones': [pointer(7)], 'm_Materials': [], 'm_Mesh': pointer(0),
    }),
    unity_object('SkinnedMeshRenderer', 23, {
        'm_GameObject': pointer(5), 'm_Enabled': True, 'm_RootBone': pointer(7),
        'm_Bones': [pointer(7)], 'm_Materials': [], 'm_Mesh': pointer(0),
    }),
    unity_object('SkinnedMeshRenderer', 24, {
        'm_GameObject': pointer(5), 'm_Enabled': True, 'm_RootBone': pointer(9),
        'm_Bones': [pointer(9)], 'm_Materials': [], 'm_Mesh': pointer(0),
    }),
    unity_object('MonoBehaviour', 30, {
        'm_GameObject': pointer(1),
        'mainWeapon': pointer(7),
        'subWeapon': [pointer(9), pointer(99)],
    }),
]
containers = [{
    'path': 'Assets/_MX/AddressableAsset/Character/A/Cafe/Cafe_A.prefab',
    'target': {'file': 'CAB-prefab', 'pathId': '1'},
}]
print(json.dumps(character_assembly(objects, containers, 'h' * 64)))
`
  const result = spawnSync(python.command, [...python.args, '-c', fixture], { encoding: 'utf8', windowsHide: true })
  assert.equal(result.status, 0, result.stderr || result.error?.message)
  const assembly = JSON.parse(result.stdout)[0]
  assert.deepEqual(assembly.attachments.equipmentRendererReferences.map(reference => reference.objectId), ['24'])
  assert.deepEqual(assembly.attachments.equipmentRendererAmbiguities.map(item => [item.attachment.pathId, item.reasonCode]), [
    ['7', 'ambiguous-equipment-renderer-relation'],
    ['99', 'missing-equipment-renderer-match'],
  ])
  const renderer = assembly.renderers.find(item => item.pathId === '24')
  assert.deepEqual(renderer.transformChain.map(item => item.pathId), ['2', '6'])
  assert.deepEqual(renderer.rootBoneAncestry.map(item => item.pathId), ['2'])
  assert.equal(renderer.rootBoneAncestryComplete, true)
  assert.deepEqual(renderer.rootBoneAncestry.map(item => item.sourceReference), [{
    bundleSha256: 'h'.repeat(64), serializedFile: 'CAB-prefab', objectId: '2',
  }])
  assert.deepEqual(renderer.boneReferences.map(item => item.name), ['Bip001_Weapon_02'])
})

test('raw cache identity changes with producer, Python runtime, and UnityPy dependency bytes only', () => {
  const python = pythonCommand()
  const fixture = String.raw`
import hashlib
import json
import os
import pathlib
import sys
import tempfile
sys.path.insert(0, str(pathlib.Path('scripts/chibi').resolve()))
from inventory import build_metadata_cache_identity, sha256_file

def file_identity(path):
    return {'sha256': sha256_file(path)}

with tempfile.TemporaryDirectory() as directory:
    root = pathlib.Path(directory)
    producers = []
    for name in ('inventory.py', 'shader_extractor.py', 'fx_target_evidence.py'):
        path = root / name
        path.write_bytes(name.encode())
        producers.append((name, path))
    runtime_file = root / 'python-runtime.bin'
    package_file = root / 'UnityPy-package.bin'
    runtime_file.write_bytes(b'runtime-v1')
    package_file.write_bytes(b'unitypy-v1')
    def identity():
        return build_metadata_cache_identity(
            producers,
            file_identity(runtime_file),
            file_identity(package_file),
        )
    original = identity()
    producer_changes = []
    for _, path in producers:
        original_bytes = path.read_bytes()
        path.write_bytes(original_bytes + b'-changed')
        producer_changes.append(identity() != original)
        path.write_bytes(original_bytes)
    runtime_file.write_bytes(b'runtime-v2')
    runtime_changed = identity() != original
    runtime_file.write_bytes(b'runtime-v1')
    package_file.write_bytes(b'unitypy-v2')
    package_changed = identity() != original
    package_file.write_bytes(b'unitypy-v1')
    os.environ['CHIBI_RENDERING_POLICY_VERSION'] = 'policy-only-change'
    policy_change_stable = identity() == original
    unproven_runtime_disables_reuse = build_metadata_cache_identity(producers, None, file_identity(package_file)) is None
    unproven_dependency_disables_reuse = build_metadata_cache_identity(producers, file_identity(runtime_file), None) is None
    print(json.dumps({
        'producerChanges': producer_changes,
        'runtimeChanged': runtime_changed,
        'packageChanged': package_changed,
        'policyChangeStable': policy_change_stable,
        'unprovenRuntimeDisablesReuse': unproven_runtime_disables_reuse,
        'unprovenDependencyDisablesReuse': unproven_dependency_disables_reuse,
    }))
`
  const result = spawnSync(python.command, [...python.args, '-c', fixture], { encoding: 'utf8', windowsHide: true })
  assert.equal(result.status, 0, result.stderr || result.error?.message)
  assert.deepEqual(JSON.parse(result.stdout), {
    producerChanges: [true, true, true],
    runtimeChanged: true,
    packageChanged: true,
    policyChangeStable: true,
    unprovenRuntimeDisablesReuse: true,
    unprovenDependencyDisablesReuse: true,
  })
})

test('raw cache requires a matching checksum receipt and rejects legacy, corrupt, or truncated input', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-inventory-cache '))
  try {
    const source = path.join(root, 'BAAD')
    const output = path.join(root, 'inventory.raw.json')
    const legacy = path.join(root, 'legacy.raw.json')
    await mkdir(source, { recursive: true })
    const python = pythonCommand()
    const fixture = String.raw`
import json
import pathlib
import sys
sys.path.insert(0, str(pathlib.Path('scripts/chibi').resolve()))
from inventory import load_cached_inventory, write_cached_inventory

root = pathlib.Path(sys.argv[1])
source = (root / 'BAAD').resolve()
output = root / 'inventory.raw.json'
identity = 'a' * 64
reader = 'unitypy-test+inventory-schema-v2'
payload = {
    'version': 2,
    'source': str(source),
    'metadataReader': reader,
    'metadataCacheIdentity': identity,
    'files': [{
        'path': 'AssetBundles/a.zip', 'sha256': 'b' * 64, 'entries': [
            {'sha256': 'c' * 64, 'metadata': {'assembly': {'renderers': []}}},
        ],
    }],
}
output.parent.mkdir(parents=True, exist_ok=True)
write_cached_inventory(output, payload)
valid = load_cached_inventory(output, source, reader, identity)
legacy = root / 'legacy.raw.json'
legacy.write_text(json.dumps(payload), encoding='utf-8')
legacy_result = load_cached_inventory(legacy, source, reader, identity)
other_root = (root / 'OTHER').resolve()
wrong_root = load_cached_inventory(output, other_root, reader, identity)
wrong_identity = load_cached_inventory(output, source, reader, 'd' * 64)
wrong_reader = load_cached_inventory(output, source, reader + '-changed', identity)
original_raw = output.read_bytes()
receipt_path = root / 'inventory.raw.json.cache.json'
original_receipt = receipt_path.read_bytes()
tampered = json.loads(original_raw)
tampered['files'][0]['entries'][0]['metadata']['assembly']['renderers'].append({'sourceReference': 'forged'})
output.write_text(json.dumps(tampered), encoding='utf-8')
valid_json_tamper = load_cached_inventory(output, source, reader, identity)
output.write_bytes(original_raw)
output.write_bytes(output.read_bytes()[:-1])
corrupt = load_cached_inventory(output, source, reader, identity)
output.write_bytes(b'{')
truncated = load_cached_inventory(output, source, reader, identity)
new_payload = dict(payload)
new_payload['files'] = [dict(payload['files'][0], sha256='e' * 64)]
write_cached_inventory(output, new_payload)
receipt_path.write_bytes(original_receipt)
mixed_pair = load_cached_inventory(output, source, reader, identity)
print(json.dumps({
    'valid': valid[2] is None and 'AssetBundles/a.zip' in valid[0] and 'c' * 64 in valid[1],
    'legacyMiss': 'receipt missing' in legacy_result[2],
    'rootMismatch': 'source root' in wrong_root[2],
    'identityMismatch': 'identity changed' in wrong_identity[2],
    'readerMismatch': 'reader schema changed' in wrong_reader[2],
    'validJsonTamper': 'checksum' in valid_json_tamper[2],
    'corruptMiss': 'checksum' in corrupt[2],
    'truncatedMiss': 'checksum' in truncated[2],
    'mixedPairMiss': 'checksum' in mixed_pair[2],
    'unprovenIdentityMiss': 'identity is unproven' in load_cached_inventory(output, source, reader, None)[2],
}))
`
    const result = spawnSync(python.command, [...python.args, '-c', fixture, root], { encoding: 'utf8', windowsHide: true })
    assert.equal(result.status, 0, result.stderr || result.error?.message)
    assert.deepEqual(JSON.parse(result.stdout), {
      valid: true,
      legacyMiss: true,
      rootMismatch: true,
      identityMismatch: true,
      readerMismatch: true,
      validJsonTamper: true,
      corruptMiss: true,
      truncatedMiss: true,
      mixedPairMiss: true,
      unprovenIdentityMiss: true,
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('fresh file hashes preserve unchanged per-file reuse while detecting same-size same-mtime edits and roster changes', () => {
  const python = pythonCommand()
  const fixture = String.raw`
import json
import os
import pathlib
import sys
import tempfile
sys.path.insert(0, str(pathlib.Path('scripts/chibi').resolve()))
from inventory import reuse_previous_file_record, sha256_file, _source_files_digest, source_archive_paths

with tempfile.TemporaryDirectory() as directory:
    root = pathlib.Path(directory)
    source = root / 'BAAD'
    source.mkdir()
    unchanged = source / 'unchanged.zip'
    changed = source / 'changed.zip'
    removed = source / 'removed.zip'
    unchanged.write_bytes(b'AAAA')
    changed.write_bytes(b'BBBB')
    removed.write_bytes(b'REMOVED')
    changed_stat = changed.stat()
    old_changed_hash = sha256_file(changed)
    old_unchanged_hash = sha256_file(unchanged)
    previous = {
        'unchanged.zip': {'path': 'unchanged.zip', 'sha256': old_unchanged_hash, 'modifiedNs': 1, 'entries': []},
        'changed.zip': {'path': 'changed.zip', 'sha256': old_changed_hash, 'modifiedNs': 2, 'entries': []},
        'removed.zip': {'path': 'removed.zip', 'sha256': 'c' * 64, 'modifiedNs': 3, 'entries': []},
    }
    removed.unlink()
    for hidden in ['.baad-download/job', '.baad-previous']:
        (source / hidden).mkdir(parents=True)
        (source / hidden / 'ignored.zip').write_bytes(b'IGNORED')
    (source / 'new.zip').write_bytes(b'NEW')
    changed.write_bytes(b'CCCC')
    os.utime(changed, ns=(changed_stat.st_atime_ns, changed_stat.st_mtime_ns))
    current_paths = source_archive_paths(source)
    current_names = [path.name for path in current_paths]
    current_records = {
        path.name: reuse_previous_file_record(previous, path.name, sha256_file(path), path.stat().st_mtime_ns)
        for path in current_paths
    }
    old_set = _source_files_digest(list(previous.values()))
    current_set = _source_files_digest([
        {'path': 'changed.zip', 'sha256': sha256_file(changed)},
        {'path': 'new.zip', 'sha256': sha256_file(source / 'new.zip')},
        {'path': 'unchanged.zip', 'sha256': sha256_file(unchanged)},
    ])
    print(json.dumps({
        'currentEnumeration': current_names,
        'unchangedReused': current_records['unchanged.zip'] is not None,
        'sameSizeSameMtimeChangedMisses': changed.stat().st_size == changed_stat.st_size and changed.stat().st_mtime_ns == changed_stat.st_mtime_ns and current_records['changed.zip'] is None,
        'newFileMisses': current_records['new.zip'] is None,
        'removedFileNotEnumerated': 'removed.zip' not in current_names,
        'sourceSetChanges': old_set != current_set,
    }))
`
  const result = spawnSync(python.command, [...python.args, '-c', fixture], { encoding: 'utf8', windowsHide: true })
  assert.equal(result.status, 0, result.stderr || result.error?.message)
  assert.deepEqual(JSON.parse(result.stdout), {
    currentEnumeration: ['changed.zip', 'new.zip', 'unchanged.zip'],
    unchangedReused: true,
    sameSizeSameMtimeChangedMisses: true,
    newFileMisses: true,
    removedFileNotEnumerated: true,
    sourceSetChanges: true,
  })
})

test('runtime and installed-distribution collectors hash their bytes and reject missing, ambiguous, or escaped evidence', () => {
  const python = pythonCommand()
  const fixture = String.raw`
import json
import pathlib
import sys
import tempfile
from types import SimpleNamespace
sys.path.insert(0, str(pathlib.Path('scripts/chibi').resolve()))
import inventory

with tempfile.TemporaryDirectory() as directory:
    root = pathlib.Path(directory)
    prefix = root / 'python'
    stdlib = prefix / 'Lib'
    dlls = prefix / 'DLLs'
    site = stdlib / 'site-packages'
    scripts = prefix / 'Scripts'
    for path in (stdlib, dlls, site, scripts):
        path.mkdir(parents=True, exist_ok=True)
    executable = scripts / 'python.exe'
    runtime_dll = prefix / 'python-test.dll'
    runtime_module = stdlib / 'json.py'
    native_module = dlls / '_sample.pyd'
    package_module = site / 'demo' / '__init__.py'
    script_entry = scripts / 'pip.exe'
    shadowed_site_module = site / 'shadowed_dependency.py'
    outside_file = root / 'outside.bin'
    for path, data in ((executable, b'exe'), (runtime_dll, b'dll'), (runtime_module, b'stdlib'),
                       (native_module, b'native'), (package_module, b'package'), (script_entry, b'script'),
                       (shadowed_site_module, b'shadowed'), (outside_file, b'outside')):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    old_executable, old_prefix, old_base_prefix, old_path = sys.executable, sys.prefix, sys.base_prefix, sys.path
    old_get_path, old_runtime_library = inventory.sysconfig.get_path, inventory._loaded_python_runtime_library
    try:
        sys.executable = str(executable)
        sys.prefix = str(prefix)
        sys.base_prefix = str(prefix)
        sys.path = [str(stdlib), str(dlls), str(site)]
        inventory.sysconfig.get_path = lambda key: {'stdlib': str(stdlib), 'purelib': str(site), 'platlib': str(site)}[key]
        inventory._loaded_python_runtime_library = lambda: runtime_dll
        runtime_before = inventory._python_runtime_identity()
        native_module.write_bytes(b'native-changed')
        runtime_after = inventory._python_runtime_identity()
        inventory._loaded_python_runtime_library = lambda: root / 'missing-runtime.dll'
        try:
            inventory._python_runtime_identity()
            missing_runtime_rejected = False
        except inventory.CacheIdentityUnavailable:
            missing_runtime_rejected = True
    finally:
        sys.executable, sys.prefix, sys.base_prefix, sys.path = old_executable, old_prefix, old_base_prefix, old_path
        inventory.sysconfig.get_path = old_get_path
        inventory._loaded_python_runtime_library = old_runtime_library

    class FakeDistribution:
        def __init__(self, name, files):
            self.metadata = {'Name': name}
            self.version = '1.0'
            self.files = files
        def locate_file(self, item):
            return site / pathlib.Path(str(item))

    files = [pathlib.PurePosixPath('demo/__init__.py'), pathlib.PurePosixPath('../../Scripts/pip.exe')]
    dist = FakeDistribution('demo-package', files)
    records_before, package_paths = inventory._distribution_file_records(dist, 'demo-package', [prefix])
    package_module.write_bytes(b'package-changed')
    records_after, _ = inventory._distribution_file_records(dist, 'demo-package', [prefix])
    runtime_identity = {
        'hashedModulePaths': runtime_after['hashedModulePaths'],
        'stdlibArchives': runtime_after['stdlibArchives'],
    }
    inventory._validate_imported_module_anchors([('demo', package_module)], package_paths, runtime_identity, [])
    try:
        inventory._validate_imported_module_anchors([('shadowed', shadowed_site_module)], package_paths, runtime_identity, [])
        shadowed_module_rejected = False
    except inventory.CacheIdentityUnavailable:
        shadowed_module_rejected = True
    try:
        inventory._distribution_file_records(FakeDistribution('missing-record', None), 'missing-record', [prefix])
        missing_record_rejected = False
    except inventory.CacheIdentityUnavailable:
        missing_record_rejected = True
    try:
        escaped = FakeDistribution('escaped', [pathlib.PurePosixPath('../../../outside.bin')])
        inventory._distribution_file_records(escaped, 'escaped', [prefix])
        outside_record_rejected = False
    except inventory.CacheIdentityUnavailable:
        outside_record_rejected = True
    previous_distributions = inventory.importlib.metadata.distributions
    try:
        inventory.importlib.metadata.distributions = lambda: [
            SimpleNamespace(metadata={'Name': 'ambiguous'}),
            SimpleNamespace(metadata={'Name': 'ambiguous'}),
        ]
        try:
            inventory._unique_distribution('ambiguous')
            ambiguous_distribution_rejected = False
        except inventory.CacheIdentityUnavailable:
            ambiguous_distribution_rejected = True
    finally:
        inventory.importlib.metadata.distributions = previous_distributions

    print(json.dumps({
        'runtimeBytesChangeIdentity': runtime_before['files'] != runtime_after['files'],
        'runtimeDllsOutsideLibHashed': any(item['path'].endswith('DLLs/_sample.pyd') for item in runtime_after['files']),
        'missingRuntimeRejected': missing_runtime_rejected,
        'packageBytesChangeIdentity': records_before != records_after,
        'recordedScriptInsidePrefixAccepted': str(script_entry.resolve()).casefold() in package_paths,
        'importedModuleAnchored': True,
        'shadowedModuleRejected': shadowed_module_rejected,
        'missingRecordRejected': missing_record_rejected,
        'outsideRecordRejected': outside_record_rejected,
        'ambiguousDistributionRejected': ambiguous_distribution_rejected,
    }))
`
  const result = spawnSync(python.command, [...python.args, '-c', fixture], { encoding: 'utf8', windowsHide: true })
  assert.equal(result.status, 0, result.stderr || result.error?.message)
  assert.deepEqual(JSON.parse(result.stdout), {
    runtimeBytesChangeIdentity: true,
    runtimeDllsOutsideLibHashed: true,
    missingRuntimeRejected: true,
    packageBytesChangeIdentity: true,
    recordedScriptInsidePrefixAccepted: true,
    importedModuleAnchored: true,
    shadowedModuleRejected: true,
    missingRecordRejected: true,
    outsideRecordRejected: true,
    ambiguousDistributionRejected: true,
  })
})
