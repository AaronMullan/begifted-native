/**
 * Deterministic core-occasion candidate generation (DEV-310).
 *
 * The model no longer decides whether a core occasion (birthday,
 * Mother's/Father's Day, anniversary, Valentine's, winter gifting holiday)
 * exists for a recipient — this module derives candidates in code from
 * relationship/profile data. The model only ranks candidates and writes
 * copy; validation re-injects any `required` candidate the model drops.
 */

import { inferRolesFromRelationship } from "./relationships.ts";
import {
  extractFutureDate,
  nextFathersDay,
  nextHanukkah,
  nextDiwali,
  nextMothersDay,
  nextOccurrenceOfMonthDay,
  parseBirthdayParts,
} from "./occasion-dates.ts";

export interface CoreOccasionCandidate {
  /** Stable id the model uses to reference the candidate. */
  key: string;
  type: "birthday" | "major_gifting_holiday" | "relationship_based_occasion";
  name: string;
  /** Resolved in code; null = valid occasion whose date the user must supply. */
  suggestedDate: string | null;
  isMilestone: boolean;
  /** Required candidates must reach the user even if the model drops them. */
  required: boolean;
}

export interface CoreOccasionInput {
  /** Normalized relationship (see normalizeRelationship). */
  relationship: string;
  knownRoles: string[];
  birthday: string | null;
  importantDates: string[];
  /** Occasions the recipient already tracks — never re-suggested. */
  knownOccasions: string[];
  culturalContext: string;
}

const MILESTONE_AGES = new Set([1, 16, 18, 21, 30, 40, 50, 60, 70, 100]);

const SPOUSE_RELATIONSHIPS = new Set(["husband", "wife", "spouse"]);

const ROMANTIC_RELATIONSHIPS = new Set([
  "husband",
  "wife",
  "spouse",
  "partner",
  "boyfriend",
  "girlfriend",
  "fiancé",
  "fiancée",
  "fiance",
  "fiancee",
]);

// Relationships for which a winter gifting holiday is a default core
// candidate in beta: child, spouse/partner, parent, sibling, grandparent/
// grandchild, and close in-laws.
const WINTER_HOLIDAY_RELATIONSHIPS = new Set([
  "son",
  "daughter",
  "child",
  "husband",
  "wife",
  "spouse",
  "partner",
  "mother",
  "father",
  "brother",
  "sister",
  "grandmother",
  "grandfather",
  "grandson",
  "granddaughter",
  "mother-in-law",
  "father-in-law",
  "sister-in-law",
  "brother-in-law",
  "son-in-law",
  "daughter-in-law",
]);

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function deriveCoreOccasions(
  input: CoreOccasionInput
): CoreOccasionCandidate[] {
  const candidates: CoreOccasionCandidate[] = [];
  const relationship = input.relationship.trim().toLowerCase();
  const roles = (
    input.knownRoles.length > 0
      ? input.knownRoles
      : inferRolesFromRelationship(relationship)
  ).map((r) => r.toLowerCase());
  const known = input.knownOccasions.map((k) => k.toLowerCase());
  const alreadyTracked = (pattern: RegExp) =>
    known.some((k) => pattern.test(k));

  // Birthday — required whenever a birthday is known.
  const birthday = parseBirthdayParts(input.birthday);
  if (birthday) {
    const suggestedDate = nextOccurrenceOfMonthDay(
      birthday.month,
      birthday.day
    );
    let name = "Birthday";
    let isMilestone = false;
    if (birthday.year) {
      const age = Number(suggestedDate.slice(0, 4)) - birthday.year;
      if (age > 0 && age < 120) {
        name = `${ordinal(age)} Birthday`;
        isMilestone = MILESTONE_AGES.has(age);
      }
    }
    candidates.push({
      key: "birthday",
      type: "birthday",
      name,
      suggestedDate,
      isMilestone,
      required: true,
    });
  }

  // Mother's / Father's Day — required for supported parent roles
  // (mother/father, in-laws, grandparents; a spouse confirmed as a parent of
  // the user's children arrives via explicit knownRoles from extraction).
  const isMotherRole = roles.some((r) => /\b(mother|grandmother)\b/.test(r));
  const isFatherRole = roles.some((r) => /\b(father|grandfather)\b/.test(r));
  if (isMotherRole && !alreadyTracked(/mother.?s.?_?day/)) {
    candidates.push({
      key: "mothers_day",
      type: "relationship_based_occasion",
      name: "Mother's Day",
      suggestedDate: nextMothersDay(),
      isMilestone: false,
      required: true,
    });
  }
  if (isFatherRole && !alreadyTracked(/father.?s.?_?day/)) {
    candidates.push({
      key: "fathers_day",
      type: "relationship_based_occasion",
      name: "Father's Day",
      suggestedDate: nextFathersDay(),
      isMilestone: false,
      required: true,
    });
  }

  // Wedding anniversary — spouse/married partner. Valid without a date:
  // stays a "date required" candidate (suggestedDate null) rather than
  // being treated as trackable.
  if (
    SPOUSE_RELATIONSHIPS.has(relationship) &&
    !alreadyTracked(/anniversary/)
  ) {
    const anniversarySource = input.importantDates.find((d) =>
      /anniversary/i.test(d)
    );
    candidates.push({
      key: "wedding_anniversary",
      type: "relationship_based_occasion",
      name: "Wedding Anniversary",
      suggestedDate: anniversarySource
        ? extractFutureDate(anniversarySource)
        : null,
      isMilestone: false,
      required: false,
    });
  }

  // Valentine's Day — romantic partners.
  if (
    ROMANTIC_RELATIONSHIPS.has(relationship) &&
    !alreadyTracked(/valentine/)
  ) {
    candidates.push({
      key: "valentines_day",
      type: "major_gifting_holiday",
      name: "Valentine's Day",
      suggestedDate: nextOccurrenceOfMonthDay(2, 14),
      isMilestone: false,
      required: false,
    });
  }

  // Winter gifting holiday. Supplied cultural context wins over the
  // relationship matrix: it can confirm Christmas, swap in a different
  // resolvable holiday, or (when it names neither) suppress the default.
  const culturalContext = input.culturalContext.trim().toLowerCase();
  const winterHoliday = resolveWinterHoliday(
    culturalContext,
    WINTER_HOLIDAY_RELATIONSHIPS.has(relationship)
  );
  if (winterHoliday && !alreadyTracked(winterHoliday.trackedPattern)) {
    candidates.push({
      key: winterHoliday.key,
      type: "major_gifting_holiday",
      name: winterHoliday.name,
      suggestedDate: winterHoliday.suggestedDate,
      isMilestone: false,
      required: false,
    });
  }

  // Supplied personal milestones, traditions, or dates → candidates.
  // Anniversary entries are consumed by the wedding-anniversary candidate.
  let personalIndex = 1;
  for (const entry of input.importantDates) {
    if (/anniversary/i.test(entry)) continue;
    const label = entry.split(/\s+[—–]\s+|\s+\(/)[0].trim();
    if (!label || label.length > 60) continue;
    candidates.push({
      key: `personal_${personalIndex++}`,
      type: "relationship_based_occasion",
      name: label.charAt(0).toUpperCase() + label.slice(1),
      suggestedDate: extractFutureDate(entry),
      isMilestone: false,
      required: false,
    });
  }

  return candidates;
}

interface WinterHoliday {
  key: string;
  name: string;
  suggestedDate: string | null;
  trackedPattern: RegExp;
}

function resolveWinterHoliday(
  culturalContext: string,
  relationshipQualifies: boolean
): WinterHoliday | null {
  const christmas: WinterHoliday = {
    key: "christmas",
    name: "Christmas",
    suggestedDate: nextOccurrenceOfMonthDay(12, 25),
    trackedPattern: /christmas/,
  };
  if (!culturalContext) {
    return relationshipQualifies ? christmas : null;
  }
  if (/christmas/.test(culturalContext)) return christmas;
  if (/hanukkah|chanukah/.test(culturalContext)) {
    const date = nextHanukkah();
    return date
      ? {
          key: "hanukkah",
          name: "Hanukkah",
          suggestedDate: date,
          trackedPattern: /hanukkah|chanukah/,
        }
      : null;
  }
  if (/diwali/.test(culturalContext)) {
    const date = nextDiwali();
    return date
      ? {
          key: "diwali",
          name: "Diwali",
          suggestedDate: date,
          trackedPattern: /diwali/,
        }
      : null;
  }
  if (/kwanzaa|kwanza/.test(culturalContext)) {
    return {
      key: "kwanzaa",
      name: "Kwanzaa",
      suggestedDate: nextOccurrenceOfMonthDay(12, 26),
      trackedPattern: /kwanzaa|kwanza/,
    };
  }
  // Cultural context supplied but names no holiday we can resolve a real
  // date for — suppress the default rather than guessing.
  return null;
}
