export function createThreePickAdapter({ THREE, provider, getPacket }) {
  if (!THREE?.Raycaster || typeof provider?.getPickContext !== 'function') throw new TypeError('Three pick adapter requires THREE and a provider pick context.');
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function pick(normalizedX, normalizedY) {
    const context = provider.getPickContext();
    pointer.set(normalizedX * 2 - 1, -(normalizedY * 2 - 1));
    raycaster.setFromCamera(pointer, context.camera);
    const hits = raycaster.intersectObjects(context.targets, false);
    const hit = hits.find((entry) => entry.object?.userData?.objectId);
    if (!hit) return null;
    const objectId = hit.object.userData.objectId;
    const descriptor = getPacket?.()?.objects?.find((entry) => entry.id === objectId) ?? null;
    return {
      objectId,
      distance: hit.distance,
      point: hit.point.toArray(),
      interaction: structuredClone(descriptor?.metadata?.interaction ?? hit.object.userData.interaction ?? null)
    };
  }

  return Object.freeze({ pick });
}

export default createThreePickAdapter;
