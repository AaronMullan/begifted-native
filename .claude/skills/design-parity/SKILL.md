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

   Capture status bar → bottom nav, not just the component you changed — the worst drift is often vertical placement (a title pushed too far down), which is invisible if you only look at the component in isolation.

   **You can drive this yourself** — when a sim is already booted (`xcrun simctl list devices booted`) and Metro is running, your file edits fast-refresh, so capture → fix → re-capture is a fully autonomous loop; you don't need the user to paste anything. Prerequisites you can't do: booting the sim and tap-navigating to an arbitrary screen (deep links help). If no sim is available, ask the user to paste a screenshot instead — the comparison works the same.

7. **Compare — element by element.** `Read` both the Figma PNG (Step 4) and the app screenshot (Step 6) and check each row of the spec table: **vertical placement from the top** (distance of the first element from the screen top), left-edge alignment, colors (esp. icons), vertical rhythm, icon fill variant, image alignment. Scales differ (frame 2× vs device 3×), so compare _visually_, not by pixel-diff. For small details (icon fill/direction, stroke, alignment) zoom in — `magick app.png -crop WxH+X+Y +repage -resize 300% out.png` — and do the same on the frame PNG so you compare like-for-like. **View the full screenshot first, then derive crop coordinates from what you see; never reuse fixed pixel offsets across captures** — any layout shift (a re-render, a different card expanded) moves everything and a stale crop silently grabs the wrong region. When something is misplaced, fix it where it actually lives — that is often the **host screen or layout** (`paddingTop`, safe-area insets, a `HEADER_HEIGHT` added on top of an already in-flow header), not the leaf component. List every mismatch, fix, and re-screenshot. Loop until they match. **Do not claim parity from the code or the text tree — only from the screenshot.**

8. **Verify & clean up.** `npm run typecheck && npm run lint` (0 errors; pre-existing warnings OK). Remove the `.design-audit/` scratch files from the commit. Then follow the normal git workflow (feature branch, PR) — see CLAUDE.md.

## Notes

- Icon color invisible in the tree is the single most common miss — Step 3 is what surfaces it.
- "Centered image", "even 12px gap", "−16 bleed" are plausible defaults that contradict the coordinates. Only Step 7 catches them.
- **Vertical placement lives in the host, not the component.** A title sitting too low usually means the screen's `paddingTop` double-counts a header that is already an in-flow sibling (e.g. `paddingTop: HEADER_HEIGHT` when the root `<Header>` isn't absolute). Check what a working sibling screen uses before copying a top offset.
- **Icon _direction_ is its own miss-class**, separate from color/fill. A chevron pointing the wrong way (collapsed vs expanded) reads fine in the tree and at full-screen scale — only a zoomed app-vs-frame compare catches it. If you inline SVG paths, verify which glyph each named constant actually renders; a mislabeled download swaps them silently.
- **Corner controls are overlays, not stacked rows.** In Figma _every_ node is absolutely positioned, so coordinates alone don't tell you whether a card's icon is a flex row or a floating corner control. If a small control's y-range overlaps a sibling's (e.g. a chevron at the card's top-right while the image/title occupy the same band), implement it as an absolute overlay (`position: absolute` in the corner) — a stacked flex child reserves vertical space and pushes everything below it down, showing up as phantom top padding.
- **A small glyph in a padded box inflates the gaps around it.** An icon's _visible_ mark (a 3pt "..." or a chevron) is often centered in a much taller tap-target/padding box, so the real spacing to its neighbours = container padding **+** the icon box's own padding/centering. When a gap around an icon looks too big, shrink the icon box (drop its `padding`; keep `hitSlop` for the tap target) before/with adjusting the container padding — otherwise you tune the wrong number and it stays off.
- Keep `.design-audit/` in `.gitignore` so scratch renders never ride along in a PR.
