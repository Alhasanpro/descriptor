function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, stableValue(child)]));
  return value;
}

export function canonicalExportSpec(value: unknown) {
  return JSON.stringify(stableValue(value));
}

/**
 * Describes the edit that a render represents. A deliberate render-attempt ID
 * is excluded so the UI can still tell whether the underlying edit changed.
 */
export function canonicalExportEditSpec(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return canonicalExportSpec(value);
  const editSpec = Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => key !== "renderRequestId"));
  return canonicalExportSpec(editSpec);
}
