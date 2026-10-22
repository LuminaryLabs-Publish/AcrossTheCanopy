import { geometryForObject, objectTransform } from '../providers/nexusgl-provider.js';

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const subtract = (a, b) => a.map((value, axis) => value - b[axis]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = value => { const length = Math.hypot(...value) || 1; return value.map(component => component / length); };

function intersect(origin, direction, a, b, c) {
  const edge1 = subtract(b, a), edge2 = subtract(c, a);
  const p = cross(direction, edge2), determinant = dot(edge1, p);
  if (Math.abs(determinant) < 1e-9) return null;
  const t = subtract(origin, a), u = dot(t, p) / determinant;
  if (u < 0 || u > 1) return null;
  const q = cross(t, edge1), v = dot(direction, q) / determinant;
  if (v < 0 || u + v > 1) return null;
  const distance = dot(edge2, q) / determinant;
  return distance >= 0 ? distance : null;
}

export function createNexusGLPickAdapter({ getPacket }) {
  const geometry = new Map();
  function pick(normalizedX, normalizedY) {
    const packet = getPacket?.();
    if (!packet?.camera) return null;
    const camera = packet.camera, yaw = camera.yaw ?? 0, pitch = camera.pitch ?? 0;
    const cp = Math.cos(pitch);
    const forward = [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
    const right = [Math.cos(yaw), 0, -Math.sin(yaw)], up = cross(right, forward);
    const aspect = (packet.output?.width ?? 640) / (packet.output?.height ?? 360);
    const tangent = Math.tan((camera.fov ?? 78) * Math.PI / 360);
    const x = (normalizedX * 2 - 1) * tangent * aspect, y = (1 - normalizedY * 2) * tangent;
    const direction = normalize(forward.map((value, axis) => value + right[axis] * x + up[axis] * y));
    let nearest = null;
    for (const object of packet.objects ?? []) {
      if (!object.metadata?.interaction || object.visible === false) continue;
      if (object.id === 'atc:blocker/descent-shutter' && packet.story?.flags?.descent_lock_open) continue;
      if (!geometry.has(object.id)) geometry.set(object.id, geometryForObject(object).positions);
      const positions = geometry.get(object.id), matrix = objectTransform(object, packet.elapsed);
      const vertex = offset => [0, 1, 2].map(axis => matrix[axis] * positions[offset] + matrix[4 + axis] * positions[offset + 1] + matrix[8 + axis] * positions[offset + 2] + matrix[12 + axis]);
      for (let index = 0; index < positions.length; index += 9) {
        const distance = intersect(camera.position, direction, vertex(index), vertex(index + 3), vertex(index + 6));
        if (distance !== null && (!nearest || distance < nearest.distance)) nearest = { object, distance };
      }
    }
    if (!nearest) return null;
    return {
      objectId: nearest.object.id, distance: nearest.distance,
      point: camera.position.map((value, axis) => value + direction[axis] * nearest.distance),
      interaction: structuredClone(nearest.object.metadata.interaction)
    };
  }
  return Object.freeze({ pick });
}
