-- Account Info gains a Birthday field (DEV-274). Text, not date, to match
-- recipients.birthday: partial dates ("--MM-DD") are representable and the
-- app owns validation via utils/birthday.ts.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthday text;
