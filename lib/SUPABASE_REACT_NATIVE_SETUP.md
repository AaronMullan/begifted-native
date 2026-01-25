# Supabase React Native Setup - Issue Resolution

## Problem

Data fetching errors occurred on initial app load with Supabase. The errors manifested as:
- "Network request failed" errors from `whatwg-fetch` polyfill
- "500: Could not read body into byte slice" errors in Supabase console
- "unexpected EOF" errors during token refresh
- Requests not reaching Supabase server (no logs in Supabase console)

## Root Cause

The `react-native-url-polyfill` package was not being imported correctly. The initial implementation used:
```typescript
try {
  require("react-native-url-polyfill/auto");
} catch (e) {
  console.warn("react-native-url-polyfill not installed...");
}
```

This approach failed because:
1. The polyfill must be imported **before** Supabase client creation
2. Using `require()` in a try/catch doesn't guarantee execution timing
3. Without the polyfill, Supabase falls back to `whatwg-fetch` which doesn't work in React Native

## Solution

Follow the official Supabase React Native documentation pattern:

1. **Import the URL polyfill at the top of the file** (before any other imports that might use it):
   ```typescript
   import "react-native-url-polyfill/auto";
   ```

2. **Use the official Supabase React Native setup**:
   ```typescript
   import { AppState, Platform } from "react-native";
   import "react-native-url-polyfill/auto";
   import AsyncStorage from "@react-native-async-storage/async-storage";
   import { createClient, processLock } from "@supabase/supabase-js";

   export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
     auth: {
       ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
       autoRefreshToken: true,
       persistSession: true,
       detectSessionInUrl: false,
       lock: processLock,
     },
   });

   // Auto-refresh management
   if (Platform.OS !== "web") {
     AppState.addEventListener("change", (state) => {
       if (state === "active") {
         supabase.auth.startAutoRefresh();
       } else {
         supabase.auth.stopAutoRefresh();
       }
     });
   }
   ```

## Key Requirements

1. **`react-native-url-polyfill` must be installed**: 
   ```bash
   npm install react-native-url-polyfill
   ```

2. **Import must be a standard `import` statement** (not `require()` in try/catch)

3. **Import must come before Supabase client creation**

4. **Do NOT override the global fetch** - let Supabase use React Native's native fetch after the polyfill is applied

## Verification

After applying the fix:
- ✅ All Supabase queries return 200 OK
- ✅ Data loads correctly on initial app load
- ✅ No "Network request failed" errors
- ✅ Token refresh works correctly
- ✅ Requests appear in Supabase console logs

## References

- [Official Supabase React Native Documentation](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [react-native-url-polyfill on npm](https://www.npmjs.com/package/react-native-url-polyfill)

## Date Resolved

January 24, 2026
