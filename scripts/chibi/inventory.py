#!/usr/bin/env python3
"""Build a content-addressed inventory of BAAD archives and Unity bundles."""

from __future__ import annotations

import hashlib
import importlib.machinery
import importlib.metadata
import json
import math
import os
import pathlib
import re
import sys
import sysconfig
import zipfile

try:
    import UnityPy
except ImportError:
    UnityPy = None

try:
    from shader_extractor import ShaderExtractionError, extract_shader_object
except ImportError:  # pragma: no cover - source inventory may run without the extractor module.
    ShaderExtractionError = ValueError
    extract_shader_object = None

from fx_target_evidence import extract_fx_target_evidence

CHUNK = 1024 * 1024
MAX_BUNDLE_BYTES = 256 * 1024 * 1024
INVENTORY_SCHEMA_VERSION = "inventory-schema-v2"
CACHE_RECEIPT_SCHEMA_VERSION = 1

DSFX_ALPHA_BLEND_0_BUNDLE_SHA256 = "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c"
DSFX_ALPHA_BLEND_0_SERIALIZED_FILE = "CAB-428091522b4007f213bf16532c4528a1"
DSFX_ALPHA_BLEND_0_OBJECT_ID = "-660637482714961986"
DSFX_ALPHA_BLEND_0_PROGRAM_BLOB_SHA256 = "65b652e79bbcce530203321da335999c19212fc25807233878f6853813931576"

# DSFX/FX_SHADER_AlphaBlend_Add is source-selected only for the verified Unity
# shader object used by the additive alpha-blend effect.  Keep extraction keyed
# to the complete object identity and compressed program blob so a same-name
# revision cannot opt into executable-source extraction accidentally.
DSFX_ALPHA_BLEND_ADD_BUNDLE_SHA256 = "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c"
DSFX_ALPHA_BLEND_ADD_SERIALIZED_FILE = "CAB-428091522b4007f213bf16532c4528a1"
DSFX_ALPHA_BLEND_ADD_OBJECT_ID = "3898777625326355543"
DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256 = "44e96adec490724b76b094666ab9533d0814f804b2698b336672025b5f9607af"

# DSFX/FX_SHADER_AlphaBlend_Add_Distort_0 is source-selected only for the
# verified Unity shader object used by the additive alpha-blend distortion
# effect.  Keep extraction keyed to the complete object identity and
# compressed program blob so a same-name revision cannot opt into executable-
# source extraction accidentally.
DSFX_ALPHA_BLEND_ADD_DISTORT_0_BUNDLE_SHA256 = "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c"
DSFX_ALPHA_BLEND_ADD_DISTORT_0_SERIALIZED_FILE = "CAB-428091522b4007f213bf16532c4528a1"
DSFX_ALPHA_BLEND_ADD_DISTORT_0_OBJECT_ID = "6006448949377491269"
DSFX_ALPHA_BLEND_ADD_DISTORT_0_PROGRAM_BLOB_SHA256 = "e6325f5dbd1911311f317dfda751bb1bfe2da4c72f0ab7032ad6d12d5f3cfbe0"

# DSFX/FX_SHADER_Step_Distort_0 is source-selected only for the verified Unity
# shader object used by the step-distortion effect.  Keep extraction keyed to
# the complete object identity and compressed program blob so a same-name
# revision cannot opt into executable-source extraction accidentally.
DSFX_STEP_DISTORT_0_BUNDLE_SHA256 = "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c"
DSFX_STEP_DISTORT_0_SERIALIZED_FILE = "CAB-428091522b4007f213bf16532c4528a1"
DSFX_STEP_DISTORT_0_OBJECT_ID = "-4662715053483388292"
DSFX_STEP_DISTORT_0_PROGRAM_BLOB_SHA256 = "78ba7c46bee7433cce485cd1eb1276c70bef6fc0593eea9adf65b714f25e16f3"

# DSFX/FX_SHADER_Additive_0 is source-selected only for the verified Unity
# shader object used by the additive effect.  Keep extraction keyed to the
# complete object identity and compressed program blob so a same-name
# revision cannot opt into executable-source extraction accidentally.
DSFX_ADDITIVE_0_BUNDLE_SHA256 = "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c"
DSFX_ADDITIVE_0_SERIALIZED_FILE = "CAB-428091522b4007f213bf16532c4528a1"
DSFX_ADDITIVE_0_OBJECT_ID = "-4115771715742154417"
DSFX_ADDITIVE_0_PROGRAM_BLOB_SHA256 = "90b5288cb90cc49fbe68b9b8dac5f821c125c6954b9a4e64e4d66564f7668808"

# DSFX/FX_SHADER_Glitch_Tex is source-selected only for the verified Unity
# shader object used by CH0060.  Keep extraction keyed to the complete object
# identity and compressed program blob so a same-name revision cannot opt into
# the runtime adapter accidentally.
DSFX_GLITCH_TEX_BUNDLE_SHA256 = "27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85"
DSFX_GLITCH_TEX_SERIALIZED_FILE = "CAB-38d7f184c16228480d78cd7ea10cae27"
DSFX_GLITCH_TEX_OBJECT_ID = "-50954330373109545"
DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256 = "b8f29baf75b913a1231adf3c24f8a24b179deaee5bbc03a0e145984c691a15a0"

# DSFX/FX_SHADER_Matcap is source-selected only for the verified Unity shader
# object used by CH0191.  Keep extraction keyed to the complete object
# identity and compressed program blob so a same-name revision cannot opt into
# the runtime adapter accidentally.
DSFX_MATCAP_BUNDLE_SHA256 = "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c"
DSFX_MATCAP_SERIALIZED_FILE = "CAB-428091522b4007f213bf16532c4528a1"
DSFX_MATCAP_OBJECT_ID = "-2917564576425350283"
DSFX_MATCAP_PROGRAM_BLOB_SHA256 = "3da48932a17f98d5de6fc428f1ba992e824152b12be7e30a169cae5de3c1ba9d"

# ProjectMX/WeaponTest1Damage is the one currently authored weapon shader
# revision for which the profile can select source programs.  Keep this
# selector exact: a shader name by itself is not enough to opt an arbitrary
# revision into executable-source extraction.
PROJECTMX_WEAPON_BUNDLE_SHA256 = "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c"
PROJECTMX_WEAPON_SERIALIZED_FILE = "CAB-428091522b4007f213bf16532c4528a1"
PROJECTMX_WEAPON_OBJECT_ID = "-2179428789015729742"
PROJECTMX_WEAPON_PROGRAM_BLOB_SHA256 = "962e3b88b0cc42a36e31e8eb2ba538d3cc571d37f4bec4aca1b30e14a6927e0b"

# MX/E-Standard uses a large Unity 2021 compressedBlob list.  Keep extraction
# selection tied to the complete source identity and blob hash so a same-name
# shader revision cannot opt itself into executable-source metadata.
E_STANDARD_BUNDLE_SHA256 = "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c"
E_STANDARD_SERIALIZED_FILE = "CAB-428091522b4007f213bf16532c4528a1"
E_STANDARD_OBJECT_ID = "-8678996592869746170"
E_STANDARD_PROGRAM_BLOB_SHA256 = "b3edadb8e9c86afdab206cab761a0a574ee8e0baa75183cc24147a4e02ea1288"

# Unity stores references to built-in assets as external PPtrs.  The external
# GUID and path ID are the identity; a mesh name (or exporter order) is not.
# 10210 is the built-in Quad used by the BAAD source prefabs.
UNITY_BUILTIN_RESOURCES_GUID = "00000000000000000e00000000000000"
UNITY_BUILTIN_RESOURCES_FILE = "unity default resources"
UNITY_BUILTIN_QUAD_PATH_ID = "10210"
UNITY_BUILTIN_QUAD_NAME = "Quad"


def progress(message):
    if os.environ.get("CHIBI_INVENTORY_PROGRESS") == "1":
        print(f"[chibi-inventory] {message}", file=sys.stderr, flush=True)


def sha256_file(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(CHUNK), b""):
            digest.update(chunk)
    return digest.hexdigest()


class CacheIdentityUnavailable(RuntimeError):
    """The current producer/runtime bytes cannot be proven for safe reuse."""


def _canonical_json_sha256(value) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _identity_file(path: pathlib.Path, label: str):
    if path.is_symlink():
        raise CacheIdentityUnavailable(f"{label} is a symbolic link")
    try:
        resolved = path.resolve(strict=True)
    except OSError as error:
        raise CacheIdentityUnavailable(f"{label} cannot be resolved to an installed file") from error
    if not resolved.is_file():
        raise CacheIdentityUnavailable(f"{label} is not a regular file")
    return {"path": label, "sha256": sha256_file(resolved)}


def _loaded_python_runtime_library():
    if os.name == "nt":
        handle = getattr(sys, "dllhandle", None)
        if not handle:
            raise CacheIdentityUnavailable("loaded Windows Python runtime handle is unavailable")
        try:
            import ctypes
            kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
            get_module_file_name = kernel32.GetModuleFileNameW
            get_module_file_name.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p, ctypes.c_uint]
            get_module_file_name.restype = ctypes.c_uint
            buffer = ctypes.create_unicode_buffer(32768)
            length = get_module_file_name(ctypes.c_void_p(handle), buffer, len(buffer))
        except (AttributeError, OSError) as error:
            raise CacheIdentityUnavailable("loaded Windows Python runtime path could not be resolved") from error
        if not length or length >= len(buffer):
            raise CacheIdentityUnavailable("loaded Windows Python runtime path could not be resolved")
        return pathlib.Path(buffer.value)

    library_name = sysconfig.get_config_var("LDLIBRARY")
    if not library_name:
        raise CacheIdentityUnavailable("Python shared runtime library name is unavailable")
    roots = [
        pathlib.Path(sys.base_prefix),
        pathlib.Path(sys.prefix),
        pathlib.Path(sys.executable).parent,
        pathlib.Path(sysconfig.get_config_var("LIBDIR") or sys.base_prefix),
        pathlib.Path(sysconfig.get_config_var("LIBPL") or sys.base_prefix),
    ]
    matches = {}
    for root in roots:
        candidate = root / library_name
        if candidate.is_file():
            resolved = candidate.resolve(strict=True)
            matches[str(resolved).casefold()] = resolved
    if len(matches) != 1:
        raise CacheIdentityUnavailable("Python shared runtime library is missing or ambiguous")
    return next(iter(matches.values()))


def _python_runtime_identity():
    if not sys.executable:
        raise CacheIdentityUnavailable("Python executable path is unavailable")
    executable = pathlib.Path(sys.executable)
    library_path = _loaded_python_runtime_library()

    stdlib_value = sysconfig.get_path("stdlib")
    if not stdlib_value:
        raise CacheIdentityUnavailable("Python standard-library root is unavailable")
    stdlib = pathlib.Path(stdlib_value).resolve(strict=True)
    if not stdlib.is_dir():
        raise CacheIdentityUnavailable("Python standard-library root is not a directory")

    excluded_roots = []
    for key in ("purelib", "platlib"):
        value = sysconfig.get_path(key)
        if value:
            excluded_roots.append(pathlib.Path(value).resolve())
    code_suffixes = {".py", ".pyw", ".dll", ".pyd", ".so", ".dylib"}
    runtime_files = [
        _identity_file(executable, "python-executable"),
        _identity_file(library_path, "python-shared-runtime"),
    ]
    runtime_module_paths = set()
    module_roots = {str(stdlib).casefold(): (stdlib, "stdlib")}
    base_prefix = pathlib.Path(sys.base_prefix).resolve()
    for entry in sys.path:
        if not entry:
            continue
        candidate = pathlib.Path(entry)
        if not candidate.is_dir():
            continue
        resolved = candidate.resolve(strict=True)
        if any(resolved == excluded or excluded in resolved.parents for excluded in excluded_roots):
            continue
        if base_prefix == resolved or base_prefix in resolved.parents:
            module_roots.setdefault(str(resolved).casefold(), (resolved, f"python-path/{resolved.relative_to(base_prefix).as_posix()}"))
    for root, label in sorted(module_roots.values(), key=lambda item: str(item[0]).casefold()):
        for path in sorted(root.rglob("*"), key=lambda item: item.relative_to(root).as_posix()):
            if "__pycache__" in path.parts or not path.is_file():
                continue
            resolved = path.resolve(strict=True)
            if any(resolved == excluded or excluded in resolved.parents for excluded in excluded_roots):
                continue
            if path.suffix.lower() not in code_suffixes and not any(path.name.endswith(suffix) for suffix in importlib.machinery.EXTENSION_SUFFIXES):
                continue
            relative = path.relative_to(root).as_posix()
            runtime_files.append(_identity_file(path, f"{label}/{relative}"))
            runtime_module_paths.add(str(resolved).casefold())

    # Python may load its standard library from a zip archive instead of files.
    stdlib_archives = []
    for entry in sys.path:
        if not entry or pathlib.Path(entry).suffix.lower() != ".zip":
            continue
        archive = pathlib.Path(entry)
        if not archive.is_file():
            continue
        resolved = archive.resolve(strict=True)
        if any(resolved == root or root in resolved.parents for root in excluded_roots):
            continue
        runtime_files.append(_identity_file(resolved, f"stdlib-archive/{archive.name}"))
        stdlib_archives.append(str(resolved))

    return {
        "implementation": sys.implementation.name,
        "version": sys.version,
        "cacheTag": sys.implementation.cache_tag,
        "platform": sysconfig.get_platform(),
        "files": runtime_files,
        "hashedModulePaths": sorted(runtime_module_paths),
        "stdlibArchives": sorted(stdlib_archives, key=str.casefold),
    }


def _canonical_distribution_name(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def _unique_distribution(name: str):
    normalized = _canonical_distribution_name(name)
    matches = [
        item for item in importlib.metadata.distributions()
        if _canonical_distribution_name(item.metadata.get("Name", "")) == normalized
    ]
    if len(matches) != 1:
        raise CacheIdentityUnavailable(f"Python distribution {name!r} is missing or ambiguous")
    return matches[0]


def _distribution_file_records(distribution, name: str, allowed_roots):
    declared_files = distribution.files
    if not declared_files:
        raise CacheIdentityUnavailable(f"Python distribution {name!r} has no installed-file record")
    roots = [pathlib.Path(root).resolve() for root in allowed_roots]
    records, paths = [], set()
    for item in sorted(declared_files, key=lambda value: str(value).replace("\\", "/")):
        relative = str(item).replace("\\", "/")
        if pathlib.PurePosixPath(relative).is_absolute():
            raise CacheIdentityUnavailable(f"Python distribution {name!r} has an absolute file record")
        path = pathlib.Path(distribution.locate_file(item))
        if path.is_symlink():
            raise CacheIdentityUnavailable(f"Python distribution {name!r} contains a symbolic link")
        resolved = path.resolve(strict=True)
        if not any(resolved == root or root in resolved.parents for root in roots):
            raise CacheIdentityUnavailable(f"Python distribution {name!r} contains a file outside its pinned roots")
        records.append(_identity_file(resolved, f"{_canonical_distribution_name(name)}/{relative}"))
        paths.add(str(resolved).casefold())
    if not records:
        raise CacheIdentityUnavailable(f"Python distribution {name!r} has no hashable installed files")
    return records, paths


def _validate_imported_module_anchors(modules, package_paths, runtime_identity, producer_paths):
    package_paths = {str(path).casefold() for path in package_paths}
    producer_paths = {str(pathlib.Path(path).resolve(strict=True)).casefold() for path in producer_paths}
    runtime_paths = {str(path).casefold() for path in runtime_identity["hashedModulePaths"]}
    stdlib_archives = [str(path).casefold() for path in runtime_identity["stdlibArchives"]]
    for module_name, module_path in modules:
        if not module_path:
            continue
        raw_path = str(module_path)
        raw_lower = raw_path.casefold()
        if any(raw_lower.startswith(archive + os.sep.casefold()) for archive in stdlib_archives):
            continue
        resolved = pathlib.Path(module_path).resolve(strict=True)
        resolved_lower = str(resolved).casefold()
        if resolved_lower in package_paths or resolved_lower in producer_paths or resolved_lower in runtime_paths:
            continue
        raise CacheIdentityUnavailable(f"imported module {module_name!r} is outside the hashed runtime and dependency closure")


def _unitypy_dependency_identity(runtime_identity):
    try:
        unitypy_dist = _unique_distribution("UnityPy")
    except CacheIdentityUnavailable:
        if UnityPy is None:
            return {"state": "not-installed"}
        raise
    if UnityPy is None:
        raise CacheIdentityUnavailable("UnityPy distribution exists but the runtime import failed")
    if str(getattr(UnityPy, "__version__", "")) != str(unitypy_dist.version):
        raise CacheIdentityUnavailable("imported UnityPy version does not match its installed distribution")

    try:
        from pip._vendor.packaging.markers import default_environment
        from pip._vendor.packaging.requirements import Requirement
    except ImportError as error:
        raise CacheIdentityUnavailable("pip's vendored packaging is unavailable for UnityPy dependency proof") from error

    environment = default_environment()
    environment["extra"] = ""
    pending = ["UnityPy", "pip"]
    distributions = {}
    package_paths = set()
    allowed_roots = [pathlib.Path(sys.prefix), pathlib.Path(sys.base_prefix)]
    while pending:
        name = pending.pop()
        normalized = _canonical_distribution_name(name)
        if normalized in distributions:
            continue
        distribution = _unique_distribution(name)
        version = distribution.version
        records, paths = _distribution_file_records(distribution, name, allowed_roots)
        distributions[normalized] = {"name": normalized, "version": version, "files": records}
        package_paths.update(paths)

        for raw_requirement in distribution.requires or []:
            requirement = Requirement(raw_requirement)
            if requirement.marker is not None and not requirement.marker.evaluate(environment):
                continue
            if requirement.extras:
                raise CacheIdentityUnavailable(f"active dependency {requirement.name!r} requests unproven extras")
            dependency = _unique_distribution(requirement.name)
            if requirement.specifier and not requirement.specifier.contains(dependency.version, prereleases=True):
                raise CacheIdentityUnavailable(f"installed {requirement.name!r} does not satisfy UnityPy's recorded requirement")
            pending.append(requirement.name)

    producer_paths = [path for _, path in [
        ("inventory.py", pathlib.Path(__file__)),
        ("shader_extractor.py", pathlib.Path(__file__).with_name("shader_extractor.py")),
        ("fx_target_evidence.py", pathlib.Path(__file__).with_name("fx_target_evidence.py")),
    ]]
    modules = [(name, getattr(module, "__file__", None)) for name, module in sys.modules.items()]
    _validate_imported_module_anchors(modules, package_paths, runtime_identity, producer_paths)
    return {"state": "installed", "distributions": [distributions[key] for key in sorted(distributions)]}


def build_metadata_cache_identity(producer_files, runtime_identity, dependency_identity):
    """Hash only byte-derived inventory producers and their Python runtime inputs."""
    if runtime_identity is None or dependency_identity is None:
        return None
    producers = []
    for label, path in producer_files:
        producers.append(_identity_file(pathlib.Path(path), label))
    identity = {
        "schema": 1,
        "producerFiles": producers,
        "pythonRuntime": runtime_identity,
        "unitypyDependencies": dependency_identity,
    }
    return _canonical_json_sha256(identity)


def metadata_cache_identity():
    producer_root = pathlib.Path(__file__).resolve().parent
    producer_files = [
        ("inventory.py", producer_root / "inventory.py"),
        ("shader_extractor.py", producer_root / "shader_extractor.py"),
        ("fx_target_evidence.py", producer_root / "fx_target_evidence.py"),
    ]
    for module_name, (_, expected_path) in zip((__name__, "shader_extractor", "fx_target_evidence"), producer_files):
        module = sys.modules.get(module_name)
        module_path = getattr(module, "__file__", None) if module is not None else None
        if module_path and pathlib.Path(module_path).resolve(strict=True) != expected_path.resolve(strict=True):
            raise CacheIdentityUnavailable(f"loaded {module_name} module does not match the pinned local producer file")
    runtime = _python_runtime_identity()
    runtime["unityPyImportAvailable"] = UnityPy is not None
    runtime["shaderExtractorImportAvailable"] = extract_shader_object is not None
    dependencies = _unitypy_dependency_identity(runtime)
    return build_metadata_cache_identity(producer_files, runtime, dependencies)


def _source_files_digest(files):
    entries = []
    paths = set()
    for item in files:
        if not isinstance(item, dict):
            raise ValueError("cached source file record is not an object")
        relative, digest = item.get("path"), item.get("sha256")
        if not isinstance(relative, str) or not relative or relative in paths:
            raise ValueError("cached source file path is missing or duplicated")
        if not isinstance(digest, str) or re.fullmatch(r"[0-9a-f]{64}", digest) is None:
            raise ValueError("cached source file checksum is malformed")
        paths.add(relative)
        entries.append([relative, digest])
    entries.sort(key=lambda item: item[0])
    return _canonical_json_sha256(entries)


def _validate_cached_files(files):
    if not isinstance(files, list):
        raise ValueError("cached inventory files field is malformed")
    previous_files, metadata_cache = {}, {}
    for file_record in files:
        if not isinstance(file_record, dict):
            raise ValueError("cached source file record is malformed")
        path = file_record.get("path")
        entries = file_record.get("entries")
        if not isinstance(path, str) or path in previous_files or not isinstance(entries, list):
            raise ValueError("cached source file path or entries are malformed")
        previous_files[path] = file_record
        for entry in entries:
            if not isinstance(entry, dict):
                raise ValueError("cached bundle entry is malformed")
            digest = entry.get("sha256")
            if digest is not None and (not isinstance(digest, str) or re.fullmatch(r"[0-9a-f]{64}", digest) is None):
                raise ValueError("cached bundle checksum is malformed")
            if digest and isinstance(entry.get("metadata"), dict):
                metadata_cache[digest] = entry["metadata"]
    return previous_files, metadata_cache


def load_cached_inventory(output: pathlib.Path, source: pathlib.Path, reader_version: str, identity):
    if identity is None:
        return {}, {}, "producer/runtime/dependency identity is unproven"
    receipt_path = output.with_name(output.name + ".cache.json")
    if not receipt_path.is_file():
        return {}, {}, "cache receipt missing (legacy raw inventory is not reusable)"
    try:
        raw_bytes = output.read_bytes()
        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
        if not isinstance(receipt, dict) or receipt.get("schemaVersion") != CACHE_RECEIPT_SCHEMA_VERSION:
            raise ValueError("cache receipt schema is unsupported")
        if receipt.get("source") != str(source) or receipt.get("metadataReader") != reader_version:
            raise ValueError("cache receipt source root or reader schema changed")
        if receipt.get("metadataCacheIdentity") != identity:
            raise ValueError("cache receipt producer/runtime identity changed")
        raw_digest = hashlib.sha256(raw_bytes).hexdigest()
        if receipt.get("rawSha256") != raw_digest:
            raise ValueError("raw inventory checksum does not match its receipt")
        cached = json.loads(raw_bytes)
        if not isinstance(cached, dict) or cached.get("version") != 2 or cached.get("source") != str(source):
            raise ValueError("raw inventory header is malformed or belongs to another source root")
        if cached.get("metadataReader") != reader_version or cached.get("metadataCacheIdentity") != identity:
            raise ValueError("raw inventory producer/runtime header changed")
        files = cached.get("files")
        if receipt.get("sourceFileCount") != len(files) or receipt.get("sourceFilesSha256") != _source_files_digest(files):
            raise ValueError("raw inventory source-file index does not match its receipt")
        previous_files, metadata_cache = _validate_cached_files(files)
        return previous_files, metadata_cache, None
    except (OSError, UnicodeError, ValueError, TypeError, json.JSONDecodeError) as error:
        return {}, {}, f"{type(error).__name__}: {error}"


def _atomic_write_bytes(path: pathlib.Path, data: bytes):
    temporary = path.with_name(path.name + f".{os.getpid()}.tmp")
    temporary.write_bytes(data)
    os.replace(temporary, path)


def write_cached_inventory(output: pathlib.Path, payload):
    raw_bytes = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    receipt = {
        "schemaVersion": CACHE_RECEIPT_SCHEMA_VERSION,
        "source": payload["source"],
        "metadataReader": payload["metadataReader"],
        "metadataCacheIdentity": payload.get("metadataCacheIdentity"),
        "rawSha256": hashlib.sha256(raw_bytes).hexdigest(),
        "sourceFileCount": len(payload["files"]),
        "sourceFilesSha256": _source_files_digest(payload["files"]),
    }
    receipt_bytes = json.dumps(receipt, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    _atomic_write_bytes(output, raw_bytes)
    receipt_path = output.with_name(output.name + ".cache.json")
    try:
        _atomic_write_bytes(receipt_path, receipt_bytes)
    except OSError as error:
        # The raw file is still valid output, but the mismatched/missing receipt forces a miss next run.
        progress(f"Could not publish inventory cache receipt; next run will miss the cache ({type(error).__name__}: {error}).")


def reuse_previous_file_record(previous_files, relative, digest, modified_ns):
    previous = previous_files.get(relative)
    if not previous or previous.get("sha256") != digest:
        return None
    record = dict(previous)
    record["modifiedNs"] = modified_ns
    return record


def source_archive_paths(source: pathlib.Path):
    return sorted(item for item in source.rglob("*") if item.is_file()
                  and not item.relative_to(source).parts[0].startswith(".baad-")
                  and item.suffix.lower() in {".zip", ".bundle"})


def pointer_record(pointer, asset):
    if pointer is None:
        return None
    if isinstance(pointer, dict):
        file_id = int(pointer.get("m_FileID", pointer.get("file_id", 0)) or 0)
        path_id = int(pointer.get("m_PathID", pointer.get("path_id", 0)) or 0)
    else:
        file_id = int(getattr(pointer, "file_id", getattr(pointer, "m_FileID", 0)) or 0)
        path_id = int(getattr(pointer, "path_id", getattr(pointer, "m_PathID", 0)) or 0)
    file_name = asset.name
    external_guid = None
    externals = getattr(asset, "externals", [])
    if file_id and file_id <= len(externals):
        external = externals[file_id - 1]
        file_name = str(getattr(external, "name", "") or pathlib.PurePosixPath(str(getattr(external, "path", ""))).name)
        raw_guid = getattr(external, "guid", None)
        if isinstance(raw_guid, (bytes, bytearray, memoryview)):
            external_guid = bytes(raw_guid).hex().lower()
        elif raw_guid:
            external_guid = str(raw_guid).replace("-", "").lower()
    record = {"file": file_name, "pathId": str(path_id)}
    # Retain the serialized external GUID even when it is not one of the
    # accepted built-in resources.  The profile layer can then reject an
    # unknown external identity instead of treating it as a named Quad.
    if external_guid:
        record["externalGuid"] = external_guid
    if (external_guid == UNITY_BUILTIN_RESOURCES_GUID
            and str(file_name).replace("\\", "/").split("/")[-1].lower() == UNITY_BUILTIN_RESOURCES_FILE
            and str(path_id) == UNITY_BUILTIN_QUAD_PATH_ID):
        record["builtinResource"] = {
            "kind": "unity-builtin-resource",
            "guid": UNITY_BUILTIN_RESOURCES_GUID,
            "file": UNITY_BUILTIN_RESOURCES_FILE,
            "pathId": UNITY_BUILTIN_QUAD_PATH_ID,
            "name": UNITY_BUILTIN_QUAD_NAME,
        }
    return record


def source_reference(bundle_sha256, serialized_file, object_id):
    return {
        "bundleSha256": bundle_sha256,
        "serializedFile": str(serialized_file),
        "objectId": str(object_id),
    }


def local_pointer_reference(pointer, asset, bundle_sha256):
    reference = pointer_record(pointer, asset)
    if not reference or reference.get("pathId") == "0" or reference.get("file") != asset.name:
        return None
    return source_reference(bundle_sha256, reference["file"], reference["pathId"])


def is_fx_prefab_container_path(value):
    normalized = str(value).replace("\\", "/").lower()
    return (
        "/_mx/characters/" in normalized
        and re.search(r"/effects?/pref[ae]b/", normalized) is not None
        and normalized.endswith(".prefab")
    )


def is_fx_instantiation_event_function(value):
    return value in ("AniEvt_InstantiateFx", "InstantiateFx")


def fx_event_source_clip_reference(function, bundle_sha256, serialized_file, object_id):
    if not is_fx_instantiation_event_function(function):
        return None
    return source_reference(bundle_sha256, serialized_file, object_id)


def finite_value(value):
    if isinstance(value, float) and not math.isfinite(value):
        return "NaN" if math.isnan(value) else "Infinity" if value > 0 else "-Infinity"
    return value


def normalized_tree(value, asset):
    """Convert Unity typetree values to JSON-safe scalars and source pointers."""
    if isinstance(value, dict):
        if "m_PathID" in value and "m_FileID" in value:
            return pointer_record(value, asset)
        return {str(key): normalized_tree(item, asset) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [normalized_tree(item, asset) for item in value]
    return finite_value(value)


def member(value, key, default=None):
    if isinstance(value, dict):
        return value.get(key, default)
    return getattr(value, key, default)


def pair_values(items):
    for item in items or []:
        if isinstance(item, (list, tuple)) and len(item) >= 2:
            yield str(item[0]), item[1]
        elif isinstance(item, dict):
            name = item.get("first", item.get("key", item.get("name")))
            if name is not None:
                yield str(name), item.get("second", item.get("value"))


def vector(value, keys):
    if value is None:
        return None
    result = {}
    for key in keys:
        component = member(value, key)
        if component is None:
            continue
        try:
            result[key] = finite_value(float(component))
        except (TypeError, ValueError):
            result[key] = str(component)
    return result or None


def local_path_id(pointer):
    if not isinstance(pointer, dict):
        return None
    try:
        return int(pointer.get("m_PathID", 0) or 0)
    except (TypeError, ValueError):
        return None


def compact_pointer(pointer, names):
    path_id = local_path_id(pointer)
    if not path_id:
        return None
    return {"pathId": str(path_id), "name": names.get(path_id)}


def compact_pointer_list(value, names):
    if not isinstance(value, list):
        return []
    return [item for item in (compact_pointer(pointer, names) for pointer in value) if item]


def assembly_value(value, names):
    if isinstance(value, dict):
        if "m_PathID" in value:
            return compact_pointer(value, names)
        if set(value) >= {"x", "y"} and set(value) <= {"x", "y", "z", "w"}:
            return {key: float(value[key]) for key in value if key in {"x", "y", "z", "w"}}
        return None
    if isinstance(value, list):
        return compact_pointer_list(value, names)
    if isinstance(value, (str, int, float, bool)):
        return value
    return None


def present_attachment_value(value):
    """Keep present scalar attachment values, including zero."""
    if value is None:
        return False
    if isinstance(value, (list, dict, str)):
        return bool(value)
    return True


def character_assembly(objects, containers, bundle_sha256):
    """Extract renderer/material bindings and visibility from character prefabs."""
    prefab_roots = {}
    for container in containers:
        prefab_path = str(container.get("path", "")).replace("\\", "/")
        lowered = prefab_path.lower()
        if "/_mx/addressableasset/character/" not in lowered or not lowered.endswith(".prefab"):
            continue
        parts = prefab_path.split("/")
        try:
            character_index = next(index for index, part in enumerate(parts) if part.lower() == "character")
        except StopIteration:
            continue
        relative = parts[character_index + 1:]
        root = relative[-1][:-7] if relative else ""
        if len(relative) == 2 or (len(relative) == 3 and relative[1].lower() in {"cafe", "echelon", "strategy"}):
            prefab_roots[root] = {"path": prefab_path, "target": container.get("target"), "reference": container.get("targetReference")}
    if not prefab_roots:
        return []

    def object_key(file_name, path_id):
        return (str(file_name), str(path_id))

    def pointer_key(pointer, asset):
        reference = pointer_record(pointer, asset)
        if not reference or reference.get("pathId") == "0":
            return None
        return object_key(reference["file"], reference["pathId"])

    gameobjects, transforms, renderers, mesh_filters, behaviours, sorting_groups = {}, {}, [], {}, [], []
    for obj in objects:
        try:
            type_name = obj.type.name
            if type_name not in {"GameObject", "Transform", "SkinnedMeshRenderer", "MeshRenderer", "MeshFilter", "MonoBehaviour", "SortingGroup"}:
                continue
            value = obj.read_typetree()
            key = object_key(obj.assets_file.name, obj.path_id)
            record = (obj, value)
            if type_name == "GameObject": gameobjects[key] = value
            elif type_name == "Transform": transforms[key] = record
            elif type_name == "SkinnedMeshRenderer" or type_name == "MeshRenderer": renderers.append(record)
            elif type_name == "MeshFilter": mesh_filters[key] = record
            elif type_name == "SortingGroup": sorting_groups.append(record)
            else: behaviours.append(record)
        except Exception:
            continue

    go_names = {key: str(value.get("m_Name", "") or "") for key, value in gameobjects.items()}
    go_active = {key: bool(value.get("m_IsActive", True)) for key, value in gameobjects.items()}
    transform_to_go = {key: pointer_key(value.get("m_GameObject"), obj.assets_file) for key, (obj, value) in transforms.items()}
    go_to_transform = {go_key: transform_key for transform_key, go_key in transform_to_go.items() if go_key}

    def root_and_path(go_key):
        chain = transform_chain_for_go(go_key)
        names, active = [], True
        for current in chain:
            go = transform_to_go.get(current)
            if go:
                names.append(go_names.get(go, ""))
                active = active and go_active.get(go, True)
        return (names[0] if names else ""), "/".join(names), active

    def transform_chain_for_go(go_key):
        """Return the exact serialized Transform ancestry, root to renderer GO."""
        transform_key = go_to_transform.get(go_key)
        seen, chain = set(), []
        current = transform_key
        while current and current not in seen:
            seen.add(current)
            chain.append(current)
            transform_record = transforms.get(current)
            if not transform_record:
                break
            obj, value = transform_record
            current = pointer_key(value.get("m_Father"), obj.assets_file)
        chain.reverse()
        return chain

    renderer_to_go = {
        object_key(obj.assets_file.name, obj.path_id): pointer_key(value.get("m_GameObject"), obj.assets_file)
        for obj, value in renderers
    }
    renderer_by_key = {object_key(obj.assets_file.name, obj.path_id): (obj, value) for obj, value in renderers}

    def object_name(reference):
        if not reference:
            return ""
        key = object_key(reference.get("file", ""), reference.get("pathId", ""))
        return go_names.get(key, go_names.get(transform_to_go.get(key), ""))

    def renderer_name(pointer, asset):
        key = pointer_key(pointer, asset)
        return go_names.get(renderer_to_go.get(key), "") if key else ""

    def serialized_pointer(key, include_name=True):
        if not key:
            return None
        record = {"file": key[0], "pathId": key[1]}
        if include_name:
            record["name"] = go_names.get(transform_to_go.get(key), "")
        # Every transform emitted from this bundle has a complete source
        # identity.  Keep that identity beside the file/path pointer so the
        # profile rule can distinguish an authored weapon ancestor from a
        # same-named transform in another bundle.
        if key in transforms:
            record["sourceReference"] = source_reference(bundle_sha256, key[0], key[1])
        return record

    def transform_parent_ancestry(transform_key):
        """Return root-to-parent Transform pointers and whether the chain resolved."""
        if not transform_key or transform_key not in transforms:
            return [], False
        seen = {transform_key}
        parent_keys = []
        current = transform_key
        complete = True
        while current:
            transform_record = transforms.get(current)
            if not transform_record:
                complete = False
                break
            obj, value = transform_record
            parent_pointer = value.get("m_Father")
            parent_key = pointer_key(parent_pointer, obj.assets_file)
            if not parent_key:
                break
            if parent_key in seen:
                complete = False
                break
            seen.add(parent_key)
            parent_keys.append(parent_key)
            # Preserve a foreign/missing parent in the chain.  The profile
            # layer then fails closed on its exact source identity instead of
            # silently treating a truncated ancestry as complete.
            if parent_key not in transforms:
                complete = False
                break
            current = parent_key
        parent_keys.reverse()
        return [serialized_pointer(key) for key in parent_keys], complete

    assemblies = []
    for root in sorted(prefab_roots):
        root_renderers = []
        for obj, value in renderers:
            renderer_key = object_key(obj.assets_file.name, obj.path_id)
            go_key = renderer_to_go.get(renderer_key)
            renderer_root, hierarchy_path, active = root_and_path(go_key)
            if renderer_root != root:
                continue
            material_slots = []
            for slot, pointer in enumerate(value.get("m_Materials", []) or []):
                material_slots.append({"slot": slot, "material": pointer_record(pointer, obj.assets_file),
                    "sourceMaterialReference": local_pointer_reference(pointer, obj.assets_file, bundle_sha256)})
            mesh = pointer_record(value.get("m_Mesh"), obj.assets_file)
            mesh_source_reference = local_pointer_reference(value.get("m_Mesh"), obj.assets_file, bundle_sha256)
            if not mesh:
                for filter_obj, filter_value in mesh_filters.values():
                    filter_go = pointer_key(filter_value.get("m_GameObject"), filter_obj.assets_file)
                    if filter_go == go_key:
                        mesh = pointer_record(filter_value.get("m_Mesh"), filter_obj.assets_file)
                        mesh_source_reference = local_pointer_reference(filter_value.get("m_Mesh"), filter_obj.assets_file, bundle_sha256)
                        break
            root_bone = pointer_record(value.get("m_RootBone"), obj.assets_file)
            if root_bone:
                root_bone["name"] = object_name(root_bone)
                root_bone_reference = local_pointer_reference(value.get("m_RootBone"), obj.assets_file, bundle_sha256)
                if root_bone_reference:
                    root_bone["sourceReference"] = root_bone_reference
            root_bone_key = pointer_key(value.get("m_RootBone"), obj.assets_file)
            root_bone_ancestry, root_bone_ancestry_complete = transform_parent_ancestry(root_bone_key)
            transform_chain = [serialized_pointer(key) for key in transform_chain_for_go(go_key)]
            bone_references = []
            for raw_pointer in value.get("m_Bones", []) or []:
                item = pointer_record(raw_pointer, obj.assets_file)
                if not item or item.get("pathId") == "0":
                    continue
                item["name"] = object_name(item)
                bone_reference = local_pointer_reference(raw_pointer, obj.assets_file, bundle_sha256)
                if bone_reference:
                    item["sourceReference"] = bone_reference
                bone_references.append(item)
            root_renderers.append({
                "name": go_names.get(go_key, ""),
                "pathId": str(obj.path_id),
                "sourceReference": source_reference(bundle_sha256, obj.assets_file.name, obj.path_id),
                "rendererType": obj.type.name,
                "hierarchyPath": hierarchy_path,
                "enabled": bool(value.get("m_Enabled", True)),
                "gameObjectActive": active,
                "visible": bool(value.get("m_Enabled", True)) and active,
                "rootBone": root_bone,
                # Keep exact source transform/bone identities.  Equipment
                # attachment names are not unique and a skinned renderer can
                # legitimately use a different m_RootBone than its authored
                # attachment transform.
                "transformChain": transform_chain,
                "rootBoneAncestry": root_bone_ancestry,
                "rootBoneAncestryComplete": root_bone_ancestry_complete,
                "boneReferences": bone_references,
                "mesh": mesh,
                "meshSourceReference": mesh_source_reference,
                "materialSlots": material_slots,
            })
        if not root_renderers:
            continue
        prefab = prefab_roots[root]
        prefab_target = prefab.get("target")
        attachment = {"mainWeapon": [], "subWeapon": [], "eyes": [], "headBone": [], "fxParentBones": [], "mouthRenderer": [], "mouthMetadata": []}
        for obj, value in behaviours:
            go_key = pointer_key(value.get("m_GameObject"), obj.assets_file)
            if root_and_path(go_key)[0] != root:
                continue
            for source_key in ("mainWeapon", "subWeapon", "eyes", "headBone", "fxParentBones"):
                if source_key not in value:
                    continue
                pointers = value[source_key] if isinstance(value[source_key], list) else [value[source_key]]
                for pointer in pointers:
                    reference = pointer_record(pointer, obj.assets_file)
                    if not reference or reference.get("pathId") == "0":
                        continue
                    item = {**reference, "name": object_name(reference)}
                    attachment_source_reference = local_pointer_reference(pointer, obj.assets_file, bundle_sha256)
                    if attachment_source_reference:
                        item["sourceReference"] = attachment_source_reference
                    if item not in attachment[source_key]: attachment[source_key].append(item)
            if "MouthRenderer" in value:
                reference = pointer_record(value["MouthRenderer"], obj.assets_file)
                name = renderer_name(value["MouthRenderer"], obj.assets_file)
                source_renderer_reference = local_pointer_reference(value["MouthRenderer"], obj.assets_file, bundle_sha256)
                if reference and reference.get("pathId") != "0":
                    attachment["mouthRenderer"].append({**reference, "name": name, **({"sourceReference": source_renderer_reference} if source_renderer_reference else {})})
                    metadata = {"renderer": {**reference, "name": name}}
                    if source_renderer_reference:
                        metadata["sourceRendererReference"] = source_renderer_reference
                    if "MouthMaterialIndex" in value:
                        metadata["materialIndex"] = int(value["MouthMaterialIndex"])
                    if "MouthDefaultUV" in value:
                        metadata["defaultUV"] = vector(value["MouthDefaultUV"], ("x", "y"))
                    attachment["mouthMetadata"].append(metadata)
                if "MouthMaterialIndex" in value:
                    attachment["mouthMaterialIndex"] = int(value["MouthMaterialIndex"])
                if "MouthDefaultUV" in value:
                    attachment["mouthDefaultUV"] = vector(value["MouthDefaultUV"], ("x", "y"))
        equipment_attachments = []
        for source_key in ("mainWeapon", "subWeapon"):
            for item in attachment.get(source_key, []):
                if item.get("file") and item.get("pathId") and item.get("pathId") != "0":
                    equipment_attachments.append({"kind": source_key, "pointer": item})

        def pointer_record_key(item):
            if not item or not item.get("file") or not item.get("pathId"):
                return None
            return object_key(item["file"], item["pathId"])

        def renderer_equipment_evidence(renderer, attachment_pointer):
            attachment_key = pointer_record_key(attachment_pointer)
            if not attachment_key:
                return []
            root_key = pointer_record_key(renderer.get("rootBone"))
            evidence = []
            if root_key == attachment_key:
                evidence.append("rootBone")
            chain_keys = [pointer_record_key(item) for item in renderer.get("transformChain", [])]
            if attachment_key in chain_keys:
                evidence.append("transformChain")
            bone_keys = [pointer_record_key(item) for item in renderer.get("boneReferences", [])]
            if attachment_key in bone_keys:
                evidence.append("boneReferences")
            return evidence

        equipment_renderer_references = []
        equipment_renderer_ambiguities = []
        matched_renderers = []
        for equipment in equipment_attachments:
            pointer = equipment["pointer"]
            matches = []
            for renderer in root_renderers:
                evidence = renderer_equipment_evidence(renderer, pointer)
                if evidence:
                    matches.append((renderer, evidence))
            references = []
            for renderer, _ in matches:
                reference = renderer.get("sourceReference")
                if reference and reference not in references:
                    references.append(reference)
            references.sort(key=lambda reference: (
                str(reference.get("bundleSha256", "")).lower(),
                str(reference.get("serializedFile", "")).lower(),
                str(reference.get("objectId", "")),
            ))
            if len(matches) == 1 and len(references) == 1:
                equipment_renderer_references.append(references[0])
                matched_renderers.append(matches[0][0])
                continue
            reason_code = (
                "ambiguous-equipment-renderer-relation" if len(matches) > 1
                else "missing-equipment-renderer-match"
            )
            equipment_renderer_ambiguities.append({
                "name": pointer.get("name", ""),
                "attachment": {key: pointer[key] for key in ("file", "pathId", "name") if key in pointer},
                "sourceReferences": references,
                "reasonCode": reason_code,
            })
        equipment_renderers = []
        for renderer in matched_renderers:
            if renderer.get("name") and renderer["name"] not in equipment_renderers:
                equipment_renderers.append(renderer["name"])
        # Keep the legacy name array only for renderers proven by exact source
        # relationships above.  In particular, never let a repeated renderer
        # or bone name select the first candidate.
        if equipment_renderers or equipment_renderer_references or equipment_renderer_ambiguities:
            if equipment_renderers:
                attachment["equipmentRenderers"] = equipment_renderers
            if equipment_renderer_references:
                attachment["equipmentRendererReferences"] = sorted(
                    {(
                        str(reference.get("bundleSha256", "")).lower(),
                        str(reference.get("serializedFile", "")).lower(),
                        str(reference.get("objectId", "")),
                    ): reference for reference in equipment_renderer_references}.values(),
                    key=lambda reference: (
                        str(reference.get("bundleSha256", "")).lower(),
                        str(reference.get("serializedFile", "")).lower(),
                        str(reference.get("objectId", "")),
                    ),
                )
            if equipment_renderer_ambiguities:
                attachment["equipmentRendererAmbiguities"] = equipment_renderer_ambiguities
        sorting = []
        for obj, value in sorting_groups:
            if root_and_path(pointer_key(value.get("m_GameObject"), obj.assets_file))[0] != root:
                continue
            sorting.append({
                "sourceReference": source_reference(bundle_sha256, obj.assets_file.name, obj.path_id),
                "hierarchyPath": root_and_path(pointer_key(value.get("m_GameObject"), obj.assets_file))[1],
                "sortingLayerId": value.get("m_SortingLayerID"),
                "sortingOrder": value.get("m_SortingOrder"),
            })
        assemblies.append({
            "root": root,
            "prefabPath": prefab["path"],
            "prefabTarget": prefab_target,
            "prefabReference": prefab.get("reference"),
            "rendererOrder": [item["name"] for item in root_renderers if item["name"]],
            "renderers": root_renderers,
            "sortingGroups": sorting,
            # Do not use truthiness here: MouthMaterialIndex=0 is a valid
            # source-authored slot and must survive inventory serialization.
            "attachments": {key: value for key, value in attachment.items() if present_attachment_value(value)},
        })
    return assemblies


def material_record(value, obj, bundle_sha256):
    asset = obj.assets_file
    saved = getattr(value, "m_SavedProperties", None)
    textures = []
    for property_name, texture_env in pair_values(member(saved, "m_TexEnvs", [])):
        texture_pointer = member(texture_env, "m_Texture")
        textures.append({
            "name": property_name,
            "texture": pointer_record(texture_pointer, asset),
            "textureReference": local_pointer_reference(texture_pointer, asset, bundle_sha256),
            "scale": vector(member(texture_env, "m_Scale"), ("x", "y")),
            "offset": vector(member(texture_env, "m_Offset"), ("x", "y")),
        })
    floats = {name: finite_value(float(raw)) for name, raw in pair_values(member(saved, "m_Floats", []))}
    integers = {name: int(raw) for name, raw in pair_values(member(saved, "m_Ints", []))}
    colors = {name: vector(raw, ("r", "g", "b", "a")) for name, raw in pair_values(member(saved, "m_Colors", []))}
    keywords = getattr(value, "m_ValidKeywords", None) or getattr(value, "m_ShaderKeywords", "") or []
    if isinstance(keywords, str):
        keywords = keywords.split()
    return {
        "name": str(getattr(value, "m_Name", "") or ""),
        "pathId": str(obj.path_id),
        "file": asset.name,
        "sourceReference": source_reference(bundle_sha256, asset.name, obj.path_id),
        "shader": pointer_record(getattr(value, "m_Shader", None), asset),
        "shaderReference": local_pointer_reference(getattr(value, "m_Shader", None), asset, bundle_sha256),
        "renderQueue": int(getattr(value, "m_CustomRenderQueue", -1)),
        "keywords": [str(item) for item in keywords],
        "textures": textures,
        "floatProperties": floats,
        "intProperties": integers,
        "colorProperties": colors,
        "disabledShaderPasses": [str(item) for item in (getattr(value, "disabledShaderPasses", []) or [])],
    }


def shader_record(value, obj, bundle_sha256):
    parsed = obj.read_typetree().get("m_ParsedForm", {})
    sub_shaders = []
    for sub_shader in parsed.get("m_SubShaders", []) or []:
        passes = []
        for shader_pass in sub_shader.get("m_Passes", []) or []:
            passes.append({
                "type": shader_pass.get("m_Type"),
                "name": shader_pass.get("m_Name"),
                "useName": shader_pass.get("m_UseName"),
                "tags": normalized_tree(shader_pass.get("m_Tags"), obj.assets_file),
                "state": normalized_tree(shader_pass.get("m_State"), obj.assets_file),
            })
        sub_shaders.append({
            "tags": normalized_tree(sub_shader.get("m_Tags"), obj.assets_file),
            "lod": sub_shader.get("m_LOD"),
            "passes": passes,
        })
    blob = getattr(value, "compressedBlob", None)
    program_hash = hashlib.sha256(bytes(blob)).hexdigest() if isinstance(blob, (bytes, bytearray, memoryview, list, tuple)) and blob else None
    result = {
        "name": str(getattr(value, "m_Name", "") or ""),
        "parsedName": str(parsed.get("m_Name", "") or ""),
        "pathId": str(obj.path_id),
        "file": obj.assets_file.name,
        "sourceReference": source_reference(bundle_sha256, obj.assets_file.name, obj.path_id),
        "properties": normalized_tree(parsed.get("m_PropInfo"), obj.assets_file),
        "subShaders": sub_shaders,
        "programBlobSha256": program_hash,
    }
    # Only exact custom adapters currently requiring executable shader
    # source is extracted here.  Keeping this source-driven and selector-based
    # avoids inflating every inventory with unrelated platform bytecode while
    # still ensuring the normal outline conversion never relies on committed
    # GLSL or a per-student repair table.  An extraction failure is retained as
    # metadata rather than hidden by dropping the Shader object; profile
    # construction then blocks the material with the concrete source error.
    shader_name = result["parsedName"] or result["name"]
    normalized_shader_name = shader_name.replace(" ", "").replace("\\", "/").lower()
    exact_dsfx_alpha_blend_0 = (
        normalized_shader_name == "dsfx/fx_shader_alphablend_0"
        and str(bundle_sha256).lower() == DSFX_ALPHA_BLEND_0_BUNDLE_SHA256
        and str(obj.assets_file.name).lower() == DSFX_ALPHA_BLEND_0_SERIALIZED_FILE.lower()
        and str(obj.path_id) == DSFX_ALPHA_BLEND_0_OBJECT_ID
        and program_hash == DSFX_ALPHA_BLEND_0_PROGRAM_BLOB_SHA256
    )
    exact_dsfx_alpha_blend_add = (
        normalized_shader_name == "dsfx/fx_shader_alphablend_add"
        and str(bundle_sha256).lower() == DSFX_ALPHA_BLEND_ADD_BUNDLE_SHA256
        and str(obj.assets_file.name).lower() == DSFX_ALPHA_BLEND_ADD_SERIALIZED_FILE.lower()
        and str(obj.path_id) == DSFX_ALPHA_BLEND_ADD_OBJECT_ID
        and program_hash == DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256
    )
    exact_dsfx_alpha_blend_add_distort_0 = (
        normalized_shader_name == "dsfx/fx_shader_alphablend_add_distort_0"
        and str(bundle_sha256).lower() == DSFX_ALPHA_BLEND_ADD_DISTORT_0_BUNDLE_SHA256
        and str(obj.assets_file.name).lower() == DSFX_ALPHA_BLEND_ADD_DISTORT_0_SERIALIZED_FILE.lower()
        and str(obj.path_id) == DSFX_ALPHA_BLEND_ADD_DISTORT_0_OBJECT_ID
        and program_hash == DSFX_ALPHA_BLEND_ADD_DISTORT_0_PROGRAM_BLOB_SHA256
    )
    exact_dsfx_step_distort_0 = (
        normalized_shader_name == "dsfx/fx_shader_step_distort_0"
        and str(bundle_sha256).lower() == DSFX_STEP_DISTORT_0_BUNDLE_SHA256
        and str(obj.assets_file.name).lower() == DSFX_STEP_DISTORT_0_SERIALIZED_FILE.lower()
        and str(obj.path_id) == DSFX_STEP_DISTORT_0_OBJECT_ID
        and program_hash == DSFX_STEP_DISTORT_0_PROGRAM_BLOB_SHA256
    )
    exact_dsfx_additive_0 = (
        normalized_shader_name == "dsfx/fx_shader_additive_0"
        and str(bundle_sha256).lower() == DSFX_ADDITIVE_0_BUNDLE_SHA256
        and str(obj.assets_file.name).lower() == DSFX_ADDITIVE_0_SERIALIZED_FILE.lower()
        and str(obj.path_id) == DSFX_ADDITIVE_0_OBJECT_ID
        and program_hash == DSFX_ADDITIVE_0_PROGRAM_BLOB_SHA256
    )
    exact_dsfx_glitch_tex = (
        normalized_shader_name == "dsfx/fx_shader_glitch_tex"
        and str(bundle_sha256).lower() == DSFX_GLITCH_TEX_BUNDLE_SHA256
        and str(obj.assets_file.name).lower() == DSFX_GLITCH_TEX_SERIALIZED_FILE.lower()
        and str(obj.path_id) == DSFX_GLITCH_TEX_OBJECT_ID
        and program_hash == DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256
    )
    exact_dsfx_matcap = (
        normalized_shader_name == "dsfx/fx_shader_matcap"
        and str(bundle_sha256).lower() == DSFX_MATCAP_BUNDLE_SHA256
        and str(obj.assets_file.name).lower() == DSFX_MATCAP_SERIALIZED_FILE.lower()
        and str(obj.path_id) == DSFX_MATCAP_OBJECT_ID
        and program_hash == DSFX_MATCAP_PROGRAM_BLOB_SHA256
    )
    exact_projectmx_weapon = (
        normalized_shader_name == "projectmx/weapontest1damage"
        and str(bundle_sha256).lower() == PROJECTMX_WEAPON_BUNDLE_SHA256
        and str(obj.assets_file.name).lower() == PROJECTMX_WEAPON_SERIALIZED_FILE.lower()
        and str(obj.path_id) == PROJECTMX_WEAPON_OBJECT_ID
        and program_hash == PROJECTMX_WEAPON_PROGRAM_BLOB_SHA256
    )
    exact_e_standard = (
        normalized_shader_name == "mx/e-standard"
        and str(bundle_sha256).lower() == E_STANDARD_BUNDLE_SHA256
        and str(obj.assets_file.name).lower() == E_STANDARD_SERIALIZED_FILE.lower()
        and str(obj.path_id) == E_STANDARD_OBJECT_ID
        and program_hash == E_STANDARD_PROGRAM_BLOB_SHA256
    )
    if normalized_shader_name in {"mx/unlitoutline", "mx/c-transparent-st"} or exact_dsfx_alpha_blend_0 or exact_dsfx_alpha_blend_add or exact_dsfx_alpha_blend_add_distort_0 or exact_dsfx_step_distort_0 or exact_dsfx_additive_0 or exact_dsfx_glitch_tex or exact_dsfx_matcap or exact_projectmx_weapon or exact_e_standard:
        if extract_shader_object is None:
            result["extractionError"] = "shader_extractor module is unavailable"
        else:
            try:
                result["extraction"] = extract_shader_object(obj, bundle_sha256)
            except Exception as error:  # keep the source identity and diagnostic in the inventory
                result["extractionError"] = f"{type(error).__name__}: {error}"
    return result


def unity_metadata(data: bytes, bundle_sha256: str):
    if UnityPy is None:
        return None
    result = {"serializedFiles": [], "objects": [], "containers": [], "dependencies": [], "events": [], "materials": [], "textures": [], "shaders": [], "assembly": []}
    try:
        environment = UnityPy.load(data)
        for asset in environment.assets:
            result["serializedFiles"].append(asset.name)
            for external in getattr(asset, "externals", []):
                result["dependencies"].append({"name": str(getattr(external, "name", "") or ""), "path": str(getattr(external, "path", "") or "")})
        for obj in environment.objects:
            type_name = obj.type.name
            if type_name not in {"AnimationClip", "Animator", "AnimatorController", "AnimatorOverrideController", "AssetBundle", "Material", "Mesh", "Texture2D", "Shader"}:
                continue
            try:
                if type_name == "Mesh":
                    asset = obj.assets_file
                    result["objects"].append({"type": type_name, "name": str(obj.peek_name() or ""), "pathId": str(obj.path_id), "file": asset.name, "sourceReference": source_reference(bundle_sha256, asset.name, obj.path_id)})
                    continue
                value, asset = obj.read(), obj.assets_file
                name = str(getattr(value, "m_Name", "") or "")
                result["objects"].append({"type": type_name, "name": name, "pathId": str(obj.path_id), "file": asset.name, "sourceReference": source_reference(bundle_sha256, asset.name, obj.path_id)})
                if type_name == "AssetBundle":
                    container = getattr(value, "m_Container", []) or []
                    for container_path, info in (container.items() if hasattr(container, "items") else container):
                        lowered_path = str(container_path).lower().replace("\\", "/")
                        if "/_mx/characters/" not in lowered_path and "/_mx/addressableasset/character/" not in lowered_path and not lowered_path.endswith(".shader"):
                            continue
                        pointer = getattr(info, "asset", getattr(info, "m_Asset", None))
                        container_record = {
                            "path": str(container_path),
                            "target": pointer_record(pointer, asset),
                            "targetReference": local_pointer_reference(pointer, asset, bundle_sha256),
                        }
                        if is_fx_prefab_container_path(container_path):
                            container_record["fxTargetEvidence"] = extract_fx_target_evidence(
                                environment,
                                {"target": container_record["target"], "targetReference": container_record["targetReference"]},
                                bundle_sha256,
                            )
                        result["containers"].append(container_record)
                elif type_name == "AnimationClip":
                    for event in getattr(value, "m_Events", []) or []:
                        object_pointer = getattr(event, "objectReferenceParameter", None)
                        event_record = {
                            "clip": name,
                            "time": float(getattr(event, "time", 0)),
                            "function": str(getattr(event, "functionName", "") or ""),
                            "string": str(getattr(event, "stringParameter", "") or ""),
                            "float": float(getattr(event, "floatParameter", 0)),
                            "int": int(getattr(event, "intParameter", 0)),
                        }
                        source_clip_reference = fx_event_source_clip_reference(
                            event_record["function"], bundle_sha256, asset.name, obj.path_id
                        )
                        if source_clip_reference:
                            event_record["sourceClipReference"] = source_clip_reference
                        # AnimationEvent.objectReferenceParameter is the only
                        # source-authored target identity available for custom
                        # child-renderer callbacks.  Keep the raw pointer for
                        # candidate-level cross-bundle resolution and expose a
                        # full identity only when the pointer is local to this
                        # serialized file.  In particular, never infer a
                        # renderer from intParameter or export order.
                        object_record = pointer_record(object_pointer, asset)
                        object_reference = local_pointer_reference(object_pointer, asset, bundle_sha256)
                        if object_record and object_record.get("pathId") != "0":
                            event_record["target"] = object_record
                        if object_reference:
                            event_record["targetReference"] = object_reference
                        result["events"].append(event_record)
                elif type_name == "Texture2D":
                    result["textures"].append({"name": name, "pathId": str(obj.path_id), "file": asset.name, "sourceReference": source_reference(bundle_sha256, asset.name, obj.path_id), "width": int(getattr(value, "m_Width", 0)), "height": int(getattr(value, "m_Height", 0))})
                elif type_name == "Material":
                    result["materials"].append(material_record(value, obj, bundle_sha256))
                elif type_name == "Shader":
                    result["shaders"].append(shader_record(value, obj, bundle_sha256))
            except Exception as error:
                result.setdefault("objectErrors", []).append({"type": type_name, "pathId": str(obj.path_id), "error": f"{type(error).__name__}: {error}"})
        result["assembly"] = character_assembly(environment.objects, result["containers"], bundle_sha256)
    except Exception as error:
        result["error"] = f"{type(error).__name__}: {error}"
    result["serializedFiles"] = sorted(set(filter(None, result["serializedFiles"])))
    result["dependencies"] = sorted({(item["name"], item["path"]): item for item in result["dependencies"]}.values(), key=lambda item: (item["name"], item["path"]))
    result["containers"].sort(key=lambda item: item["path"])
    return result


def bundle_record(name, size, compressed_size, crc32, data, digest, metadata_cache):
    record = {"path": name.replace("\\", "/"), "size": size, "compressedSize": compressed_size, "crc32": crc32, "sha256": digest}
    if data is not None and UnityPy is not None:
        if digest not in metadata_cache:
            metadata_cache[digest] = unity_metadata(data, digest)
        record["metadata"] = metadata_cache[digest]
    return record


def main() -> int:
    if len(sys.argv) != 3:
        raise SystemExit("usage: inventory.py SOURCE_DIR OUTPUT_JSON")
    source = pathlib.Path(sys.argv[1]).resolve(strict=True)
    output = pathlib.Path(sys.argv[2]).resolve()
    # This is only the raw inventory schema/reader identity. Rendering-profile,
    # policy and diagnostic versions belong downstream and must not key raw reuse.
    unitypy_version = getattr(UnityPy, "__version__", None)
    reader_version = f"{unitypy_version}+{INVENTORY_SCHEMA_VERSION}" if UnityPy is not None else INVENTORY_SCHEMA_VERSION
    try:
        cache_identity = metadata_cache_identity()
        identity_error = None
    except Exception as error:
        # Cache identity failure is a safe cold-scan condition, not a source failure.
        cache_identity = None
        identity_error = f"{type(error).__name__}: {error}"
    if identity_error:
        progress(f"Metadata cache disabled: producer/runtime identity is unproven ({identity_error}).")
    previous_files, metadata_cache, cache_miss = load_cached_inventory(output, source, reader_version, cache_identity)
    if cache_miss:
        progress(f"Metadata cache miss: {cache_miss}.")

    files = []
    # BA-AD normally keeps archives below AssetBundles, but an extracted
    # bundle may be placed beside that directory.  Scan the complete source
    # tree so both forms participate in the content-addressed inventory.
    source_paths = source_archive_paths(source)
    progress(f"Found {len(source_paths)} source archives/bundles; {len(metadata_cache)} cached metadata records.")
    for file_index, path in enumerate(source_paths, 1):
        relative, stat = path.relative_to(source).as_posix(), path.stat()
        file_hash = sha256_file(path)
        reused = reuse_previous_file_record(previous_files, relative, file_hash, stat.st_mtime_ns)
        if reused is not None:
            files.append(reused)
            continue
        # Keep a .zip classified as an archive even when its central directory
        # is corrupt, so the reader records the concrete BadZipFile error
        # instead of silently treating the source as an unrelated file.
        kind = "archive" if path.suffix.lower() == ".zip" else "bundle" if path.name.lower().endswith(".bundle") else "file"
        record = {"path": relative, "size": stat.st_size, "modifiedNs": stat.st_mtime_ns, "sha256": file_hash, "kind": kind, "entries": []}
        try:
            if kind == "archive":
                with zipfile.ZipFile(path) as archive:
                    archive_items = archive.infolist()
                    for item_index, item in enumerate(archive_items, 1):
                        if item.is_dir() or not item.filename.lower().endswith(".bundle"):
                            continue
                        digest = hashlib.sha256()
                        collected = bytearray() if item.file_size <= MAX_BUNDLE_BYTES else None
                        with archive.open(item) as member:
                            for chunk in iter(lambda: member.read(CHUNK), b""):
                                digest.update(chunk)
                                if collected is not None:
                                    collected.extend(chunk)
                        entry_hash = digest.hexdigest()
                        record["entries"].append(bundle_record(item.filename, item.file_size, item.compress_size, f"{item.CRC:08x}", bytes(collected) if collected is not None else None, entry_hash, metadata_cache))
                        if item_index % 250 == 0:
                            progress(f"{relative}: processed {item_index}/{len(archive_items)} archive entries.")
            elif kind == "bundle":
                data = path.read_bytes() if stat.st_size <= MAX_BUNDLE_BYTES else None
                record["entries"].append(bundle_record(relative, stat.st_size, stat.st_size, "", data, file_hash, metadata_cache))
        except (OSError, RuntimeError, zipfile.BadZipFile) as error:
            record["error"] = f"{type(error).__name__}: {error}"
        files.append(record)
        if file_index == 1 or file_index % 10 == 0 or file_index == len(source_paths):
            progress(f"Completed {file_index}/{len(source_paths)} archives/bundles ({relative}).")

    payload = {
        "version": 2,
        "source": str(source),
        "metadataReader": reader_version,
        "metadataCacheIdentity": cache_identity,
        "files": files,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    write_cached_inventory(output, payload)
    print(json.dumps({"files": len(files), "entries": sum(len(item["entries"]) for item in files), "metadata": len(metadata_cache)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
