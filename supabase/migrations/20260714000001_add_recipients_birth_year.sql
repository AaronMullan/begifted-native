-- Age-only intake ("he's 47") stores the derived birth year here instead of
-- smuggling it through recipients.birthday as a fake YYYY-01-01 date, which
-- downstream consumers (cron birthday sync, home ordering, calendar) read as
-- a real January 1 birthday (DEV-286).
ALTER TABLE recipients
  ADD COLUMN IF NOT EXISTS birth_year integer;
