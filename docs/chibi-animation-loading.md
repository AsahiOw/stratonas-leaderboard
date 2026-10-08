# Chibi animation loading

The viewer downloads the model with its starting animation, then downloads other clips when selected. This also applies to Photo Studio. Geometry, textures, skeletons, expressions and equipment metadata remain in the initial file; animation files contain only the selected clip's tracks.

Deploy the updated application normally. Existing published GLBs and exported database records remain compatible, so characters do not need rebuilding for this optimization. The server creates reusable `delivery-v1` files alongside the original published GLB on first request. The chibi data directory must be writable. These generated files can be copied with `published`, or regenerated automatically on the host; `animation-expansion-validation` is not needed.

Public downloads have revision- and delivery-version-specific URLs with immutable HTTP caching. The browser also retains completed downloads in a 128 MiB cache and reuses parsed clips while a model is open. Admin previews remain private and are not stored in the browser download cache. Loading failures offer a retry; a later selection takes priority over an earlier download.

Models with unsupported glTF extensions retain full-file loading so unfamiliar extension data is preserved.
