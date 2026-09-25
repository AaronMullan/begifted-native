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

function nameTokens(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function sameFirstName(a: string, b: string): boolean {
  if (a === b) return true;
  return NICKNAME_GROUPS.some(
    (group) => group.includes(a) && group.includes(b)
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

export function isLikelySamePerson(a: string, b: string): boolean {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.length === 0 || tb.length === 0) return false;
  if (ta.join(" ") === tb.join(" ")) return true;
  const lastA = ta.length > 1 ? ta[ta.length - 1] : null;
  const lastB = tb.length > 1 ? tb[tb.length - 1] : null;
  return sameFirstName(ta[0], tb[0]) && compatibleLastNames(lastA, lastB);
}

/**
 * The existing recipient an incoming name most likely refers to, or null.
 * An exact (normalized) name wins over a looser nickname/partial match.
 */
export function findExistingRecipient<T extends { id: string; name: string }>(
  name: string | undefined | null,
  recipients: readonly T[]
): T | null {
  if (!name?.trim()) return null;
  const incoming = nameTokens(name).join(" ");
  const exact = recipients.find(
    (r) => nameTokens(r.name).join(" ") === incoming
  );
  if (exact) return exact;
  return recipients.find((r) => isLikelySamePerson(name, r.name)) ?? null;
}
