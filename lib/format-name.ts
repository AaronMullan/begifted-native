/**
 * Formats a full name as "First L." (first name + last initial).
 * Single names are returned as-is.
 */
export function formatShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
