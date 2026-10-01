#!/usr/bin/env python3
"""Export the exact BAAD texture objects referenced by processed source profiles."""

import hashlib
import json
import pathlib
import sys
import zipfile

import UnityPy


def digest_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def reference_key(reference):
    return ":".join((reference["bundleSha256"].lower(), reference["serializedFile"].lower(), str(reference["objectId"])))


def safe_key(reference):
    return hashlib.sha256(reference_key(reference).encode("utf-8")).hexdigest()[:20]


def read_texture(bundle_path, reference):
    environment = UnityPy.load(str(bundle_path))
    matches = [obj for obj in environment.objects
               if obj.assets_file.name.lower() == reference["serializedFile"].lower()
               and str(obj.path_id) == str(reference["objectId"])]
    if len(matches) != 1 or matches[0].type.name != "Texture2D":
        raise ValueError(f"Expected one Texture2D for {reference_key(reference)}, found {len(matches)}")
    image = matches[0].read().image
    if image is None or not image.width or not image.height:
        raise ValueError(f"Texture has no decodable pixels: {reference_key(reference)}")
    return image


def main():
    if len(sys.argv) != 6:
        raise SystemExit("usage: export-visual-audit-textures.py BAAD_DIR INVENTORY_JSON SOURCE_PROFILES_JSON PROCESSED_AUDIT_JSON OUTPUT_DIR")
    source_root, inventory_path, profiles_path, audit_path, output_dir = map(pathlib.Path, sys.argv[1:])
    source_root = source_root.resolve(strict=True)
    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    bundles_dir = output_dir / "bundles"
    textures_dir = output_dir / "textures"
    bundles_dir.mkdir(exist_ok=True)
    textures_dir.mkdir(exist_ok=True)

    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    audit = json.loads(audit_path.read_text(encoding="utf-8"))
    source_profiles = json.loads(profiles_path.read_text(encoding="utf-8"))
    generated_ids = {row["studentId"] for row in audit["entries"] if row.get("generatedModel")}
    source_rows = [row for row in source_profiles["students"] if row["student"]["id"] in generated_ids]
    refs = {}
    student_textures = {}
    for row in source_rows:
        student_id = row["student"]["id"]
        textures = []
        for renderer in row["renderingProfile"].get("renderers", []):
            for slot in renderer.get("materialSlots", []):
                adapter_id = slot.get("adapterId")
                is_body_material = adapter_id == "mx-character-general" and slot.get("sourceMaterialName", "").lower().endswith("body")
                if adapter_id not in ("mx-character-face", "mx-character-eyemouth") and not is_body_material:
                    continue
                names = {"_MainTex", "_MaskTex"} if adapter_id == "mx-character-face" else {"_MainTex", "_MouthTileTex"} if adapter_id == "mx-character-eyemouth" else {"_MainTex"}
                for texture in slot.get("materialProperties", {}).get("textures", []):
                    reference = texture.get("textureReference")
                    if texture.get("name") not in names or not reference:
                        continue
                    key = reference_key(reference)
                    refs[key] = {"reference": reference, "property": texture["name"]}
                    textures.append({"property": texture["name"], "referenceKey": key, "renderer": renderer["name"], "material": slot["sourceMaterialName"]})
        student_textures[str(student_id)] = textures

    entries = {}
    for file in inventory["files"]:
        for entry in file["entries"]:
            if entry.get("sha256") in {value["reference"]["bundleSha256"] for value in refs.values()}:
                entries[entry["sha256"]] = {"archive": file, "entry": entry}
    if len(entries) != len({value["reference"]["bundleSha256"] for value in refs.values()}):
        missing = sorted({value["reference"]["bundleSha256"] for value in refs.values()} - entries.keys())
        raise ValueError(f"Source bundle hashes are absent from the BAAD inventory: {missing}")

    bundle_paths = {}
    verified_archives = set()
    for bundle_sha in sorted(entries):
        record = entries[bundle_sha]
        archive = record["archive"]
        archive_path = (source_root / archive["path"]).resolve(strict=True)
        if source_root not in archive_path.parents:
            raise ValueError(f"Source archive escapes the BAAD root: {archive['path']}")
        if archive_path not in verified_archives:
            actual = digest_file(archive_path)
            if actual != archive["sha256"]:
                raise ValueError(f"BAAD archive hash mismatch: {archive['path']}")
            verified_archives.add(archive_path)
        entry = record["entry"]
        bundle_path = bundles_dir / f"{bundle_sha}.bundle"
        if not bundle_path.exists():
            with zipfile.ZipFile(archive_path) as container:
                info = container.getinfo(entry["path"])
                if info.file_size != entry["size"] or f"{info.CRC:08x}" != entry["crc32"]:
                    raise ValueError(f"Source bundle entry changed: {entry['path']}")
                data = container.read(info)
            if hashlib.sha256(data).hexdigest() != bundle_sha:
                raise ValueError(f"Source bundle content hash mismatch: {entry['path']}")
            bundle_path.write_bytes(data)
        bundle_paths[bundle_sha] = bundle_path

    exports = {}
    for key, record in refs.items():
        reference = record["reference"]
        output = textures_dir / f"{safe_key(reference)}.png"
        if not output.exists():
            image = read_texture(bundle_paths[reference["bundleSha256"]], reference)
            image.save(output)
        exports[key] = {
            "reference": reference,
            "property": record["property"],
            "file": output.relative_to(output_dir).as_posix(),
        }

    report = {
        "generatedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "processedStudents": len(student_textures),
        "uniqueTextures": len(exports),
        "students": student_textures,
        "exports": exports,
    }
    (output_dir / "textures.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"outputDir": str(output_dir), "processedStudents": len(student_textures), "uniqueTextures": len(exports), "verifiedArchives": len(verified_archives)}, indent=2))


if __name__ == "__main__":
    main()
