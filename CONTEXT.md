# BeGifted

Gift-planning app: users describe the people they give to, and the app generates and maintains gift suggestions for their occasions.

## Language

**Recipient**:
A person the user buys gifts for.

**Occasion**:
A dated gifting event belonging to a Recipient (birthday, anniversary, holiday).

**Generation Run**:
One execution of the gift-suggestion pipeline for a Recipient, recorded in `gift_generation_runs` with its funnel counts and outcome.
_Avoid_: Search — a "search" is a web-search tool call _inside_ a run (`search_count`), not the run itself.

**Active User**:
A user with at least one row in `product_events`, `outbound_clicks`, or `gift_feedback` in the trailing 7 days.

**Gift Chosen**:
A user marking a suggestion as the gift they went with (`gift_feedback.action = 'chose'`). The primary traction signal.

**Traction**:
The admin dashboard answering "is the product being used?" — signups, activation, active users, gifts chosen, clicks, generation health, upcoming occasions, and trial/subscription counts.
_Avoid_: Dashboard (names the furniture, not the question).
