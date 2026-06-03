-- Switch recipients.birthday from `date` to `text` so we can store
-- partial birthdays (month + day only) when the year is unknown.
-- Postgres serializes date → text as YYYY-MM-DD so existing rows are
-- preserved verbatim. Application-level validation (utils/birthday.ts)
-- replaces Postgres date-type checks.

ALTER TABLE recipients ALTER COLUMN birthday TYPE TEXT USING birthday::text;
