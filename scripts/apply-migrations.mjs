#!/usr/bin/env node
// Apply pending Supabase migrations via the Management API.
//
// Why not `supabase db push`? That needs a raw Postgres password / connection
// string. This uses the Management API with SUPABASE_ACCESS_TOKEN — the same
// token the edge-functions workflow already uses — so CI needs no DB password.
//
// It reads supabase/migrations/*.sql, compares filename version prefixes against
// supabase_migrations.schema_migrations, and applies+records anything missing.
//
// Env: SUPABASE_ACCESS_TOKEN (required), SUPABASE_PROJECT_REF (required).

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
const MIG_DIR = "supabase/migrations";

if (!TOKEN) {
  console.error("::error::SUPABASE_ACCESS_TOKEN is not set.");
  process.exit(1);
}
if (!REF) {
  console.error("::error::SUPABASE_PROJECT_REF is not set.");
  process.exit(1);
}

const API = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function runSql(query) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Management API ${res.status}: ${text}`);
  }
  if (!text) return [];
  const data = JSON.parse(text);
  // The query endpoint returns the result rows; tolerate a few shapes.
  if (Array.isArray(data)) return data;
  return data.result ?? data.rows ?? [];
}

function versionOf(file) {
  return file.split("_")[0];
}

const files = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const appliedRows = await runSql(
  "select version from supabase_migrations.schema_migrations"
);
const applied = new Set(appliedRows.map((r) => String(r.version)));

// Safety guard: this project already has many applied migrations. If we somehow
// read zero, the parse is wrong — abort rather than replay every migration.
if (applied.size === 0) {
  console.error(
    "::error::Read 0 applied migrations from schema_migrations (unexpected). " +
      "Aborting to avoid replaying all migrations."
  );
  process.exit(1);
}

const pending = files.filter((f) => !applied.has(versionOf(f)));

if (pending.length === 0) {
  console.log(`No pending migrations. (${applied.size} already applied.)`);
  process.exit(0);
}

console.log(`Pending migrations: ${pending.length}`);
for (const file of pending) {
  const version = versionOf(file);
  const name = file.slice(version.length + 1).replace(/\.sql$/, "");
  const sql = readFileSync(join(MIG_DIR, file), "utf8");

  console.log(`→ applying ${file}`);
  await runSql(sql);

  const safeName = name.replace(/'/g, "''");
  await runSql(
    `insert into supabase_migrations.schema_migrations (version, name) ` +
      `values ('${version}', '${safeName}') on conflict (version) do nothing`
  );
  console.log(`  applied + recorded ${version}`);
}

console.log(`Done. Applied ${pending.length} migration(s).`);
