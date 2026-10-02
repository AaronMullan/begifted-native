-- "No limit" is an answer, distinct from a budget nobody gave: both leave
-- gift_budget_max NULL, so the answer needs its own column. True means no hard
-- ceiling — premium options are allowed when the fit justifies them. It is not
-- a floor and must never be read as "spend more"; gift_budget_min still holds
-- any stated minimum. A stated maximum and this flag are mutually exclusive.
ALTER TABLE recipients
  ADD COLUMN IF NOT EXISTS gift_budget_no_ceiling BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN recipients.gift_budget_no_ceiling IS
  'User said there is no upper limit ("sky''s the limit"). No hard ceiling, not a floor, and no bias toward higher prices. Never true alongside gift_budget_max.';
