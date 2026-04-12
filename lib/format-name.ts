/**
 * Formats a full name as "First L." (first name + last initial).
 * Single names are returned as-is.
 * Uses Array.from() for proper Unicode grapheme handling.
 */
export function formatShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  const lastInitial = Array.from(parts[parts.length - 1])[0];
  return `${parts[0]} ${lastInitial}.`;
}
