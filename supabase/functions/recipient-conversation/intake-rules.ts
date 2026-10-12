/**
 * The add-recipient required-detail rules: which details are required, in what
 * order, and what counts as enough for each. Readiness enforces them and the
 * reply prompt renders them through {{requiredFields}}, so a rule changed here
 * changes both.
 *
 * The live rules are the active `add_recipient_rules` row in
 * system_prompt_versions (JSON, edited and versioned in the Playground).
 * DEFAULT_INTAKE_RULES is only the fallback when that row is missing or
 * invalid, and must stay equal to the seeded v1 row.
 *
 * Only deterministic requirements belong here. Judgments such as whether a
 * detail genuinely distinguishes the person stay in the prompt and the model.
 *
 * Pure module — no env, no AI, no I/O — so Deno tests can import it directly.
 */

export type IntakeFieldKey =
  "identity" | "occasion" | "timing" | "price" | "age" | "texture";

export type IntakeRules = {
  /** Question order. identity is always first and always required. */
  order: IntakeFieldKey[];
  required: Record<IntakeFieldKey, boolean>;
  /**
   * Whether an approximate birthday bounded to a month or less ("second week
   * of March" → 03-08/03-14) counts as captured timing. The one-month bound is
   * fixed: persistence and display drop anything wider.
   */
  approximateBirthday: boolean;
  /** Age signals that satisfy the age field besides a stated age/life stage. */
  fullBirthdayCountsAsAge: boolean;
  birthYearCountsAsAge: boolean;
  /** Whether one follow-up may sharpen a broad texture answer. */
  textureFollowUp: boolean;
  /**
   * Assistant turns after which texture is forced complete when it is the only
   * field left — the termination guard against endless texture probing.
   */
  textureTurnCap: number;
};

export const INTAKE_FIELD_KEYS: IntakeFieldKey[] = [
  "identity",
  "occasion",
  "timing",
  "price",
  "age",
  "texture",
];

export const DEFAULT_INTAKE_RULES: IntakeRules = {
  order: ["identity", "occasion", "timing", "price", "age", "texture"],
  required: {
    identity: true,
    occasion: true,
    timing: true,
    price: true,
    age: true,
    texture: true,
  },
  approximateBirthday: true,
  fullBirthdayCountsAsAge: true,
  birthYearCountsAsAge: true,
  textureFollowUp: true,
  // Above the longest legitimate intake (identity → relationship → occasion →
  // two dated occasions → price → age → initial texture → one follow-up).
  textureTurnCap: 10,
};

/**
 * The stored form, as the Playground edits it. Array order is question order;
 * per-field options sit on the field they qualify.
 */
export function serializeIntakeRules(rules: IntakeRules): string {
  const fields = rules.order.map((field) => {
    const entry: Record<string, unknown> = {
      field,
      required: rules.required[field],
    };
    if (field === "timing") {
      entry.approximate_birthday = rules.approximateBirthday;
    } else if (field === "age") {
      entry.full_birthday_counts = rules.fullBirthdayCountsAsAge;
      entry.birth_year_counts = rules.birthYearCountsAsAge;
    } else if (field === "texture") {
      entry.follow_up = rules.textureFollowUp;
      entry.turn_cap = rules.textureTurnCap;
    }
    return entry;
  });
  return JSON.stringify({ fields }, null, 2);
}

export type ParsedIntakeRules =
  { ok: true; rules: IntakeRules } | { ok: false; errors: string[] };

const FIELD_OPTIONS: Record<IntakeFieldKey, string[]> = {
  identity: [],
  occasion: [],
  timing: ["approximate_birthday"],
  price: [],
  age: ["full_birthday_counts", "birth_year_counts"],
  texture: ["follow_up", "turn_cap"],
};

/**
 * Strict: every field listed exactly once, every option present with the right
 * type, nothing unknown. A typo must fail validation rather than silently fall
 * back to a default the editor didn't intend.
 */
export function parseIntakeRules(text: string): ParsedIntakeRules {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return {
      ok: false,
      errors: [`Not valid JSON: ${err instanceof Error ? err.message : err}`],
    };
  }
  const fields = (raw as { fields?: unknown })?.fields;
  if (!Array.isArray(fields)) {
    return { ok: false, errors: ['Expected an object with a "fields" list.'] };
  }

  const errors: string[] = [];
  const rules: IntakeRules = {
    ...DEFAULT_INTAKE_RULES,
    order: [],
    required: { ...DEFAULT_INTAKE_RULES.required },
  };
  const bool = (entry: Record<string, unknown>, key: string, label: string) => {
    if (typeof entry[key] !== "boolean") {
      errors.push(`${label}: "${key}" must be true or false.`);
      return false;
    }
    return entry[key] as boolean;
  };

  for (const [index, item] of fields.entries()) {
    const entry = item as Record<string, unknown>;
    const field = entry?.field as IntakeFieldKey;
    const label = `fields[${index}]`;
    if (!INTAKE_FIELD_KEYS.includes(field)) {
      errors.push(
        `${label}: "field" must be one of ${INTAKE_FIELD_KEYS.join(", ")}.`
      );
      continue;
    }
    if (rules.order.includes(field)) {
      errors.push(`${label}: "${field}" is listed more than once.`);
      continue;
    }
    rules.order.push(field);
    const allowed = ["field", "required", ...FIELD_OPTIONS[field]];
    for (const key of Object.keys(entry)) {
      if (!allowed.includes(key)) {
        errors.push(`${field}: unknown option "${key}".`);
      }
    }
    rules.required[field] = bool(entry, "required", field);

    if (field === "timing") {
      rules.approximateBirthday = bool(entry, "approximate_birthday", field);
    } else if (field === "age") {
      rules.fullBirthdayCountsAsAge = bool(
        entry,
        "full_birthday_counts",
        field
      );
      rules.birthYearCountsAsAge = bool(entry, "birth_year_counts", field);
    } else if (field === "texture") {
      rules.textureFollowUp = bool(entry, "follow_up", field);
      const cap = entry.turn_cap;
      if (typeof cap !== "number" || !Number.isInteger(cap) || cap < 1) {
        errors.push(`texture: "turn_cap" must be a whole number of 1 or more.`);
      } else {
        rules.textureTurnCap = cap;
      }
    }
  }

  const missing = INTAKE_FIELD_KEYS.filter((f) => !rules.order.includes(f));
  if (missing.length > 0) {
    errors.push(`Missing fields: ${missing.join(", ")}.`);
  }
  if (rules.order[0] !== "identity") {
    errors.push('"identity" must be the first field.');
  }
  if (rules.order.includes("identity") && !rules.required.identity) {
    errors.push('"identity" must be required.');
  }
  if (
    rules.order.includes("occasion") &&
    rules.order.includes("timing") &&
    rules.order.indexOf("timing") < rules.order.indexOf("occasion")
  ) {
    errors.push('"timing" must come after "occasion".');
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, rules };
}

/** Lowercase names used inside stateGuidance sentences. */
export const FIELD_SHORT_NAMES: Record<IntakeFieldKey, string> = {
  identity: "name and relationship",
  occasion: "occasion",
  timing: "dates",
  price: "price",
  age: "age",
  texture: "texture",
};

/** Required fields that come after `field` in question order. */
export function requiredFieldsAfter(
  rules: IntakeRules,
  field: IntakeFieldKey
): IntakeFieldKey[] {
  const index = rules.order.indexOf(field);
  return rules.order.slice(index + 1).filter((f) => rules.required[f]);
}

/** "a", "a or b", "a, b, or c". */
export function joinWithOr(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} or ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, or ${items[items.length - 1]}`;
}

function describeField(rules: IntakeRules, field: IntakeFieldKey): string {
  switch (field) {
    case "identity":
      return "Name and relationship: a usable name or label for the person, and the user's relationship to them.";
    case "occasion":
      return "Occasion: at least one giftable occasion.";
    case "timing":
      return `Occasion timing: a date for every occasion whose date can't be inferred. A birthday needs at least a month and day. ${
        rules.approximateBirthday
          ? 'An approximate window of a month or less ("second week of March", "late October") is enough; ask again only when timing is vaguer than that.'
          : 'An approximate window ("second week of March") is not enough; ask for the exact day.'
      } A birth year alone is not timing.`;
    case "price":
      return 'Typical gift amount: a default amount or range, or an explicit "no limit".';
    case "age": {
      const also = [
        rules.fullBirthdayCountsAsAge
          ? "a full birthday including the year"
          : null,
        rules.birthYearCountsAsAge ? "a birth year" : null,
      ].filter((s): s is string => !!s);
      return `Age or life stage: a stated age, grade, or life stage.${
        also.length > 0 ? ` ${capitalize(joinWithOr(also))} also counts.` : ""
      } Never infer it from relationship, interests, or occasion.`;
    }
    case "texture":
      return `Recipient texture: enough about the person to avoid generic ideas. ${
        rules.textureFollowUp
          ? "If the answer is broad, ask at most one follow-up that sharpens it, then move on."
          : "Do not ask a follow-up; take the first answer as enough."
      }`;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * The {{requiredFields}} block. Depends only on the rules version, never on
 * the conversation, so it can sit in the stable, cached part of the prompt.
 */
export function renderRequiredFields(rules: IntakeRules): string {
  const required = rules.order.filter((f) => rules.required[f]);
  const optional = rules.order.filter((f) => !rules.required[f]);
  const lines = [
    "Ask for the first field that is still missing, in this order. The app enforces this list: the recipient is not complete until every field below is captured.",
    "",
    ...required.map((f, i) => `${i + 1}. ${describeField(rules, f)}`),
  ];
  if (optional.length > 0) {
    lines.push(
      "",
      `Not required — do not ask for ${joinWithOr(
        optional.map((f) => FIELD_SHORT_NAMES[f])
      )}. Keep it if the user offers it.`
    );
  }
  return lines.join("\n");
}
