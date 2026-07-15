export function clampRangeValue(value: number, min: number, max: number, step: number) {
  if (!Number.isFinite(value)) return min;
  const clamped = Math.max(min, Math.min(max, value));
  const stepped = min + Math.round((clamped - min) / step) * step;
  const decimals = Math.min(10, Math.max(
    String(step).split(".")[1]?.length ?? 0,
    String(min).split(".")[1]?.length ?? 0
  ));
  return Math.max(min, Math.min(max, Number(stepped.toFixed(decimals))));
}

export function rangeValueFromPointer({ clientX, left, width, inset, min, max, step }: { clientX: number; left: number; width: number; inset: number; min: number; max: number; step: number }) {
  const usableWidth = Math.max(1, width - inset * 2);
  const progress = Math.max(0, Math.min(1, (clientX - left - inset) / usableWidth));
  return clampRangeValue(min + progress * (max - min), min, max, step);
}
