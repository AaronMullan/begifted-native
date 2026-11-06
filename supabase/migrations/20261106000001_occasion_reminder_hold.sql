-- A follow-up reminder always points at a set generated for it. When that
-- generation fails, the reminder is held and the daily cron retries it.
-- reminder_held_at: when the pending reminder started waiting on a new set;
-- NULL once it has been sent or is no longer due. Read by the be-gifted cron
-- (service role only), never by the app.
ALTER TABLE public.occasions
  ADD COLUMN IF NOT EXISTS reminder_held_at timestamptz;
