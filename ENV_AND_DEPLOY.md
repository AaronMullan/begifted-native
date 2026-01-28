# Environment Variables for Deploy

`EXPO_PUBLIC_*` variables are inlined at **build time**. Set them in each place that runs a build.

## 1. Vercel (web)

Your web build runs `npx expo export --platform web` on Vercel. Configure env there:

**In the dashboard:** Project → **Settings** → **Environment Variables**

Add each variable (e.g. `EXPO_PUBLIC_FAQ_SHEET_ID`) and choose environments (Production, Preview, Development).

**Or via CLI** (from the project root):

```bash
cd begifted
vercel env add EXPO_PUBLIC_FAQ_SHEET_ID
# Enter the value when prompted; choose production/preview/dev.
```

Redeploy after adding or changing variables so the new build picks them up.

## 2. EAS (iOS/Android builds)

EAS uses **Secrets** for env vars during `eas build`. They are not stored in your repo.

**In the dashboard:** [expo.dev](https://expo.dev) → your project → **Secrets**

Add names like `EXPO_PUBLIC_FAQ_SHEET_ID` and their values. They are exposed as environment variables during the build.

**Or via CLI** (from the project root, with EAS logged in):

```bash
cd begifted
eas secret:create --name EXPO_PUBLIC_FAQ_SHEET_ID --value "your_sheet_id" --type string
```

List secrets: `eas secret:list`

## 3. Local development

Keep a `.env` in `begifted/` with the same `EXPO_PUBLIC_*` names. Add `.env` to `.gitignore` if it contains secrets; use `.env.example` (with no real values) in the repo so others know what to set.

## Summary

| Where        | How to store env                         |
|-------------|-------------------------------------------|
| Local       | `.env` in `begifted/`                     |
| Vercel      | Project → Settings → Environment Variables |
| EAS (native)| expo.dev → Project → Secrets or `eas secret:create` |

Only `EXPO_PUBLIC_*` vars are available in the client; they are baked in at build time, so rebuild/redeploy after changing them.
