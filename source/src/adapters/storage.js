const PREFIX = 'across-the-canopy:greybox:';

export function createStorageAdapter({ storage = globalThis.localStorage ?? null, prefix = PREFIX } = {}) {
  const memory = new Map();
  const readText = (key) => storage?.getItem ? storage.getItem(key) : memory.get(key) ?? null;
  const writeText = (key, value) => storage?.setItem ? storage.setItem(key, value) : memory.set(key, value);
  const removeText = (key) => storage?.removeItem ? storage.removeItem(key) : memory.delete(key);
  return Object.freeze({
    save(slotId, payload) {
      const key = `${prefix}${String(slotId)}`;
      const envelope = {
        schema: 'atc.storage-envelope/1',
        slotId: String(slotId),
        payload: structuredClone(payload)
      };
      writeText(key, JSON.stringify(envelope));
      return structuredClone(envelope);
    },
    load(slotId) {
      const text = readText(`${prefix}${String(slotId)}`);
      if (!text) return null;
      const envelope = JSON.parse(text);
      if (envelope?.schema !== 'atc.storage-envelope/1') throw new TypeError('Unsupported Across the Canopy storage envelope.');
      return structuredClone(envelope.payload);
    },
    has(slotId) {
      return readText(`${prefix}${String(slotId)}`) !== null;
    },
    remove(slotId) {
      return removeText(`${prefix}${String(slotId)}`);
    }
  });
}

export default createStorageAdapter;
