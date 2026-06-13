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

/**
 * Returns a recipient's relationship for display, treating the literal string
 * "null" (and empty/whitespace) as "no relationship set". Older recipients were
 * saved with the word "null" because the column is NOT NULL and the extractor
 * emitted a placeholder string (DEV-139); never surface that to the user.
 */
export function cleanRelationship(relationshipType?: string | null): string {
  const value = relationshipType?.trim();
  if (!value || value.toLowerCase() === "null") return "";
  return value;
}
