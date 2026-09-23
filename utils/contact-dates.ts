import type { Date as ContactDate } from "expo-contacts/legacy";
import { isValidMonthDay } from "./occasion-dates";

/** Calendar month (1-12), not expo-contacts' 0-indexed month. */
export type ContactDateParts = { month: number; day: number; year?: number };

// iOS hands over the label already localized, so this literal only matches
// English devices (Android always emits "anniversary"). Other and custom
// labels are ignored rather than guessed at.
export function contactAnniversary(
  dates: ContactDate[] | undefined
): ContactDateParts | undefined {
  const date = dates?.find(
    (d) => d.label?.trim().toLowerCase() === "anniversary"
  );
  // A lunar or other non-Gregorian date's month/day isn't a Gregorian date.
  if (!date || (date.format && date.format !== "gregorian")) return undefined;
  // expo-contacts emits months 0-indexed, like the birthday; `??` keeps
  // January (0) from reading as missing.
  const month = (date.month ?? -1) + 1;
  if (!isValidMonthDay(month, date.day)) return undefined;
  return { month, day: date.day, year: date.year || undefined };
}

// vCard dates: YYYYMMDD, YYYY-MM-DD, or yearless --MMDD / --MM-DD.
function parseVCardDate(value: string): ContactDateParts | undefined {
  const match = /^(\d{4}|--)-?(\d{2})-?(\d{2})/.exec(value.trim());
  if (!match) return undefined;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidMonthDay(month, day)) return undefined;
  return {
    month,
    day,
    year: match[1] === "--" ? undefined : Number(match[1]),
  };
}

// vCard 4 has ANNIVERSARY; Apple's exporter instead writes a grouped
// X-ABDATE whose X-ABLabel carries the unlocalized anniversary token.
export function vCardAnniversary(card: string): ContactDateParts | undefined {
  const direct = card.match(/^(?:X-)?ANNIVERSARY[^:\n]*:(.*)$/im);
  if (direct) return parseVCardDate(direct[1]);
  const label = card.match(
    /^([^.\n]+)\.X-ABLABEL[^:\n]*:_\$!<Anniversary>!\$_\s*$/im
  );
  if (!label) return undefined;
  const group = label[1].trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const date = card.match(
    new RegExp(`^${group}\\.X-ABDATE[^:\\n]*:(.*)$`, "im")
  );
  return date ? parseVCardDate(date[1]) : undefined;
}
