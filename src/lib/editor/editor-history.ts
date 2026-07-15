export function shouldCoalesceHistory(previousMergeKey: string | undefined, nextMergeKey: string | undefined) {
  return Boolean(nextMergeKey && previousMergeKey === nextMergeKey);
}
