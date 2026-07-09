---
name: drive-sim
description: Drive the running begifted app on the iOS simulator with idb — deep-link to any route, tap/type into UI, and screenshot to verify real flows on-device (not just typecheck/tests). Use to exercise a screen or flow end-to-end after a change (e.g. the add-recipient flow), or whenever asked to "run the app" / "screenshot the app" / confirm something works in the real app.
---

# Drive the begifted app on the iOS simulator

Launch and interact with the real app on a booted iOS simulator: deep-link to a
route, tap buttons, type into fields, and screenshot the result. This is the
verified path for on-device flow testing — it catches render/interaction
regressions that `npm run typecheck` and Jest can't (e.g. setState-during-render
loops, form fields resetting while typing).

The app is a native RN app, so `xcrun simctl` alone can't tap or type — it needs
**idb** (Facebook's iOS Debug Bridge). One-time setup below; after that, the
drive loop is deep-link → describe → tap/type → screenshot → Read.

## One-time setup (not out-of-the-box)

`idb` has two parts: the native `idb_companion` (Homebrew) and the Python `idb`
CLI (`fb-idb`). **`fb-idb` is broken on Python 3.13+** (it calls
`asyncio.get_event_loop()`, removed in 3.12+), so it must run under Python 3.11
in an isolated venv.

```bash
brew install facebook/fb/idb-companion   # provides /opt/homebrew/bin/idb_companion
brew install python@3.11
/opt/homebrew/opt/python@3.11/bin/python3.11 -m venv /tmp/idbenv
/tmp/idbenv/bin/pip install fb-idb        # gives /tmp/idbenv/bin/idb
```

Then connect to the booted sim (do this once per session):

```bash
export PATH="/opt/homebrew/bin:$PATH"   # so idb finds idb_companion
UDID=$(xcrun simctl list devices booted | grep -oE '[0-9A-F-]{36}' | head -1)
/tmp/idbenv/bin/idb connect $UDID
```

## Preconditions

- **Metro must be running** (`npm start`) — it serves the current working tree,
  so whatever branch is checked out is what you're testing.
- The app (`com.begifted.app`) must be **installed and logged in** on the sim.
  If it isn't installed, run `npm run ios` first. If it isn't logged in, the
  flows that need auth will redirect to `/`.
- A booted simulator (`xcrun simctl list devices booted`).

## Drive loop

Set these once per shell (zsh does **not** word-split unquoted vars, so pass
coordinates as explicit separate args, never a single `"x y"` string):

```bash
IDB=/tmp/idbenv/bin/idb
U=54277495-...   # the booted UDID from setup
```

**1. Deep-link to a route** (scheme is `begifted`; drop the `(tabs)` group from
the path):

```bash
xcrun simctl openurl booted "begifted://contacts/add"        # add-recipient flow
xcrun simctl openurl booted "begifted://settings/gifting"    # a settings screen
sleep 3
```

**2. Screenshot and look at it** — a red box or blank frame is a failure:

```bash
xcrun simctl io booted screenshot /tmp/s.png
```

Then `Read /tmp/s.png`. The screen renders in a **420×912 point** space (idb
coords), while the PNG is 1260×2736 device px — don't mix them.

**3. Find interactive elements** (frames are in idb's 420×912 point space):

```bash
$IDB ui describe-all --udid $U | /tmp/idbenv/bin/python3 -c '
import json,sys
for el in json.load(sys.stdin):
    t=el.get("type"); lbl=el.get("AXLabel"); val=el.get("AXValue"); f=el["frame"]
    if t in ("TextField","TextArea","Button"):
        print(f"{t:9} c=({f[\"x\"]+f[\"width\"]/2:.0f},{f[\"y\"]+f[\"height\"]/2:.0f}) label={lbl!r} val={val!r}")
'
```

**4. Tap and type** (coords are the element centers from step 3):

```bash
$IDB ui tap  --udid $U 186 778
$IDB ui text --udid $U "My sister Jane Doe, her birthday is March 15 1990. She loves hiking."
```

Then screenshot again. Loop until the flow is exercised to a point a user would
see something meaningful.

## Reaching deeper add-recipient screens

The flow steps (`DataReviewView`, `OccasionsSelectionView`, `ManualDataEntry`)
are gated behind driving the AI conversation, not deep-linkable directly:

1. Deep-link `begifted://contacts/add` → `ConversationView`.
2. Tap the input, `ui text` a full recipient description, tap the send button
   (label `\U000f048a`). The `recipient-conversation` edge function runs — wait
   ~8-10s.
3. On success a **"Let's Move to the Next Step"** button appears → tap it to
   reach `DataReviewView`, then **Continue** → `OccasionsSelectionView`.
4. `ManualDataEntry` only appears when extraction fails/incomplete.

Directly deep-linkable screens (no conversation needed):
`settings/gifting`, `settings/profile`, `settings/notifications`, `calendar`,
`dashboard`, `notifications`, `contacts/<id>`.

## Known gotcha — RN VirtualView red box (DEV-258)

Tapping into a `TextInput` inside a `ScrollView` (e.g. the Review screen) can
escalate a **pre-existing** react-native LogBox warning to a full red box:

```
react-native/src/private/components/virtualview/VirtualViewExperimentalNativeComponent.js:
Unable to determine event arguments for "onModeChange"
```

This is an RN 0.86 New Architecture experimental-component bug (tracked in
DEV-258), **not** app code — it's present from a cold launch. It blocks
interactive testing of scrollable forms. Dismiss with `$IDB ui tap --udid $U 52
843` (the "Dismiss" button), or terminate + relaunch:
`xcrun simctl terminate booted com.begifted.app && xcrun simctl launch booted
com.begifted.app`. Non-scroll screens are unaffected. It does **not** occur in
release/production builds (LogBox is dev-only).
