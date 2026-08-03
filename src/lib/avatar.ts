/**
 * Returns true when `value` looks like an absolute http(s) avatar URL we can try to load.
 * Callers should still fall back to initials if the image request fails at runtime.
 */
export function isUsableAvatarUrl(
  value: string | null | undefined,
): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
