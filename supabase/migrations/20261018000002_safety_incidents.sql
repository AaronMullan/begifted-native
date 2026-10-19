-- Incident records for the child-safety procedure. A row never holds what the
-- user typed: only who, when, which categories and what was done.
--
-- user_id deliberately has no foreign key: the record has to outlive the
-- account it describes, and a cascade from auth.users would erase it when
-- the account is deleted.
--
-- No client role can touch these tables, admins included. The service role
-- can insert (the moderation gate writes rows) but cannot select or update, so
-- every read goes through read_safety_incidents() and every change to the
-- manual record through update_safety_incident(), both of which log who did
-- it. The postgres role (SQL editor, table editor) still reads and writes
-- directly and is not logged; that is the database owner, not an application
-- path.
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

CREATE TABLE IF NOT EXISTS public.safety_incident_access (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incident_id uuid NOT NULL,
  access text NOT NULL CHECK (access IN ('read', 'update')),
  accessed_by text NOT NULL,
  accessed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_incident_access ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.safety_incidents FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.safety_incident_access FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.safety_incident_access_id_seq FROM PUBLIC, anon, authenticated, service_role;
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

  INSERT INTO public.safety_incident_access (incident_id, access, accessed_by)
  SELECT i.id, 'read', p_read_by
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

-- Updates the manual incident record (procedure section 3). A null argument
-- leaves that field as it is. Logs the change as an 'update' access.
CREATE OR REPLACE FUNCTION public.update_safety_incident(
  p_incident_id uuid,
  p_updated_by text,
  p_discovered_by text DEFAULT NULL,
  p_object_ids text[] DEFAULT NULL,
  p_restriction_status text DEFAULT NULL,
  p_counsel_contacted_at timestamptz DEFAULT NULL,
  p_report_confirmation_number text DEFAULT NULL,
  p_next_review_date date DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF coalesce(btrim(p_updated_by), '') = '' THEN
    RAISE EXCEPTION 'updated_by is required';
  END IF;

  UPDATE public.safety_incidents SET
    discovered_by = coalesce(p_discovered_by, discovered_by),
    object_ids = coalesce(p_object_ids, object_ids),
    restriction_status = coalesce(p_restriction_status, restriction_status),
    counsel_contacted_at = coalesce(p_counsel_contacted_at, counsel_contacted_at),
    report_confirmation_number = coalesce(p_report_confirmation_number, report_confirmation_number),
    next_review_date = coalesce(p_next_review_date, next_review_date)
  WHERE id = p_incident_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no safety incident %', p_incident_id;
  END IF;

  INSERT INTO public.safety_incident_access (incident_id, access, accessed_by)
  VALUES (p_incident_id, 'update', p_updated_by);
END;
$$;

REVOKE ALL ON FUNCTION public.update_safety_incident(uuid, text, text, text[], text, timestamptz, text, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_safety_incident(uuid, text, text, text[], text, timestamptz, text, date) TO service_role;
