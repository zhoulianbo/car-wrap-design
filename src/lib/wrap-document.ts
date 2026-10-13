/** Resolve only the current texture or an immutable image referenced by this wrap. */
export function resolveWrapTextureSource(
  wrap: { id: string; textureUrl: string | null; canvasJson: string },
  requestedSource: string | null
) {
  if (!requestedSource || requestedSource === wrap.textureUrl)
    return wrap.textureUrl;
  const reference = `/api/wraps/${encodeURIComponent(wrap.id)}?texture=1&source=${encodeURIComponent(requestedSource)}`;
  const nodes = JSON.parse(wrap.canvasJson || '{}').nodes;
  return Array.isArray(nodes) &&
    nodes.some(
      (node: { kind?: string; imageUrl?: string }) =>
        node.kind === 'image' && node.imageUrl === reference
    )
    ? requestedSource
    : null;
}

/** An editable snapshot, not an operation log. Raster sources remain in storage. */
export function imageWrapDocument(url: string, name = 'Wrap texture') {
  return {
    version: 1,
    width: 1024,
    height: 1024,
    background: 'transparent',
    nodes: [
      {
        id: crypto.randomUUID(),
        kind: 'image',
        name,
        imageUrl: url,
        x: 0,
        y: 0,
        width: 1024,
        height: 1024,
        rotation: 0,
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
      },
    ],
  };
}

export function validateWrapDocument(value: string) {
  if (value.length > 2_000_000) throw new Error('Canvas is too large');
  const document = JSON.parse(value);
  if (
    document.version !== 1 ||
    document.width !== 1024 ||
    document.height !== 1024 ||
    !Array.isArray(document.nodes)
  ) {
    throw new Error('Invalid canvas snapshot');
  }
  return value;
}
