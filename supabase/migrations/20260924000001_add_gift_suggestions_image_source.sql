-- Which enrichment stage supplied image_url, so the share of cards relying on
-- image search (the least reliable source) can be measured. Written by the
-- be-gifted enrichment pipeline: 'model', 'page', 'search',
-- 'search_unverified', 'none'. No CHECK constraint: new sources get added in
-- the backend, and an unknown value must not fail the suggestion insert.
-- NULL means the row predates this column or was never enriched.
ALTER TABLE gift_suggestions
  ADD COLUMN IF NOT EXISTS image_source TEXT;

COMMENT ON COLUMN gift_suggestions.image_source IS
  'Enrichment stage that supplied image_url: model | page | search | search_unverified | none. NULL = not recorded.';
