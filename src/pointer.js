/**
 * Normalized pointer position for touch or mouse events (first touch when multi-touch).
 */
export function getPointerClientXY(e) {
  const p = e.touches ? e.touches[0] : e;
  return { x: p.clientX, y: p.clientY };
}
