-- Legal acceptance paper trail (DEV-142). Two tables, no user_consents mirror of
-- OS permissions (the OS is the source of truth for permissions). We need a
-- verifiable record of which Terms/Privacy versions a user accepted, with
-- trustworthy server-stamped metadata (accepted_at + ip_address), at account
-- creation. Records are append-only: no UPDATE/DELETE policies.

-- ---------------------------------------------------------------------------
-- legal_document_versions: the catalogue of published legal documents. One row
-- per (document_type, version). content_hash pins the exact published text so
-- an acceptance can be tied to immutable content. Writable by admin/service
-- role only; readable by any authenticated user.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS legal_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL CHECK (document_type IN ('terms', 'privacy_policy')),
  version TEXT NOT NULL,
  effective_date DATE NOT NULL,
  url TEXT,
  -- Hash of the exact published document this version refers to.
  content_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_type, version)
);

-- At most one active version per document_type.
CREATE UNIQUE INDEX IF NOT EXISTS legal_document_versions_active_idx
  ON legal_document_versions (document_type)
  WHERE is_active;

ALTER TABLE legal_document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read legal document versions"
  ON legal_document_versions FOR SELECT
  TO authenticated
  USING (true);

-- Writes are admin-only. The service role bypasses RLS, so the acceptance
-- edge function and seed scripts are unaffected; these policies gate the
-- authenticated (anon-key) client.
CREATE POLICY "Admins can insert legal document versions"
  ON legal_document_versions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update legal document versions"
  ON legal_document_versions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- user_legal_acceptances: append-only record of a user accepting a specific
-- Terms + Privacy version. accepted_at and ip_address are stamped server-side
-- (DEFAULT now() + BEFORE INSERT trigger for the timestamp; the edge function
-- supplies ip_address from the request context). The client only supplies the
-- version IDs and device metadata.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_legal_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version_id UUID NOT NULL REFERENCES legal_document_versions(id),
  privacy_policy_version_id UUID NOT NULL REFERENCES legal_document_versions(id),
  -- Server clock at insert. The trigger below forces this to now() so a client
  -- payload can never backdate or forge it.
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acceptance_method TEXT,
  app_version TEXT,
  platform TEXT,
  os_version TEXT,
  device_model TEXT,
  locale TEXT,
  -- Captured server-side from the request, never client-reported.
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_legal_acceptances_user_id_idx
  ON user_legal_acceptances (user_id);
CREATE INDEX IF NOT EXISTS user_legal_acceptances_accepted_at_idx
  ON user_legal_acceptances (accepted_at);

-- Force accepted_at to the server clock on every insert, regardless of any
-- value the client (or a direct authenticated insert) tries to supply. This is
-- what makes the timestamp trustworthy even on the RLS insert path below.
CREATE OR REPLACE FUNCTION public.stamp_legal_acceptance_accepted_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.accepted_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stamp_accepted_at ON user_legal_acceptances;
CREATE TRIGGER stamp_accepted_at
  BEFORE INSERT ON user_legal_acceptances
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_legal_acceptance_accepted_at();

ALTER TABLE user_legal_acceptances ENABLE ROW LEVEL SECURITY;

-- Append-only: users may insert/read only their own acceptances. The canonical
-- path is the record-legal-acceptance edge function (service role), which also
-- stamps ip_address; the INSERT policy is the baseline for any direct client
-- insert. No UPDATE/DELETE policies -> the table is append-only for users.
CREATE POLICY "Users can insert own legal acceptances"
  ON user_legal_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own legal acceptances"
  ON user_legal_acceptances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all legal acceptances"
  ON user_legal_acceptances FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- Placeholder versions so the table + endpoint can be exercised before the
-- legal-docs ticket lands real content/hashes. Replace content_hash/url/version
-- with the real published values when available (see DEV-142 dependencies).
-- ---------------------------------------------------------------------------
INSERT INTO legal_document_versions (document_type, version, effective_date, url, content_hash, is_active)
VALUES
  ('terms', '0.0.0-placeholder', CURRENT_DATE, NULL, 'PLACEHOLDER', true),
  ('privacy_policy', '0.0.0-placeholder', CURRENT_DATE, NULL, 'PLACEHOLDER', true)
ON CONFLICT (document_type, version) DO NOTHING;
