// Preflight for OTA publishes. `eas update` exports the JS bundle on the local
// machine, inlining EXPO_PUBLIC_* values from the shell or .env files at that
// moment — EAS-hosted "secret" env vars are not readable here. If the Sentry
// DSN is absent, Sentry.init inlines undefined and the shipped bundle runs
// with the SDK silently disabled: no crashes, and feedback-widget submissions
// are discarded on-device while still showing the user a success message.
// Fail loudly before the export can start.
import { existsSync, readFileSync } from "node:fs";

const NAME = "EXPO_PUBLIC_SENTRY_DSN";

const inEnvFile = [".env", ".env.local"].some(
  (file) =>
    existsSync(file) &&
    new RegExp(`^${NAME}=.+$`, "m").test(readFileSync(file, "utf8"))
);

if (!process.env[NAME] && !inEnvFile) {
  console.error(
    `${NAME} is not set in the shell or in .env/.env.local.\n` +
      "An OTA published now would ship with Sentry disabled — no crash " +
      "reports and no user feedback from anyone on the update. Aborting.\n" +
      "Add the DSN (Sentry → Settings → Projects → react-native → Client Keys) " +
      "to .env.local, then re-run. If the value just changed, publish once " +
      "with --clear-cache so Metro does not re-inline the stale value."
  );
  process.exit(1);
}

console.log(`${NAME} present — the exported bundle will carry the Sentry DSN.`);
