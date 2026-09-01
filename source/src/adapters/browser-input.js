function uiHit(ui, x, y) {
  return [...(ui ?? [])].reverse().find((node) => {
    if (!node.interaction || node.kind !== 'panel') return false;
    return x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + node.height;
  }) ?? null;
}

export function createBrowserInputAdapter({ canvas, pick, getPresentation, dispatch, setLook, setMovement, setFov }) {
  if (!canvas?.addEventListener) throw new TypeError('Browser input adapter requires a canvas element.');
  const keys = new Set();
  let focusId = null;
  let pointerId = null;
  let down = null;
  let last = null;
  let dragging = false;
  let sequence = 0;
  let lastWorldHit = null;
  const disposers = [];
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    disposers.push(() => target.removeEventListener(type, handler, options));
  };
  const emit = (action) => dispatch({ operationId: `atc:browser/${++sequence}`, sequence, ...action });

  function semanticKey(event, pressed) {
    if (pressed) keys.add(event.code);
    else keys.delete(event.code);
    setMovement({
      forward: (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0),
      right: (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0),
      glide: keys.has('ShiftLeft') || keys.has('ShiftRight')
    });
    if (!pressed || event.repeat) return;
    if (event.code === 'Space' || event.code === 'KeyE' && !focusId) emit({ type: 'advance' });
    else if (event.code === 'KeyE' && focusId) activateFocus();
    else if (event.code === 'Escape') emit({ type: 'cancel' });
    else if (event.code === 'KeyJ') emit({ type: 'toggle-journal' });
    else if (event.code === 'KeyP') emit({ type: 'toggle-pause' });
    else if (event.code === 'Enter') emit({ type: 'confirm-choice' });
    else if (event.code === 'BracketLeft') setFov((getPresentation()?.camera?.fov ?? 78) - 2);
    else if (event.code === 'BracketRight') setFov((getPresentation()?.camera?.fov ?? 78) + 2);
  }

  function activateFocus() {
    if (!focusId) return false;
    const interaction = lastWorldHit?.interaction ?? getPresentation()?.focusInteraction ?? null;
    if (!interaction?.verb) return false;
    emit({ type: interaction.verb, targetId: focusId });
    return true;
  }

  function relative(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      normalizedX: Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width))),
      normalizedY: Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height)))
    };
  }

  function refreshFocus(event) {
    const point = relative(event);
    const hit = pick(point.normalizedX, point.normalizedY);
    const nextId = hit?.objectId ?? null;
    lastWorldHit = hit;
    if (nextId !== focusId) {
      focusId = nextId;
      emit({ type: 'focus', targetId: focusId });
    }
  }

  function pointerDown(event) {
    if (pointerId !== null) return;
    pointerId = event.pointerId;
    down = last = { x: event.clientX, y: event.clientY, time: performance.now() };
    dragging = false;
    canvas.setPointerCapture?.(event.pointerId);
  }

  function pointerMove(event) {
    if (pointerId === event.pointerId && last) {
      const dx = event.clientX - last.x;
      const dy = event.clientY - last.y;
      if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 4) dragging = true;
      if (dragging) setLook({ yawDelta: -dx * 0.0032, pitchDelta: -dy * 0.0032 });
      last = { x: event.clientX, y: event.clientY, time: performance.now() };
      return;
    }
    refreshFocus(event);
  }

  function pointerUp(event) {
    if (pointerId !== event.pointerId) return;
    const point = relative(event);
    if (!dragging) {
      const presentation = getPresentation();
      const hit = uiHit(presentation?.ui, point.normalizedX * 100, point.normalizedY * 100);
      if (hit?.interaction?.type === 'set-fov') {
        const value = hit.interaction.minimum + Math.max(0, Math.min(1, (point.normalizedX * 100 - hit.interaction.barX) / hit.interaction.barWidth)) * (hit.interaction.maximum - hit.interaction.minimum);
        setFov(value);
      } else if (hit?.interaction?.type) {
        emit({ type: hit.interaction.type });
      } else {
        const worldHit = pick(point.normalizedX, point.normalizedY);
        lastWorldHit = worldHit;
        focusId = worldHit?.objectId ?? null;
        if (worldHit?.interaction?.verb) emit({ type: worldHit.interaction.verb, targetId: worldHit.objectId });
        else if (worldHit?.point) emit({ type: 'move-to', targetId: worldHit.objectId, point: worldHit.point });
        else emit({ type: 'advance' });
      }
    }
    canvas.releasePointerCapture?.(event.pointerId);
    pointerId = null;
    down = last = null;
    dragging = false;
  }

  const host = globalThis.window ?? globalThis;
  listen(host, 'keydown', (event) => semanticKey(event, true));
  listen(host, 'keyup', (event) => semanticKey(event, false));
  listen(canvas, 'pointerdown', pointerDown);
  listen(canvas, 'pointermove', pointerMove);
  listen(canvas, 'pointerup', pointerUp);
  listen(canvas, 'pointercancel', pointerUp);
  listen(canvas, 'contextmenu', (event) => event.preventDefault());
  canvas.focus?.();

  return Object.freeze({
    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      setMovement({ forward: 0, right: 0, glide: false });
    },
    getFocusId: () => focusId,
    setFocusId(value) {
      focusId = value ?? null;
    }
  });
}

export default createBrowserInputAdapter;
