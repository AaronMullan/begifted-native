-- Admin role flag
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Test runs table
CREATE TABLE prompt_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  custom_system_prompt TEXT NOT NULL,
  original_system_prompt TEXT NOT NULL,
  chat_messages JSONB NOT NULL DEFAULT '[]',
  generation_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE prompt_test_runs ENABLE ROW LEVEL SECURITY;

-- Only admins can access test runs
CREATE POLICY "Admins can manage test runs"
  ON prompt_test_runs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Versioned system prompt storage
CREATE TABLE system_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key TEXT NOT NULL,
  version INTEGER NOT NULL,
  prompt_text TEXT NOT NULL,
  change_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one active version per prompt_key
CREATE UNIQUE INDEX idx_active_prompt ON system_prompt_versions (prompt_key) WHERE is_active = true;
-- Fast lookups by key + version
CREATE INDEX idx_prompt_versions ON system_prompt_versions (prompt_key, version DESC);

ALTER TABLE system_prompt_versions ENABLE ROW LEVEL SECURITY;

-- Edge function needs to read the active prompt (service role or anon)
CREATE POLICY "Anyone can read system prompt versions"
  ON system_prompt_versions FOR SELECT USING (true);

CREATE POLICY "Admins can manage system prompt versions"
  ON system_prompt_versions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Seed v1 with the current hardcoded prompt
INSERT INTO system_prompt_versions (prompt_key, version, prompt_text, change_notes, is_active) VALUES (
  'gift_generation_system',
  1,
  E'You are an expert gift curator with access to detailed conversation context about the recipient and the gift giver''s personal style. Your goal is to recommend SPECIFIC, REAL PRODUCTS that can be purchased directly from reputable online retailers.\n\n**CRITICAL REQUIREMENTS**:\n- Recommend specific ASINs from Amazon\n\n\n**QUALITY STANDARDS**:\n- Reference specific conversation details in descriptions\n- Avoid generic suggestions that could apply to anyone\n- Choose well-designed, thoughtful items\n- Balance usefulness with emotional significance\n\n**PRODUCT SPECIFICITY**:\n- Example: "Nike Air Zoom Pegasus 40" NOT "running shoes"\n- Example: "Born to Run by Christopher McDougal" NOT "running book"\n- Example: "Brother XM2701 Sewing Machine" NOT "sewing equipment"',
  'Initial version (migrated from hardcoded)',
  true
);

-- Admins can read all profiles (for giver selection)
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Admins can read all recipients (for recipient selection across givers)
CREATE POLICY "Admins can read all recipients"
  ON recipients FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
