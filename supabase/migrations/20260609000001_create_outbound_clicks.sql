-- Outbound product-page clicks (DEV-151): append-only engagement log. Since
-- product links now open in the system/in-app browser (DEV-149) we lose any
-- in-app signal of intent, so we record the outbound tap itself. This is a
-- tap/intent signal only -- NOT a purchase-conversion metric. Kept separate
-- from gift_feedback on purpose so high-volume clicks don't pollute the CIS
-- signals that drive AI gift generation.
CREATE TABLE IF NOT EXISTS outbound_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  -- Nullable + SET NULL so the engagement row survives suggestion/occasion
  -- deletion (analytics resilience); occasion is often absent at tap time.
  gift_suggestion_id UUID REFERENCES gift_suggestions(id) ON DELETE SET NULL,
  occasion_id UUID REFERENCES occasions(id) ON DELETE SET NULL,
  product_url TEXT NOT NULL,
  retailer_domain TEXT,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outbound_clicks_recipient_id_idx ON outbound_clicks(recipient_id);
CREATE INDEX IF NOT EXISTS outbound_clicks_user_id_idx ON outbound_clicks(user_id);
CREATE INDEX IF NOT EXISTS outbound_clicks_created_at_idx ON outbound_clicks(created_at);
CREATE INDEX IF NOT EXISTS outbound_clicks_retailer_domain_idx ON outbound_clicks(retailer_domain);

ALTER TABLE outbound_clicks ENABLE ROW LEVEL SECURITY;

-- Append-only: authenticated users insert/read their own rows; admins read all
-- for engagement analysis. No UPDATE/DELETE policies.
CREATE POLICY "Users can insert own outbound clicks"
  ON outbound_clicks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own outbound clicks"
  ON outbound_clicks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all outbound clicks"
  ON outbound_clicks FOR SELECT
  TO authenticated
  USING (public.is_admin());
