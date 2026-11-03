-- The card shows a price only when a product-page read confirmed it recently.
-- price_verified_at: a page read last confirmed `price`.
-- price_checked_at: a page check last ran, whatever it found. A check newer
-- than the verification means the page could no longer be read, so the
-- confirmed price may have changed.
-- Both start NULL: no existing row records whether its price was ever read.
ALTER TABLE public.gift_suggestions
  ADD COLUMN IF NOT EXISTS price_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS price_checked_at timestamptz;
