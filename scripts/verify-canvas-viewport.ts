/** Viewport geometry only: no providers, storage, or user data. */
import assert from 'node:assert/strict';

import { fitCanvasView, zoomCanvasView } from '../src/lib/wrap-editor-geometry';

const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
for (const [width, height] of [
  [1512, 920],
  [390, 780],
  [800, 600],
]) {
  const view = fitCanvasView(width, height);
  close(view.x + 512 * view.scale, width / 2);
  close(view.y + 512 * view.scale, height / 2);
  for (const anchor of [
    { x: 0, y: 0 },
    { x: width / 2, y: height / 2 },
    { x: width - 10, y: height - 20 },
  ]) {
    for (const factor of [0.001, 0.8, 1.2, 1000]) {
      const zoomed = zoomCanvasView(view, factor, anchor);
      assert.ok(zoomed.scale >= 0.1 && zoomed.scale <= 4);
      close(
        (anchor.x - zoomed.x) / zoomed.scale,
        (anchor.x - view.x) / view.scale
      );
      close(
        (anchor.y - zoomed.y) / zoomed.scale,
        (anchor.y - view.y) / view.scale
      );
    }
    const roundTrip = zoomCanvasView(
      zoomCanvasView(view, 1.2, anchor),
      1 / 1.2,
      anchor
    );
    close(roundTrip.x, view.x);
    close(roundTrip.y, view.y);
    close(roundTrip.scale, view.scale);
  }
}
for (const scale of [0.1, 4]) {
  const view = { x: -375, y: 229, scale };
  const limited = zoomCanvasView(view, scale === 4 ? 10 : 0.01, {
    x: 910,
    y: 620,
  });
  assert.deepEqual(limited, view, 'zoom limits must not pan the document');
}
console.log(
  'PASS: centered fit, cursor-anchored zoom, 10–400% limits, and reversible view transforms'
);
