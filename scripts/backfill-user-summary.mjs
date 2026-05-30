#!/usr/bin/env node
// Backfills user_preferences.user_summary for rows that have user_description
// but no user_summary yet (i.e. users who onboarded before the extraction
// was wired into the identity step).
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/backfill-user-summary.mjs [--dry-run]

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes("--dry-run");

if (!url || !serviceKey) {
  console.error(
    "Missing env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: rows, error } = await supabase
  .from("user_preferences")
  .select("user_id, user_description")
  .not("user_description", "is", null)
  .is("user_summary", null);

if (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

console.log(
  `Found ${rows.length} user(s) to backfill${dryRun ? " (dry run)" : ""}.`
);

let succeeded = 0;
let skipped = 0;
let failed = 0;

for (const row of rows) {
  const text = row.user_description?.trim();
  if (!text) {
    console.log(`- ${row.user_id}: empty description, skipping`);
    skipped++;
    continue;
  }

  if (dryRun) {
    console.log(`- ${row.user_id}: would extract (${text.length} chars)`);
    skipped++;
    continue;
  }

  const { data, error: fnError } = await supabase.functions.invoke(
    "extract-user-preferences",
    { body: { text } }
  );

  if (fnError) {
    console.error(`- ${row.user_id}: extract failed: ${fnError.message}`);
    failed++;
    continue;
  }

  const userSummary = data?.user_summary;
  if (!userSummary) {
    console.error(`- ${row.user_id}: no user_summary returned`);
    failed++;
    continue;
  }

  const { error: updateError } = await supabase
    .from("user_preferences")
    .update({
      user_summary: userSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", row.user_id);

  if (updateError) {
    console.error(`- ${row.user_id}: update failed: ${updateError.message}`);
    failed++;
    continue;
  }

  console.log(
    `- ${row.user_id}: ok (confidence: ${userSummary.confidence ?? "?"})`
  );
  succeeded++;
}

console.log(
  `\nDone. succeeded=${succeeded} skipped=${skipped} failed=${failed}`
);
