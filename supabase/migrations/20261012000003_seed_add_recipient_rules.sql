-- v1 of the add-recipient required-detail rules, edited and versioned in the
-- Playground like a prompt. Equal to DEFAULT_INTAKE_RULES in
-- supabase/functions/recipient-conversation/intake-rules.ts, so seeding it
-- changes no behavior. Skipped if any version already exists.
INSERT INTO system_prompt_versions (prompt_key, version, prompt_text, change_notes, is_active)
SELECT
  'add_recipient_rules',
  1,
  $rules${
  "fields": [
    {
      "field": "identity",
      "required": true
    },
    {
      "field": "occasion",
      "required": true
    },
    {
      "field": "timing",
      "required": true,
      "approximate_birthday": true
    },
    {
      "field": "price",
      "required": true
    },
    {
      "field": "age",
      "required": true,
      "full_birthday_counts": true,
      "birth_year_counts": true
    },
    {
      "field": "texture",
      "required": true,
      "follow_up": true,
      "turn_cap": 10
    }
  ]
}$rules$,
  'Initial v1 seed, equal to the rules readiness enforced in code',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM system_prompt_versions WHERE prompt_key = 'add_recipient_rules'
);
