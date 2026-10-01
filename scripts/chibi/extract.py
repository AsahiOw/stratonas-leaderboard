#!/usr/bin/env python3
"""Extract explicitly selected BAAD archive entries into an isolated workspace."""

import hashlib
import json
import os
import pathlib
import sys
import zipfile

CHUNK = 1024 * 1024


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(CHUNK), b""):
            digest.update(chunk)
    return digest.hexdigest()


def copy_verified(incoming, target, expected_hash, expected_size):
    temporary = target.with_suffix(target.suffix + f".{os.getpid()}.tmp")
    digest, size = hashlib.sha256(), 0
    try:
        with temporary.open("xb") as outgoing:
            for chunk in iter(lambda: incoming.read(CHUNK), b""):
                digest.update(chunk); size += len(chunk); outgoing.write(chunk)
        if size != expected_size or digest.hexdigest() != expected_hash:
            raise ValueError(f"source content changed: {target.name}")
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)


def main():
    if len(sys.argv) != 4:
        raise SystemExit("usage: extract.py SOURCE_DIR MANIFEST_JSON OUTPUT_DIR")
    source = pathlib.Path(sys.argv[1]).resolve(strict=True)
    manifest = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"))
    output = pathlib.Path(sys.argv[3]).resolve()
    output.mkdir(parents=True, exist_ok=True)
    targets = {}
    for item in manifest:
        archive_path = (source / item["archivePath"]).resolve(strict=True)
        if source not in archive_path.parents:
            raise ValueError("archive escapes source root")
        if sha256_file(archive_path) != item["archiveSha256"]:
            raise ValueError(f"source container changed: {item['archivePath']}")
        target = output / pathlib.PurePosixPath(item["entryPath"]).name
        prior = targets.get(target.name.lower())
        if prior and prior != item["sha256"]:
            raise ValueError(f"different source members collide at output name: {target.name}")
        targets[target.name.lower()] = item["sha256"]
        if prior == item["sha256"]:
            continue
        if item.get("sourceKind") == "bundle":
            if archive_path.stat().st_size != item["entrySize"]:
                raise ValueError(f"loose bundle changed: {item['archivePath']}")
            with archive_path.open("rb") as incoming:
                copy_verified(incoming, target, item["sha256"], item["entrySize"])
            continue
        with zipfile.ZipFile(archive_path) as archive:
            info = archive.getinfo(item["entryPath"])
            if f"{info.CRC:08x}" != item["entryCrc32"] or info.file_size != item["entrySize"]:
                raise ValueError(f"archive member changed: {item['entryPath']}")
            with archive.open(info) as incoming:
                copy_verified(incoming, target, item["sha256"], item["entrySize"])


if __name__ == "__main__":
    main()
