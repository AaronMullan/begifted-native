-- Incident records for the child-safety procedure. A row never holds what the
-- user typed: only who, when, which categories and what was done.
--
-- user_id deliberately has no foreign key: the record has to outlive the
-- account it describes, and a cascade from auth.users would erase it when
-- the account is deleted.
--
-- No client role can touch these tables, admins included. The service role
-- can insert (the moderation gate writes rows) but cannot select, so every
-- read goes through read_safety_incidents(), which logs the reader. The
-- postgres role still reads directly; that is the database owner, not an
-- application path.
CREATE TABLE IF NOT EXISTS public.safety_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  source text NOT NULL CHECK (source IN ('moderation_gate', 'manual')),
  categories text[] NOT NULL DEFAULT '{}',
  kind text,
  action text,
  conversation_type text,
  request_id text,
  -- Manual incident record (procedure section 3).
  discovered_by text,
  object_ids text[] NOT NULL DEFAULT '{}',
  restriction_status text,
  counsel_contacted_at timestamptz,
  report_confirmation_number text,
  next_review_date date
);

CREATE INDEX IF NOT EXISTS safety_incidents_user_id_idx
  ON public.safety_incidents (user_id);

CREATE TABLE IF NOT EXISTS public.safety_incident_reads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incident_id uuid NOT NULL,
  read_by text NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_incident_reads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.safety_incidents FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.safety_incident_reads FROM PUBLIC, anon, authenticated, service_role;
GRANT INSERT ON public.safety_incidents TO service_role;

-- Returns one incident, or all of them when p_incident_id is null, and logs a
-- read row for each one returned.
CREATE OR REPLACE FUNCTION public.read_safety_incidents(
  p_read_by text,
  p_incident_id uuid DEFAULT NULL
)
RETURNS SETOF public.safety_incidents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF coalesce(btrim(p_read_by), '') = '' THEN
    RAISE EXCEPTION 'read_by is required';
  END IF;

  INSERT INTO public.safety_incident_reads (incident_id, read_by)
  SELECT i.id, p_read_by
  FROM public.safety_incidents i
  WHERE p_incident_id IS NULL OR i.id = p_incident_id;

  RETURN QUERY
  SELECT i.*
  FROM public.safety_incidents i
  WHERE p_incident_id IS NULL OR i.id = p_incident_id
  ORDER BY i.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.read_safety_incidents(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_safety_incidents(text, uuid) TO service_role;
