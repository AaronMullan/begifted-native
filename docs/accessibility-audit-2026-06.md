# Accessibility & legibility audit — BeGifted app (June 2026)

A bounded pass over the app against Apple's Human Interface Guidelines + WCAG AA,
focused on the five things that actually matter for legibility and App Store /
accessibility review. Prompted by a question about font sizes feeling small —
which turned out to be correct.

Scope is split into **user-facing** (matters for beta testers + App Store review)
vs **admin-only** internal tooling (low priority). Numbers are verified against
the installed code, not estimated.

## TL;DR

- **Font sizes are genuinely small** — and they come straight from the Figma
  tokens, so fixing them is a _design decision_, not just code. Worst offenders:
  bottom-nav labels at 9.6pt, gift-card text at 10–11pt, a button token at 8pt.
- **A batch of code-only fixes can ship now** — undersized tap targets,
  low-contrast gray text, two missing screen-reader labels. One self-contained PR.
- **One thing needs a device test** — how layout holds up when a user turns
  system text size all the way up.

## Needs a design decision (font scale, from Figma)

Apple's practical floor is ~11pt; below that fails for most people.

| Where                            | Size    | Note                          |
| -------------------------------- | ------- | ----------------------------- |
| `smallCta` token                 | 8pt     | Below any legible minimum     |
| Bottom-nav tab labels            | 9.6pt   | Interactive labels, too small |
| Primary gift card (×4 styles)    | 10–11pt | Core user-facing surface      |
| Moments year grid                | 10pt    |                               |
| Gift / recipient / contact cards | 11–12pt | At or just above the floor    |

**Ask:** can the Figma owner revisit the small end of the type scale? Whatever's
decided gets mirrored into the tokens.

## Can fix in code now (no design input needed)

### Tap targets under Apple's 44×44pt minimum

| Where                                                     | Effective size     | Severity |
| --------------------------------------------------------- | ------------------ | -------- |
| Header bug-report icon (every screen)                     | ~32pt, no hit-slop | High     |
| Header avatar button                                      | 36pt               | Med      |
| Settings back arrows (×5 screens)                         | 36pt               | Med      |
| FAQ back, conversation back/send/close, recipient close X | 36–40pt            | Med      |
| Overflow "…" buttons (Moments / People / Gift cards)      | 38–42pt            | Low      |

### Low-contrast text (WCAG AA needs 4.5:1 for body text)

| Text colour                                                 | On white  | On cream / beige | Verdict                      |
| ----------------------------------------------------------- | --------- | ---------------- | ---------------------------- |
| `#999` (profile note, contact-picker subtitle, file import) | 2.85:1    | 2.33 / 1.88      | Fails everywhere             |
| `#888` (calendar empty state)                               | 3.54:1    | 2.91             | Fails as body text           |
| `#666` (loading text on gradient, form subtitles on cream)  | 5.74:1 ✅ | 3.80             | Fails only on beige/gradient |

### Missing screen-reader (VoiceOver) labels

| Where                    | Control                                     | Severity |
| ------------------------ | ------------------------------------------- | -------- |
| Settings → Notifications | lead-days −/+ steppers (no label _or_ role) | High     |
| Settings → Notifications | timezone check icon                         | Low      |

Most icon buttons elsewhere (header, calendar arrows, overflow menus, back
buttons) are already labeled — this is a small gap, not a systemic one.

## Needs an on-device test

Nothing actively blocks system text scaling (no `allowFontScaling={false}`
anywhere — good). But the type tokens pin tight line-heights, so very large
accessibility text sizes may clip. Only shows up on a real device at max text
size; typecheck/lint won't catch it.

## Method / honesty notes

- Verified against installed source, not assumed. Two first-pass estimates were
  corrected: Paper's `IconButton` is `icon size + 16pt` (not auto-44pt), and
  `#666` text actually _passes_ on white (5.74:1) — it only fails on beige/gradient.
- Admin-only screens (`/admin/*` playground, prompts, etc.) have their own
  small-text and tap-target issues but are excluded here as internal tooling.
