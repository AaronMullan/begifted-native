---
name: design-parity
description: Implement (or audit) a screen against a Figma frame with a real visual-diff loop — extract a measured spec, download icon SVGs for their true colors, render the frame, build to tokens, then screenshot the running app and compare. Use for any UI work driven by a Figma node, or to check an existing screen against its design.
---

# Design Parity

Close the gap between a Figma frame and the running app. The failure mode this prevents: building from the Figma MCP's **text tree alone**, which is lossy for exactly the things that drift — icon color and fill variant (they live inside the SVG, the node shows `fills: []`), image alignment, and fine spacing. The text tree never gets _seen_, so pixel drift survives typecheck and lint.

Usage: `/design-parity <figma-node-url-or-id> <app-route>` (e.g. a Figma `node-id` + `app/gifts/[id].tsx`). If either is missing, ask. To audit an existing screen instead of building, say so — skip Step 5.

## The two non-negotiable steps

Most drift dies if you do both: **(A) download every icon/vector SVG** (Step 3) and **(B) screenshot the running app and compare it to the rendered frame** (Steps 6–7). Don't skip them because the tree "looks complete."

## Steps

1. **Fetch the frame.** `mcp__figma__get_figma_data` with the file key + node id. The canonical file is `SUQTk93YAXlLo7NxkXC7Br` ("BeGifted pages_FINAL_for-dev"); frames are **402pt** wide so Figma points map 1:1 to RN points.

2. **Build a measured spec — before writing code.** Make a table: every element → text / font+weight+size (Figma `textStyle`) / fill / absolute x,y,w,h → the **token** it maps to (`Colors.brand.*`, `Typography.*`, `Spacing.*`, `Radii.*`) and the **derived layout** (gutter = card x; inner padding = text x − card x; gaps = y-deltas between elements). Flag any value with no matching token. Express offsets relative to **one gutter** — never hardcode a magic margin. Summarize intent back and confirm (per CLAUDE.md → _Implementing from Designs_) before coding.

3. **Download every icon / vector node as SVG** with `mcp__figma__download_figma_images` into a scratch dir (e.g. `.design-audit/`, git-ignored), then `cat` them. The node tree does **not** carry icon color — read the `fill` from the SVG path. Note whether the glyph is **outlined** (a hollow ring sub-path) or **filled** (solid disc) — Material **Symbols** export filenames encode this as `FILL0` (outlined) / `FILL1` (filled). `MaterialIcons` from `@expo/vector-icons` is filled-only; if the design is outlined, either use a `MaterialCommunityIcons` `*-outline` glyph or inline the SVG path in a small component (precedent: `components/BrandMark.tsx`, `components/ExpandCircleIcon.tsx`).

4. **Render the frame to PNG** (`download_figma_images` on the frame node, `pngScale: 2`) into the scratch dir. This is ground truth for the visual diff. `Read` it so you can see it.

5. **Implement to tokens.** Build with the spec from Step 2. Reuse existing components where behavior matches — but **reconcile their geometry** (padding, gap, height, colors) to _this_ frame; reused components carry their own old values and are a top source of drift. Full-bleed = `-Spacing.screenGutter`, not a guessed offset. The PostToolUse hook runs prettier + `tsc` on every edit; reach a typecheck-clean end state.

6. **Boot the app and screenshot the _whole_ screen.** Use the `run` skill (or `npm run ios`) to launch the simulator, navigate to `<app-route>` (deep link or tap through), then:

   ```bash
   xcrun simctl io booted screenshot .design-audit/app-<screen>.png
   ```

   Capture status bar → bottom nav, not just the component you changed — the worst drift is often vertical placement (a title pushed too far down), which is invisible if you only look at the component in isolation. If you can't boot a sim, ask the user to paste a screenshot; the loop works the same.

7. **Compare — element by element.** `Read` both the Figma PNG (Step 4) and the app screenshot (Step 6) and check each row of the spec table: **vertical placement from the top** (distance of the first element from the screen top), left-edge alignment, colors (esp. icons), vertical rhythm, icon fill variant, image alignment. Scales differ (frame 2× vs device 3×), so compare _visually_, not by pixel-diff. When something is misplaced, fix it where it actually lives — that is often the **host screen or layout** (`paddingTop`, safe-area insets, a `HEADER_HEIGHT` added on top of an already in-flow header), not the leaf component. List every mismatch, fix, and re-screenshot. Loop until they match. **Do not claim parity from the code or the text tree — only from the screenshot.**

8. **Verify & clean up.** `npm run typecheck && npm run lint` (0 errors; pre-existing warnings OK). Remove the `.design-audit/` scratch files from the commit. Then follow the normal git workflow (feature branch, PR) — see CLAUDE.md.

## Notes

- Icon color invisible in the tree is the single most common miss — Step 3 is what surfaces it.
- "Centered image", "even 12px gap", "−16 bleed" are plausible defaults that contradict the coordinates. Only Step 7 catches them.
- **Vertical placement lives in the host, not the component.** A title sitting too low usually means the screen's `paddingTop` double-counts a header that is already an in-flow sibling (e.g. `paddingTop: HEADER_HEIGHT` when the root `<Header>` isn't absolute). Check what a working sibling screen uses before copying a top offset.
- Keep `.design-audit/` in `.gitignore` so scratch renders never ride along in a PR.
