-- Verbatim cultural/religious phrase the user stated during intake, e.g.
-- "observes Hanukkah". Only ever populated from an explicit statement: the
-- extractor is barred from inferring culture, ethnicity or religion from a
-- name, language, food or interest, and nothing downstream may derive a
-- category from it — the stored text is the user's own words or nothing.
--
-- The recipient is not our user and did not consent to this, so the phrase is
-- shown back on the About page and clearable there. Any write path must treat
-- empty as "delete", not as "leave unchanged".
ALTER TABLE recipients
  ADD COLUMN IF NOT EXISTS cultural_context TEXT;

COMMENT ON COLUMN recipients.cultural_context IS
  'Verbatim user-stated cultural/religious phrase (e.g. "observes Hanukkah"). Never inferred; user-clearable from the About page.';
