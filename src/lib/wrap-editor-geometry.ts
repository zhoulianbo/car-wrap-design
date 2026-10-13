export type CanvasView = { x: number; y: number; scale: number };
export const MIN_CANVAS_SCALE = 0.1;
export const MAX_CANVAS_SCALE = 4;

export function fitCanvasView(width: number, height: number): CanvasView {
  const availableWidth = width >= 1024 ? width - 340 : width - 80;
  const size = Math.min(
    4096,
    Math.max(120, Math.floor(Math.min(availableWidth, height - 120)))
  );
  return { x: (width - size) / 2, y: (height - size) / 2, scale: size / 1024 };
}

/** Keep the same document point beneath the cursor, including at zoom limits. */
export function zoomCanvasView(
  view: CanvasView,
  factor: number,
  anchor: { x: number; y: number }
): CanvasView {
  const scale = Math.max(
    MIN_CANVAS_SCALE,
    Math.min(MAX_CANVAS_SCALE, view.scale * factor)
  );
  const ratio = scale / view.scale;
  return {
    x: anchor.x - (anchor.x - view.x) * ratio,
    y: anchor.y - (anchor.y - view.y) * ratio,
    scale,
  };
}

export function editorToolCursor(tool: string, shape: string, eraser: string) {
  if (tool === 'move') return undefined;
  if (tool === 'text') return 'text';
  if (tool === 'select') return 'default';
  const paths: Record<string, string> = {
    rect: '<rect x="5" y="5" width="22" height="22"/>',
    circle: '<circle cx="16" cy="16" r="11"/>',
    diamond: '<path d="M16 3L29 16L16 29L3 16Z"/>',
    polygon: '<path d="M10 4H22L29 16L22 28H10L3 16Z"/>',
    line: '<path d="M5 27L27 5"/>',
    arrow: '<path d="M5 27L27 5M14 5H27V18"/>',
    pen: '<path d="M5 27L10 12L24 5L27 8L20 22ZM5 27L17 15"/><circle cx="18" cy="14" r="2"/>',
    panel: '<path d="M4 17L17 4L28 15L15 28ZM4 17H26"/>',
  };
  const key =
    tool === 'eraser'
      ? eraser === 'square'
        ? 'rect'
        : 'circle'
      : tool === 'brush'
        ? 'circle'
        : tool === 'shape'
          ? shape
          : tool;
  const path = paths[key] ?? '<path d="M16 3v26M3 16h26"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><g fill="none" stroke="white" stroke-width="3">${path}</g><g fill="none" stroke="#111827" stroke-width="1.5">${path}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 16 16, crosshair`;
}

/** Rotate an element around a measured local center, including flips/scales. */
export function rotateAroundCenter<
  T extends {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
  },
>(node: T, center: { x: number; y: number }, degrees: number): T {
  const angle = (node.rotation * Math.PI) / 180;
  const nextAngle = ((node.rotation + degrees) * Math.PI) / 180;
  const x = center.x * node.scaleX;
  const y = center.y * node.scaleY;
  return {
    ...node,
    rotation: node.rotation + degrees,
    x:
      node.x +
      x * (Math.cos(angle) - Math.cos(nextAngle)) -
      y * (Math.sin(angle) - Math.sin(nextAngle)),
    y:
      node.y +
      x * (Math.sin(angle) - Math.sin(nextAngle)) +
      y * (Math.cos(angle) - Math.cos(nextAngle)),
  };
}

/** Segment the white UV islands; the outer template frame is not paintable. */
export function segmentWrapPanels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  const labels = new Int32Array(width * height);
  const queue = new Int32Array(width * height);
  const panels: number[][] = [];
  const edgePanels: number[][] = [];
  const white = (i: number) =>
    pixels[i * 4 + 3] > 128 &&
    pixels[i * 4] > 200 &&
    pixels[i * 4 + 1] > 200 &&
    pixels[i * 4 + 2] > 200;
  for (let seed = 0; seed < labels.length; seed++) {
    if (labels[seed] || !white(seed)) continue;
    let head = 0,
      tail = 1,
      edges = 0;
    queue[0] = seed;
    labels[seed] = -1;
    while (head < tail) {
      const i = queue[head++];
      const x = i % width,
        y = Math.floor(i / width);
      if (x === 0) edges |= 1;
      if (x === width - 1) edges |= 2;
      if (y === 0) edges |= 4;
      if (y === height - 1) edges |= 8;
      const neighbors = [
        x > 0 ? i - 1 : -1,
        x < width - 1 ? i + 1 : -1,
        y > 0 ? i - width : -1,
        y < height - 1 ? i + width : -1,
      ];
      for (const next of neighbors)
        if (next >= 0 && !labels[next] && white(next)) {
          labels[next] = -1;
          queue[tail++] = next;
        }
    }
    // A frame surrounds all four sides. Real UV islands (Cybertruck doors)
    // may touch several edges and must remain paintable.
    if (edges === 15 || tail < 24) continue;
    const panel = Array.from(queue.subarray(0, tail));
    (edges ? edgePanels : panels).push(panel);
  }
  // Append newly supported edge islands so saved interior panel IDs stay stable.
  panels.push(...edgePanels);
  panels.forEach((panel, index) => {
    for (const i of panel) labels[i] = index + 1;
  });
  return { labels, panels, width, height };
}
