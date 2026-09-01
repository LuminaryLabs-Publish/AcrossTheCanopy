/**
 * Deterministic, DOM-free bitmap UI rasterizer.
 *
 * The module deliberately accepts THREE as an argument so it can be shared by
 * the browser renderer and the framebuffer/video harness. All drawing happens
 * into Uint8Array RGBA buffers; no canvas, system font, or platform text API is
 * involved.
 */

const DEFAULT_PALETTE = Object.freeze({
  background: '#10171DDD',
  panel: '#17232CDD',
  border: '#83A4B8FF',
  text: '#F2F7F9FF',
  muted: '#AFC0C9FF',
  accent: '#32D5FFFF',
  track: '#263945FF',
  button: '#244A5DFF',
  buttonActive: '#2D8CFFFF'
});

const GLYPH_ROWS = Object.freeze({
  ' ': '00000/00000/00000/00000/00000/00000/00000',
  '!': '00100/00100/00100/00100/00100/00000/00100',
  '"': '01010/01010/01010/00000/00000/00000/00000',
  '#': '01010/11111/01010/01010/11111/01010/00000',
  '$': '00100/01111/10100/01110/00101/11110/00100',
  '%': '11001/11010/00100/01000/10110/00110/00000',
  '&': '01100/10010/10100/01000/10101/10010/01101',
  "'": '00100/00100/01000/00000/00000/00000/00000',
  '(': '00010/00100/01000/01000/01000/00100/00010',
  ')': '01000/00100/00010/00010/00010/00100/01000',
  '*': '00000/10101/01110/11111/01110/10101/00000',
  '+': '00000/00100/00100/11111/00100/00100/00000',
  ',': '00000/00000/00000/00000/00100/00100/01000',
  '-': '00000/00000/00000/11111/00000/00000/00000',
  '.': '00000/00000/00000/00000/00000/00110/00110',
  '/': '00001/00010/00100/01000/10000/00000/00000',
  '0': '01110/10001/10011/10101/11001/10001/01110',
  '1': '00100/01100/00100/00100/00100/00100/01110',
  '2': '01110/10001/00001/00010/00100/01000/11111',
  '3': '11110/00001/00001/01110/00001/00001/11110',
  '4': '00010/00110/01010/10010/11111/00010/00010',
  '5': '11111/10000/10000/11110/00001/00001/11110',
  '6': '01110/10000/10000/11110/10001/10001/01110',
  '7': '11111/00001/00010/00100/01000/01000/01000',
  '8': '01110/10001/10001/01110/10001/10001/01110',
  '9': '01110/10001/10001/01111/00001/00001/01110',
  ':': '00000/00110/00110/00000/00110/00110/00000',
  ';': '00000/00110/00110/00000/00110/00100/01000',
  '<': '00010/00100/01000/10000/01000/00100/00010',
  '=': '00000/00000/11111/00000/11111/00000/00000',
  '>': '01000/00100/00010/00001/00010/00100/01000',
  '?': '01110/10001/00001/00010/00100/00000/00100',
  '@': '01110/10001/10111/10101/10111/10000/01110',
  'A': '01110/10001/10001/11111/10001/10001/10001',
  'B': '11110/10001/10001/11110/10001/10001/11110',
  'C': '01111/10000/10000/10000/10000/10000/01111',
  'D': '11110/10001/10001/10001/10001/10001/11110',
  'E': '11111/10000/10000/11110/10000/10000/11111',
  'F': '11111/10000/10000/11110/10000/10000/10000',
  'G': '01111/10000/10000/10111/10001/10001/01110',
  'H': '10001/10001/10001/11111/10001/10001/10001',
  'I': '01110/00100/00100/00100/00100/00100/01110',
  'J': '00001/00001/00001/00001/10001/10001/01110',
  'K': '10001/10010/10100/11000/10100/10010/10001',
  'L': '10000/10000/10000/10000/10000/10000/11111',
  'M': '10001/11011/10101/10101/10001/10001/10001',
  'N': '10001/11001/10101/10011/10001/10001/10001',
  'O': '01110/10001/10001/10001/10001/10001/01110',
  'P': '11110/10001/10001/11110/10000/10000/10000',
  'Q': '01110/10001/10001/10001/10101/10010/01101',
  'R': '11110/10001/10001/11110/10100/10010/10001',
  'S': '01111/10000/10000/01110/00001/00001/11110',
  'T': '11111/00100/00100/00100/00100/00100/00100',
  'U': '10001/10001/10001/10001/10001/10001/01110',
  'V': '10001/10001/10001/10001/10001/01010/00100',
  'W': '10001/10001/10001/10101/10101/10101/01010',
  'X': '10001/10001/01010/00100/01010/10001/10001',
  'Y': '10001/10001/01010/00100/00100/00100/00100',
  'Z': '11111/00001/00010/00100/01000/10000/11111',
  '[': '01110/01000/01000/01000/01000/01000/01110',
  '\\': '10000/01000/00100/00010/00001/00000/00000',
  ']': '01110/00010/00010/00010/00010/00010/01110',
  '^': '00100/01010/10001/00000/00000/00000/00000',
  '_': '00000/00000/00000/00000/00000/00000/11111',
  '`': '01000/00100/00010/00000/00000/00000/00000',
  '{': '00010/00100/00100/01000/00100/00100/00010',
  '|': '00100/00100/00100/00100/00100/00100/00100',
  '}': '01000/00100/00100/00010/00100/00100/01000',
  '~': '00000/00000/01001/10110/00000/00000/00000'
});

const GLYPHS = Object.freeze(Object.fromEntries(
  Object.entries(GLYPH_ROWS).map(([character, rows]) => [
    character,
    Object.freeze(rows.split('/').map((row) => Number.parseInt(row, 2)))
  ])
));

const UNICODE_REPLACEMENTS = Object.freeze([
  [/\u2018|\u2019|\u201A|\u201B/g, "'"],
  [/\u201C|\u201D|\u201E|\u201F/g, '"'],
  [/\u2013|\u2014|\u2212/g, '-'],
  [/\u2026/g, '...'],
  [/\u2192|\u27F6/g, '>'],
  [/\u2190|\u27F5/g, '<'],
  [/\u00B7|\u2022/g, ':'],
  [/\u00D7/g, 'x'],
  [/\u00A0/g, ' ']
]);

const finiteInteger = (value, fallback, minimum = 0, maximum = 4096) => {
  const numeric = Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback;
  return Math.max(minimum, Math.min(maximum, numeric));
};

const clamp01 = (value) => Math.max(0, Math.min(1, Number.isFinite(Number(value)) ? Number(value) : 0));

export function normalizeBitmapText(value) {
  let text = String(value ?? '');
  for (const [pattern, replacement] of UNICODE_REPLACEMENTS) text = text.replace(pattern, replacement);
  text = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  return Array.from(text, (character) => {
    if (character === '\n') return '\n';
    if (character === '\t') return '    ';
    const code = character.codePointAt(0);
    return code >= 32 && code <= 126 ? character : '?';
  }).join('');
}

export function parseBitmapColor(value, fallback = [255, 255, 255, 255]) {
  if (Array.isArray(value) || ArrayBuffer.isView(value)) {
    const channels = Array.from(value).slice(0, 4).map((channel) => finiteInteger(channel, 0, 0, 255));
    while (channels.length < 4) channels.push(channels.length === 3 ? 255 : 0);
    return channels;
  }
  if (Number.isInteger(value)) {
    return [value >>> 24 & 255, value >>> 16 & 255, value >>> 8 & 255, value & 255];
  }
  const match = /^#([0-9a-f]{3,8})$/i.exec(String(value ?? ''));
  if (!match) return [...fallback];
  const source = match[1];
  if (source.length === 3 || source.length === 4) {
    const channels = Array.from(source, (digit) => Number.parseInt(digit + digit, 16));
    if (channels.length === 3) channels.push(255);
    return channels;
  }
  if (source.length === 6 || source.length === 8) {
    const channels = source.match(/.{2}/g).map((pair) => Number.parseInt(pair, 16));
    if (channels.length === 3) channels.push(255);
    return channels;
  }
  return [...fallback];
}

export function layoutBitmapText(value, options = {}) {
  const text = normalizeBitmapText(value);
  const scale = finiteInteger(options.scale, 2, 1, 32);
  const letterSpacing = finiteInteger(options.letterSpacing, scale, 0, 64);
  const lineGap = finiteInteger(options.lineGap, scale, 0, 64);
  const glyphWidth = 5 * scale;
  const advance = glyphWidth + letterSpacing;
  const lineHeight = 7 * scale + lineGap;
  const maxWidth = finiteInteger(options.maxWidth, 0, 0, 16384);
  const maxColumns = maxWidth > 0 ? Math.max(1, Math.floor((maxWidth + letterSpacing) / advance)) : Infinity;
  const lines = [];

  for (const paragraph of text.split('\n')) {
    if (paragraph.length === 0) {
      lines.push('');
      continue;
    }
    if (!Number.isFinite(maxColumns)) {
      lines.push(paragraph);
      continue;
    }
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const sourceWord of words) {
      let word = sourceWord;
      while (word.length > maxColumns) {
        if (line) {
          lines.push(line);
          line = '';
        }
        lines.push(word.slice(0, maxColumns));
        word = word.slice(maxColumns);
      }
      if (!word) continue;
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length > maxColumns && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line || lines.length === 0) lines.push(line);
  }

  const limitedLines = Number.isFinite(options.maxLines)
    ? lines.slice(0, Math.max(0, finiteInteger(options.maxLines, lines.length, 0, 1024)))
    : lines;
  const widths = limitedLines.map((line) => line.length ? line.length * advance - letterSpacing : 0);
  return Object.freeze({
    text,
    lines: Object.freeze(limitedLines),
    widths: Object.freeze(widths),
    width: widths.length ? Math.max(...widths) : 0,
    height: limitedLines.length ? limitedLines.length * lineHeight - lineGap : 0,
    scale,
    letterSpacing,
    lineGap,
    lineHeight,
    glyphWidth,
    glyphHeight: 7 * scale,
    advance
  });
}

export function createBitmapSurface(width, height, color = [0, 0, 0, 0]) {
  const resolvedWidth = finiteInteger(width, 512, 1, 4096);
  const resolvedHeight = finiteInteger(height, 256, 1, 4096);
  const data = new Uint8Array(resolvedWidth * resolvedHeight * 4);
  const surface = { width: resolvedWidth, height: resolvedHeight, data };
  fillBitmapRect(surface, 0, 0, resolvedWidth, resolvedHeight, color);
  return surface;
}

export function fillBitmapRect(surface, x, y, width, height, color) {
  const rgba = parseBitmapColor(color, [0, 0, 0, 0]);
  const left = Math.max(0, finiteInteger(x, 0, -16384, 16384));
  const top = Math.max(0, finiteInteger(y, 0, -16384, 16384));
  const right = Math.min(surface.width, left + finiteInteger(width, 0, 0, 16384));
  const bottom = Math.min(surface.height, top + finiteInteger(height, 0, 0, 16384));
  for (let py = top; py < bottom; py += 1) {
    for (let px = left; px < right; px += 1) {
      const offset = (py * surface.width + px) * 4;
      const alpha = rgba[3] / 255;
      if (alpha >= 1) {
        surface.data[offset] = rgba[0];
        surface.data[offset + 1] = rgba[1];
        surface.data[offset + 2] = rgba[2];
        surface.data[offset + 3] = rgba[3];
      } else if (alpha > 0) {
        const inverse = 1 - alpha;
        surface.data[offset] = Math.round(rgba[0] * alpha + surface.data[offset] * inverse);
        surface.data[offset + 1] = Math.round(rgba[1] * alpha + surface.data[offset + 1] * inverse);
        surface.data[offset + 2] = Math.round(rgba[2] * alpha + surface.data[offset + 2] * inverse);
        surface.data[offset + 3] = Math.round(rgba[3] + surface.data[offset + 3] * inverse);
      }
    }
  }
  return surface;
}

function strokeBitmapRect(surface, x, y, width, height, color, thickness = 1) {
  const resolvedThickness = finiteInteger(thickness, 1, 1, 64);
  fillBitmapRect(surface, x, y, width, resolvedThickness, color);
  fillBitmapRect(surface, x, y + height - resolvedThickness, width, resolvedThickness, color);
  fillBitmapRect(surface, x, y, resolvedThickness, height, color);
  fillBitmapRect(surface, x + width - resolvedThickness, y, resolvedThickness, height, color);
}

export function drawBitmapText(surface, value, options = {}) {
  const x = finiteInteger(options.x, 0, -16384, 16384);
  const y = finiteInteger(options.y, 0, -16384, 16384);
  const maxWidth = options.maxWidth ?? Math.max(0, surface.width - x);
  const layout = layoutBitmapText(value, { ...options, maxWidth });
  const color = parseBitmapColor(options.color, parseBitmapColor(DEFAULT_PALETTE.text));
  const align = options.align === 'center' || options.align === 'right' ? options.align : 'left';
  const boxWidth = finiteInteger(maxWidth, layout.width, 0, 16384);

  layout.lines.forEach((line, lineIndex) => {
    const lineWidth = layout.widths[lineIndex];
    const offsetX = align === 'center' ? Math.floor((boxWidth - lineWidth) / 2) : align === 'right' ? boxWidth - lineWidth : 0;
    let cursorX = x + Math.max(0, offsetX);
    const cursorY = y + lineIndex * layout.lineHeight;
    for (const sourceCharacter of line) {
      const character = sourceCharacter >= 'a' && sourceCharacter <= 'z' ? sourceCharacter.toUpperCase() : sourceCharacter;
      const glyph = GLYPHS[character] ?? GLYPHS['?'];
      glyph.forEach((bits, row) => {
        for (let column = 0; column < 5; column += 1) {
          if ((bits & (1 << (4 - column))) !== 0) {
            fillBitmapRect(
              surface,
              cursorX + column * layout.scale,
              cursorY + row * layout.scale,
              layout.scale,
              layout.scale,
              color
            );
          }
        }
      });
      cursorX += layout.advance;
    }
  });
  return layout;
}

function drawPanel(surface, node, palette) {
  const x = finiteInteger(node.x, 0, -16384, 16384);
  const y = finiteInteger(node.y, 0, -16384, 16384);
  const width = finiteInteger(node.width, surface.width - x, 1, 16384);
  const height = finiteInteger(node.height, surface.height - y, 1, 16384);
  fillBitmapRect(surface, x, y, width, height, node.fill ?? node.background ?? palette.panel);
  if (node.border !== false) {
    strokeBitmapRect(surface, x, y, width, height, node.border ?? palette.border, node.borderWidth ?? 2);
  }
}

function drawBar(surface, node, palette) {
  const x = finiteInteger(node.x, 0, -16384, 16384);
  const y = finiteInteger(node.y, 0, -16384, 16384);
  const width = finiteInteger(node.width, 180, 1, 16384);
  const height = finiteInteger(node.height, 16, 1, 16384);
  const ratio = node.max != null ? clamp01(Number(node.value) / Math.max(Number(node.max) || 1, 1e-9)) : clamp01(node.value);
  fillBitmapRect(surface, x, y, width, height, node.track ?? palette.track);
  fillBitmapRect(surface, x, y, Math.round(width * ratio), height, node.fill ?? node.color ?? palette.accent);
  if (node.border !== false) strokeBitmapRect(surface, x, y, width, height, node.border ?? palette.border, node.borderWidth ?? 1);
  if (node.label != null) {
    drawBitmapText(surface, node.label, {
      x: node.labelX ?? x,
      y: node.labelY ?? y - 16,
      maxWidth: node.labelWidth ?? width,
      scale: node.labelScale ?? 1,
      color: node.textColor ?? palette.text
    });
  }
}

function drawButton(surface, node, palette) {
  const x = finiteInteger(node.x, 0, -16384, 16384);
  const y = finiteInteger(node.y, 0, -16384, 16384);
  const width = finiteInteger(node.width, 180, 1, 16384);
  const height = finiteInteger(node.height, 36, 1, 16384);
  fillBitmapRect(surface, x, y, width, height, node.fill ?? (node.active ? palette.buttonActive : palette.button));
  if (node.border !== false) strokeBitmapRect(surface, x, y, width, height, node.border ?? palette.border, node.borderWidth ?? 2);
  if (node.label != null) {
    const scale = finiteInteger(node.scale, 2, 1, 32);
    const layout = layoutBitmapText(node.label, { scale, maxWidth: Math.max(1, width - 12), maxLines: 1 });
    drawBitmapText(surface, layout.lines[0] ?? '', {
      x: x + 6,
      y: y + Math.max(0, Math.floor((height - layout.glyphHeight) / 2)),
      maxWidth: width - 12,
      maxLines: 1,
      scale,
      align: node.align ?? 'center',
      color: node.textColor ?? palette.text
    });
  }
}

function drawTextNode(surface, node, palette) {
  drawBitmapText(surface, node.value ?? node.text ?? node.label ?? '', {
    ...node,
    color: node.color ?? palette.text
  });
}

function drawNode(surface, node, palette) {
  if (!node || node.hidden) return;
  const type = node.type ?? node.kind ?? 'text';
  if (type === 'panel') drawPanel(surface, node, palette);
  else if (type === 'bar' || type === 'progress') drawBar(surface, node, palette);
  else if (type === 'button') drawButton(surface, node, palette);
  else if (type === 'text' || type === 'label') drawTextNode(surface, node, palette);
}

function implicitNodes(descriptor, width, height) {
  const padding = finiteInteger(descriptor.padding, 18, 0, 512);
  const nodes = [];
  let cursorY = padding;
  if (descriptor.title != null) {
    nodes.push({ type: 'text', value: descriptor.title, x: padding, y: cursorY, maxWidth: width - padding * 2, scale: descriptor.titleScale ?? 3, color: descriptor.titleColor });
    cursorY += 29;
  }
  if (descriptor.body != null) {
    nodes.push({ type: 'text', value: descriptor.body, x: padding, y: cursorY, maxWidth: width - padding * 2, scale: descriptor.bodyScale ?? 2, color: descriptor.bodyColor });
  }
  if (descriptor.footer != null) {
    nodes.push({ type: 'text', value: descriptor.footer, x: padding, y: height - padding - 14, maxWidth: width - padding * 2, scale: descriptor.footerScale ?? 1, color: descriptor.footerColor });
  }
  return nodes;
}

/**
 * Render a generic descriptor into a raw RGBA surface.
 *
 * Descriptor shape:
 * { width, height, background, border, title, body, footer,
 *   layers: [{type:'panel'|'text'|'bar'|'button', ...}] }
 */
export function renderBitmapUi(descriptor = {}, options = {}) {
  const width = finiteInteger(options.width ?? descriptor.width, 512, 1, 4096);
  const height = finiteInteger(options.height ?? descriptor.height, 256, 1, 4096);
  const palette = Object.freeze({ ...DEFAULT_PALETTE, ...(options.palette ?? descriptor.palette ?? {}) });
  const surface = createBitmapSurface(width, height, descriptor.background ?? palette.background);

  if (descriptor.border !== false) {
    strokeBitmapRect(surface, 0, 0, width, height, descriptor.border ?? palette.border, descriptor.borderWidth ?? 2);
  }

  const layers = [
    ...implicitNodes(descriptor, width, height),
    ...(Array.isArray(descriptor.layers) ? descriptor.layers : []),
    ...(Array.isArray(descriptor.nodes) ? descriptor.nodes : []),
    ...(Array.isArray(descriptor.bars) ? descriptor.bars.map((node) => ({ type: 'bar', ...node })) : []),
    ...(Array.isArray(descriptor.buttons) ? descriptor.buttons.map((node) => ({ type: 'button', ...node })) : [])
  ];
  for (const node of layers) drawNode(surface, node, palette);

  return Object.freeze({
    width,
    height,
    data: surface.data,
    palette,
    signature: `${width}x${height}:${layers.length}:${normalizeBitmapText(descriptor.title ?? '').length}:${normalizeBitmapText(descriptor.body ?? '').length}`
  });
}

export function createBitmapTexture(THREE, descriptor = {}, options = {}) {
  if (!THREE?.DataTexture || THREE.RGBAFormat == null) {
    throw new TypeError('createBitmapTexture requires a THREE namespace with DataTexture and RGBAFormat.');
  }
  const bitmap = renderBitmapUi(descriptor, options);
  const texture = new THREE.DataTexture(bitmap.data, bitmap.width, bitmap.height, THREE.RGBAFormat, THREE.UnsignedByteType);
  if (THREE.NearestFilter != null) texture.magFilter = THREE.NearestFilter;
  if (THREE.LinearFilter != null) texture.minFilter = THREE.LinearFilter;
  if ('generateMipmaps' in texture) texture.generateMipmaps = false;
  if (THREE.SRGBColorSpace != null && 'colorSpace' in texture) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  texture.userData = { ...(texture.userData ?? {}), bitmapUi: { signature: bitmap.signature } };
  return texture;
}

export function updateBitmapTexture(THREE, texture, descriptor = {}, options = {}) {
  if (!texture?.isTexture) throw new TypeError('updateBitmapTexture requires an existing THREE texture.');
  const bitmap = renderBitmapUi(descriptor, options);
  texture.image = { data: bitmap.data, width: bitmap.width, height: bitmap.height };
  if (THREE?.RGBAFormat != null) texture.format = THREE.RGBAFormat;
  if (THREE?.UnsignedByteType != null) texture.type = THREE.UnsignedByteType;
  texture.needsUpdate = true;
  texture.userData = { ...(texture.userData ?? {}), bitmapUi: { signature: bitmap.signature } };
  return texture;
}

export const BITMAP_FONT = Object.freeze({
  width: 5,
  height: 7,
  supported: 'ASCII 32-126 (lowercase rendered with uppercase glyphs)',
  glyphs: GLYPHS
});

export const BITMAP_UI_DEFAULTS = DEFAULT_PALETTE;
