-- The Traction dashboard aggregates gift_feedback across users (action
-- breakdown, gifts chosen, active-user union). Every other table it reads
-- already carries an admin read-all policy; without this one, an admin's
-- query silently returns only their own rows — no error, just wrong numbers.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'gift_feedback'
      AND policyname = 'Admins can read all gift feedback'
  ) THEN
    CREATE POLICY "Admins can read all gift feedback"
      ON gift_feedback FOR SELECT
      TO authenticated
      USING ((SELECT is_admin()));
  END IF;
END $$;
