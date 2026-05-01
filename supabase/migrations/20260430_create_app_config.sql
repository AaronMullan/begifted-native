-- App-level kill switch configuration (singleton table)
CREATE TABLE app_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  CONSTRAINT single_row CHECK (id = 1),
  recommendations_enabled BOOLEAN NOT NULL DEFAULT true,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  signups_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Public read so unauthenticated users (signup screen) can check signups_enabled
CREATE POLICY "anyone can read app_config" ON app_config
  FOR SELECT USING (true);

-- Only admins can update
CREATE POLICY "admins can update app_config" ON app_config
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

INSERT INTO app_config (id, recommendations_enabled, notifications_enabled, signups_enabled)
VALUES (1, true, true, true);
