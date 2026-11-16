-- A stated maximum is either a spending limit the giver can't exceed or the
-- amount they typically spend. Only the conversation can tell them apart, so
-- the default is FALSE: a maximum is a hard limit unless the giver framed it as
-- a typical or approximate amount ("around $150", "I usually spend about $50").
-- Budgets saved before this column existed, and any typed into a form, stay
-- hard. Against a hard limit, gift generation accepts an estimate the store
-- page couldn't confirm only when it sits well under the limit; against
-- guidance it accepts any estimate.
ALTER TABLE recipients
  ADD COLUMN IF NOT EXISTS gift_budget_is_guidance BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN recipients.gift_budget_is_guidance IS
  'True only when the giver described the budget as a typical or approximate amount. False (default) means gift_budget_max is a hard spending limit.';
