export function normalizeQuantity(value: number, min = 1, max = 99, step = 1) {
  const safe = Number.isFinite(value) ? value : min;
  const normalized = Math.round(safe / step) * step;
  return Math.round(Math.max(0, Math.min(max, Math.max(min, normalized))) * 100) / 100;
}
