/**
 * Family facts from the user's recipient graph (DEV-335).
 *
 * Occasion candidates combine facts across the user's recipients — e.g. a
 * spouse only becomes a Mother's/Father's Day candidate when the user
 * demonstrably has children. The only graph fact consumed today is
 * "user has children", read from the user's other recipients.
 */

import type { FamilyFacts } from "./relationships.ts";

const CHILD_RELATIONSHIPS = new Set([
  "son",
  "daughter",
  "child",
  "stepson",
  "step-son",
  "stepdaughter",
  "step-daughter",
]);

const CHILD_ROLES = new Set(["son", "daughter", "child"]);

interface RecipientRow {
  id: string;
  relationship_type: string | null;
  known_roles: string[] | null;
}

function isChildRecipient(row: RecipientRow): boolean {
  const relationship = (row.relationship_type ?? "").trim().toLowerCase();
  if (CHILD_RELATIONSHIPS.has(relationship)) return true;
  return (row.known_roles ?? []).some((role) =>
    CHILD_ROLES.has(role.trim().toLowerCase())
  );
}

/**
 * Fetch the user's recipients and derive family facts. Failures degrade to
 * "no facts known" — occasion recommendations must never 500 because the
 * graph read failed.
 */
export async function fetchFamilyFacts(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  excludeRecipientId?: string
): Promise<FamilyFacts> {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/recipients?user_id=eq.${userId}&select=id,relationship_type,known_roles`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );
    if (!response.ok) {
      console.warn("fetchFamilyFacts non-2xx:", response.status);
      return { userHasChildren: false };
    }
    const rows = (await response.json()) as RecipientRow[];
    const userHasChildren = rows.some(
      (row) => row.id !== excludeRecipientId && isChildRecipient(row)
    );
    return { userHasChildren };
  } catch (err) {
    console.warn("fetchFamilyFacts failed:", err);
    return { userHasChildren: false };
  }
}
