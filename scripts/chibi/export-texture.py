#!/usr/bin/env python3
"""Export one Texture2D by its content-addressed serialized-object identity."""

import hashlib
import json
import pathlib
import sys

try:
    import UnityPy
except ImportError:
    UnityPy = None


def main():
    if len(sys.argv) != 6:
        raise SystemExit("usage: export-texture.py BUNDLE_PATH EXPECTED_SHA256 SERIALIZED_FILE OBJECT_ID OUTPUT_PNG")
    if UnityPy is None:
        raise SystemExit("UnityPy is unavailable")
    bundle = pathlib.Path(sys.argv[1]).resolve(strict=True)
    expected_sha, serialized_file, object_id = sys.argv[2:5]
    output = pathlib.Path(sys.argv[5]).resolve()
    digest = hashlib.sha256(bundle.read_bytes()).hexdigest()
    if digest != expected_sha:
        raise ValueError(f"source bundle hash mismatch: {bundle.name}")
    environment = UnityPy.load(str(bundle))
    matches = [obj for obj in environment.objects
        if obj.assets_file.name == serialized_file and str(obj.path_id) == object_id]
    if len(matches) != 1:
        raise ValueError(f"expected one source object at {serialized_file}:{object_id}, found {len(matches)}")
    obj = matches[0]
    if obj.type.name != "Texture2D":
        raise ValueError(f"source object is {obj.type.name}, not Texture2D")
    image = obj.read().image
    if image is None or not image.width or not image.height:
        raise ValueError("source Texture2D has no decodable image")
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output)
    print(json.dumps({"bundleSha256": digest, "serializedFile": serialized_file, "objectId": object_id,
        "width": image.width, "height": image.height, "output": str(output)}))


if __name__ == "__main__":
    main()
