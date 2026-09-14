-- Per-run outcome of the product-page link check (price/stock read from
-- Shopify JSON, JSON-LD or OpenGraph): status counts, out_of_stock and
-- price_corrected tallies, and the list of price corrections with the
-- model's original price. Written by be-gifted's gift-generation service.
ALTER TABLE public.gift_generation_runs
  ADD COLUMN IF NOT EXISTS link_check JSONB;

COMMENT ON COLUMN public.gift_generation_runs.link_check IS
  'Link-check telemetry: {readable, unreadable, blocked, dead, unknown, out_of_stock, price_corrected, price_corrections[]}';
