/**
 * Likely-same-person matching for the add flow's duplicate check. Deliberately
 * loose: a false positive costs one "Add anyway" tap, a false negative splits a
 * person's gifts and moments across two records.
 */

// Each group is one given name and its common short forms. A name may sit in
// several groups ("chris"), so two first names match when any group holds both.
const NICKNAME_GROUPS: string[][] = [
  ["alexander", "alex", "al", "xander", "sandy"],
  ["alexandra", "alex", "alexa", "sandra", "sandy", "lexi"],
  ["andrew", "andy", "drew"],
  ["anthony", "tony"],
  ["benjamin", "ben", "benny", "benji"],
  [
    "catherine",
    "katherine",
    "kathryn",
    "cathy",
    "kathy",
    "kate",
    "katie",
    "kat",
  ],
  ["charles", "charlie", "chuck", "chaz"],
  ["christina", "christine", "chris", "tina", "christy"],
  ["christopher", "chris", "topher"],
  ["daniel", "dan", "danny"],
  ["david", "dave", "davey"],
  ["deborah", "debra", "deb", "debbie"],
  ["edward", "ed", "eddie", "ted", "ned"],
  ["elizabeth", "liz", "lizzie", "beth", "betsy", "eliza", "betty", "libby"],
  ["gregory", "greg"],
  ["james", "jim", "jimmy", "jamie"],
  ["jennifer", "jen", "jenny", "jenn"],
  ["jessica", "jess", "jessie"],
  ["jonathan", "jon", "jonny"],
  ["john", "jack", "johnny"],
  ["joseph", "joe", "joey"],
  ["joshua", "josh"],
  ["katherine", "katharine", "kate", "katie", "kat", "kathy"],
  ["margaret", "maggie", "meg", "peggy", "marge"],
  ["matthew", "matt"],
  ["michael", "mike", "mikey", "mick"],
  ["nathan", "nathaniel", "nate", "nat"],
  ["nicholas", "nick", "nicky"],
  ["patricia", "pat", "patty", "trish", "tricia"],
  ["patrick", "pat", "paddy"],
  ["rebecca", "becca", "becky"],
  ["richard", "rich", "rick", "ricky", "dick"],
  ["robert", "rob", "robbie", "bob", "bobby", "bert"],
  ["samantha", "sam", "sammy"],
  ["samuel", "sam", "sammy"],
  ["stephen", "steven", "steve", "stevie"],
  ["susan", "sue", "susie", "suzy"],
  ["thomas", "tom", "tommy"],
  ["timothy", "tim", "timmy"],
  ["victoria", "vicky", "tori"],
  ["william", "will", "bill", "billy", "liam", "willy"],
  ["zachary", "zach", "zack"],
];

// Strips only punctuation, never letters: a name in Cyrillic, CJK, Arabic or
// any other script must keep its own tokens, or unrelated names collapse to
// the same empty string and "match".
function nameTokens(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.,!?;:()[\]{}"“”‘’_/\\&+*#@|<>~`^=]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// A short form matches its full name ("Bill" ~ "William"), never another short
// form of it: relatives sharing a surname are often a William "Bill" and a
// William "Liam".
function sameFirstName(a: string, b: string): boolean {
  if (a === b) return true;
  return NICKNAME_GROUPS.some(
    ([full, ...shortForms]) =>
      (a === full && shortForms.includes(b)) ||
      (b === full && shortForms.includes(a))
  );
}

// A missing last name is compatible with any; a lone initial ("Ryan P.")
// matches the surname it abbreviates.
function compatibleLastNames(a: string | null, b: string | null): boolean {
  if (!a || !b) return true;
  if (a === b) return true;
  if (a.length === 1) return b.startsWith(a);
  if (b.length === 1) return a.startsWith(b);
  return false;
}

// 0 = different people; 3 = same normalized name; 2 = first names match and
// both sides give a compatible surname; 1 = first names match, a surname is
// missing on one side.
function matchScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  if (a.join(" ") === b.join(" ")) return 3;
  if (!sameFirstName(a[0], b[0])) return 0;
  const lastA = a.length > 1 ? a[a.length - 1] : null;
  const lastB = b.length > 1 ? b[b.length - 1] : null;
  if (!compatibleLastNames(lastA, lastB)) return 0;
  return lastA && lastB ? 2 : 1;
}

export function isLikelySamePerson(a: string, b: string): boolean {
  return matchScore(nameTokens(a), nameTokens(b)) > 0;
}

/**
 * The existing recipient an incoming name most likely refers to, or null.
 * The strongest match wins, so "Ryan P." offers "Ryan Palmer" over a
 * surname-less "Ryan". People in excludeIds (already confirmed as someone
 * else) are passed over so a weaker dismissed match can't mask a stronger one.
 */
export function findExistingRecipient<T extends { id: string; name: string }>(
  name: string | undefined | null,
  recipients: readonly T[],
  excludeIds: readonly string[] = []
): T | null {
  if (!name) return null;
  const incoming = nameTokens(name);
  let best: T | null = null;
  let bestScore = 0;
  for (const recipient of recipients) {
    if (excludeIds.includes(recipient.id)) continue;
    const score = matchScore(incoming, nameTokens(recipient.name));
    if (score > bestScore) {
      best = recipient;
      bestScore = score;
    }
  }
  return best;
}
