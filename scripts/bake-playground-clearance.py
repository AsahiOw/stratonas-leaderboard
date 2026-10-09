"""Bake wall clearance and forgiving furniture cores from the shipped office GLB."""
import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import distance_transform_edt, label

root = Path(__file__).resolve().parents[1]
asset = (root / 'public/assets/playground/schale-office.glb').read_bytes()
length = struct.unpack_from('<I', asset, 12)[0]
scene = json.loads(asset[20:20 + length])
binary = asset[28 + length:]


def accessor(index):
    value = scene['accessors'][index]
    view = scene['bufferViews'][value['bufferView']]
    width = 3 if value['type'] == 'VEC3' else 1
    dtype = {5126: '<f4', 5123: '<u2', 5125: '<u4'}[value['componentType']]
    return np.frombuffer(binary, dtype=dtype, count=value['count'] * width,
                         offset=view.get('byteOffset', 0) + value.get('byteOffset', 0)).reshape((-1, width))


scale = 32
origin = (-29, -19)
floor = Image.new('L', (58 * scale + 1, 38 * scale + 1))
obstacles = Image.new('L', floor.size)
furniture = Image.new('L', floor.size)
fd, od, pd = ImageDraw.Draw(floor), ImageDraw.Draw(obstacles), ImageDraw.Draw(furniture)
floor_ids = {0, 5, 12, 13, 15, 24, 40, 42, 55, 59, 60, 61, 62, 71, 79}
# Wall/floor batches, door frames, perimeter rails, windows and shower partitions.
# Furniture and decorative details use smaller cores; structural openings do not.
structural_ids = {1, 2, 3, 4, 12, 15, 40, 41, 42, 45, 46, 53, 56, 87, 89, 131}
mesh_names = {node['mesh']: node['name'] for node in scene['nodes'] if 'mesh' in node}
for mesh_index, mesh in enumerate(scene['meshes']):
    source_id = int(mesh_names[mesh_index].split('_')[-1])
    for primitive in mesh['primitives']:
        positions = accessor(primitive['attributes']['POSITION'])
        for triangle in positions[accessor(primitive['indices']).reshape(-1)].reshape((-1, 3, 3)):
            # The gym's two passable sliding leaves share decorative center trim.
            # Keep their outer jambs solid, but don't split the opening at the seam.
            if source_id == 41 and np.linalg.norm(triangle[:, [0, 2]] - [15.11856, .14265], axis=1).max() < .12:
                continue
            pixels = [((v[0] - origin[0]) * scale, (v[2] - origin[1]) * scale) for v in triangle]
            if source_id in floor_ids and triangle[:, 1].max() <= .2 and np.ptp(triangle[:, 1]) < .005:
                fd.polygon(pixels, fill=255)
            # The door panes are passable; windows and exterior glass remain barriers.
            if source_id != 86 and (triangle[:, 1].max() > .24 or source_id == 68) and triangle[:, 1].min() < 1.85:
                draw = od if source_id in structural_ids else pd
                draw.polygon(pixels, fill=255)
                draw.line(pixels + [pixels[0]], fill=255, width=1)

# Coplanar floor batches leave tiny seams across open entrances. Bridge those
# seams only in the floor mask; solid walls/furniture still block the result.
floor = floor.filter(ImageFilter.MaxFilter(17))
# Furniture gets a 0.30-unit allowance, letting clothing overlap its edges while
# its center remains solid. Signed distance keeps the relaxed contour smooth.
furniture_mask = np.asarray(furniture) > 0
furniture_clearance = (distance_transform_edt(~furniture_mask) - distance_transform_edt(furniture_mask)) / scale + .30
clearance = np.minimum(distance_transform_edt((np.asarray(floor) > 0) & (np.asarray(obstacles) == 0)) / scale, furniture_clearance)
# Keep only the floor connected to the entrance; sealed shafts and shelves
# may contain floor polygons but cannot be reached through an opening.
components, _ = label(clearance > 0)
entry = components[int((8 - origin[1]) * scale), int((-19 - origin[0]) * scale)]
clearance[components != entry] = 0
target = root / 'src/lib/chibi/playground-navigation.json'
navigation = json.loads(target.read_text())
# Round downward, including a raster-pixel safety margin. Runtime subtracts
# the distance to the sample, so arbitrary coordinates retain body clearance.
navigation['clearanceStep'] = .0625
navigation['clearance'] = [
    ''.join(chr(33 + min(93, max(0, int((clearance[z * 2, x * 2] - 1 / scale) * 32))))
            for x in range(929)) for z in range(609)
]
target.write_text(json.dumps(navigation, separators=(',', ':')) + '\n')
print('Baked clearance:', len(navigation['clearance']), 'rows')
