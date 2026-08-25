-- Feedback -> Jira ticket mapping (DEV feedback dashboard). The connection
-- between a piece of user feedback and the ticket it produced is otherwise only
-- prose inside the Jira body; this table makes it queryable so the admin
-- dashboard can show each raw feedback item's ticket and live status.
--
-- Rows are written by the auto-triage skills (sentry-feedback-to-jira,
-- slack-to-jira) at the moment they file a ticket, via the service role. There
-- is no client write path: RLS grants admins SELECT only, and the service role
-- (used by the writer and the admin-feedback-tickets edge function) bypasses RLS.
CREATE TABLE IF NOT EXISTS public.feedback_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Which stream the feedback came from. Drives how source_ref is interpreted.
  source TEXT NOT NULL CHECK (source IN ('sentry', 'slack')),
  -- Stable identifier of the originating feedback: the Sentry short-id
  -- (e.g. REACT-NATIVE-7) or the Slack message permalink. Unique per source so a
  -- triage re-run upserts the same row rather than duplicating it.
  source_ref TEXT NOT NULL,
  jira_key TEXT NOT NULL,
  -- Snapshots taken at filing time so the dashboard can render the raw feedback
  -- even if the Sentry item is later deleted or the Jira summary is edited.
  summary TEXT,
  feedback_excerpt TEXT,
  reporter TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_ref)
);

CREATE INDEX IF NOT EXISTS feedback_tickets_jira_key_idx ON public.feedback_tickets(jira_key);
CREATE INDEX IF NOT EXISTS feedback_tickets_created_at_idx ON public.feedback_tickets(created_at);

ALTER TABLE public.feedback_tickets ENABLE ROW LEVEL SECURITY;

-- Admins read all; no INSERT/UPDATE/DELETE policy, so only the service role writes.
CREATE POLICY "Admins can read feedback tickets"
  ON public.feedback_tickets FOR SELECT
  TO authenticated
  USING (public.is_admin());
