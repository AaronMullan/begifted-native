-- TestFlight's native feedback (screenshot annotations and crash reports filed
-- from the TestFlight app) is read by the nightly feedback sweep through the
-- App Store Connect API. That API has no resolve/ignore state, unlike Sentry,
-- so the sweep needs its own record of which submissions it has already
-- handled or it would re-triage the whole inbox every run.
--
-- One row per submission the sweep has finished with. Borderline items the
-- headless run skips for a human get no row, so they surface again next run.
-- Written by the sweep via the service role; admins can read it.
CREATE TABLE IF NOT EXISTS public.testflight_feedback_seen (
  -- App Store Connect submission id (betaFeedbackScreenshotSubmissions /
  -- betaFeedbackCrashSubmissions resource id).
  submission_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('screenshot', 'crash')),
  -- filed: a new Jira ticket was created
  -- duplicate: mapped onto an existing open ticket
  -- junk: no actionable content; never shown again
  disposition TEXT NOT NULL CHECK (disposition IN ('filed', 'duplicate', 'junk')),
  jira_key TEXT,
  submitted_at TIMESTAMPTZ,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.testflight_feedback_seen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read testflight feedback seen" ON public.testflight_feedback_seen;
CREATE POLICY "Admins can read testflight feedback seen"
  ON public.testflight_feedback_seen FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Let the feedback -> ticket mapping carry TestFlight items too, keyed by the
-- submission id, alongside the Sentry short-ids and Slack permalinks.
ALTER TABLE public.feedback_tickets DROP CONSTRAINT IF EXISTS feedback_tickets_source_check;
ALTER TABLE public.feedback_tickets
  ADD CONSTRAINT feedback_tickets_source_check
  CHECK (source IN ('sentry', 'slack', 'testflight'));
