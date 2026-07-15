export function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${remainder.toFixed(1).padStart(4, "0")}`;
}

export type TimeRange = { start: number; end: number };

export function mergeTimeRanges(ranges: TimeRange[], duration = Number.POSITIVE_INFINITY) {
  const sorted = ranges
    .map((range) => ({ start: Math.max(0, range.start), end: Math.min(duration, range.end) }))
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start);
  if (!sorted.length) return [];
  const merged: TimeRange[] = [];
  let current = { ...sorted[0] };
  for (const range of sorted.slice(1)) {
    if (range.start <= current.end) current.end = Math.max(current.end, range.end);
    else {
      merged.push(current);
      current = { ...range };
    }
  }
  merged.push(current);
  return merged;
}

export function unionDuration(ranges: TimeRange[]) {
  return mergeTimeRanges(ranges).reduce((total, range) => total + range.end - range.start, 0);
}

export function keptTimeRanges(duration: number, removedRanges: TimeRange[]) {
  const removed = mergeTimeRanges(removedRanges, duration);
  const kept: TimeRange[] = [];
  let cursor = 0;
  for (const range of removed) {
    if (range.start > cursor) kept.push({ start: cursor, end: range.start });
    cursor = Math.max(cursor, range.end);
  }
  if (cursor < duration) kept.push({ start: cursor, end: duration });
  return kept;
}

export function sourceToEditedTime(sourceTime: number, removedRanges: TimeRange[]) {
  const time = Math.max(0, sourceTime);
  let removedBefore = 0;
  for (const range of mergeTimeRanges(removedRanges)) {
    if (time >= range.end) removedBefore += range.end - range.start;
    else if (time > range.start) return range.start - removedBefore;
    else break;
  }
  return Math.max(0, time - removedBefore);
}

export function editedToSourceTime(editedTime: number, duration: number, removedRanges: TimeRange[]) {
  const target = Math.max(0, editedTime);
  let editedCursor = 0;
  for (const range of keptTimeRanges(duration, removedRanges)) {
    const segmentDuration = range.end - range.start;
    if (target <= editedCursor + segmentDuration) return Math.min(range.end, range.start + target - editedCursor);
    editedCursor += segmentDuration;
  }
  return duration;
}

export function removedRangeAtTime(sourceTime: number, removedRanges: TimeRange[]) {
  return mergeTimeRanges(removedRanges).find((range) => sourceTime >= range.start && sourceTime < range.end);
}
