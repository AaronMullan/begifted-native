# Plan: Knowledge Base RAG with Google Drive Sync

## Context

Emulate ChatGPT's "Projects sources" feature. 50+ pages of prompt engineering notes live in Google Drive as living documents (mixed formats: Google Docs, PDFs, spreadsheets). These should be available as context to all LLM calls (gift generation, recipient conversations, occasion recommendations, prompt refinement). Documents change frequently, so we need real-time sync via Google Drive webhooks.

## Architecture Overview

```
Google Drive (docs updated)
  → webhook notification → POST /api/drive-webhook
  → fetch changed files → export as text → chunk → embed → store in Supabase pgvector

LLM call (any call site):
  → build query from current context
  → embed query → search knowledge_chunks via Supabase RPC
  → inject top-k relevant chunks into system message
  → call OpenAI as usual
```

## Why Supabase pgvector

- Both Next.js backend and edge functions already have Supabase client access
- Works with existing chat completions API in edge functions (no API migration)
- Data stays in your database alongside existing tables

---

## Phase 1: Database & Ingestion Foundation

### Migration: `supabase/migrations/20260311_knowledge_base.sql`

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'upload',   -- 'upload' | 'google_drive'
  source_id TEXT,                           -- Google Drive file ID
  mime_type TEXT,
  content_hash TEXT,                        -- SHA-256 for change detection
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  section_heading TEXT,
  token_count INTEGER,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_knowledge_chunks_embedding
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- Store Drive sync state
CREATE TABLE drive_sync_state (
  id TEXT PRIMARY KEY DEFAULT 'default',
  page_token TEXT,
  channel_id TEXT,
  resource_id TEXT,
  channel_expiration TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Plus: `match_knowledge_chunks` RPC function, RLS policies using `public.is_admin()`.

### New files in `be-gifted/`:

| File | Purpose |
|------|---------|
| `lib/services/chunker.ts` | Split docs into ~1000-token chunks by markdown headings, then paragraphs. 200-token overlap. |
| `lib/services/rag.ts` | `retrieveContext(query)` — embed query, search pgvector, format as system message block |
| `app/api/admin/knowledge/route.ts` | Manual upload endpoint: chunk → embed → store. Also GET to list docs, DELETE to remove. |

---

## Phase 2: Google Drive Integration

### Setup Requirements
- Google Cloud project with Drive API enabled
- Service account with JSON key (stored as Vercel env vars)
- Share the Drive folder with the service account email

### New files in `be-gifted/`:

| File | Purpose |
|------|---------|
| `lib/google/drive-client.ts` | Authenticated Google Drive client using service account credentials from env vars |
| `lib/services/document-processor.ts` | Export & convert: Google Docs → text, PDFs → text (via `pdf-parse`), Sheets → CSV. Compute content hash for change detection. |
| `app/api/drive-webhook/route.ts` | Webhook handler: receive notification → call `changes.list()` → process changed files → re-chunk → re-embed |
| `app/api/admin/drive-sync/route.ts` | Admin endpoints: POST to set up watch, GET to check sync status, POST to trigger manual resync |

### Webhook Flow

1. **Setup**: Call `changes.watch()` with webhook URL `https://your-app.vercel.app/api/drive-webhook`
2. **On notification** (headers only, no body):
   - Read `X-Goog-Resource-State` — ignore `sync`, process `change`
   - Call `changes.list()` with stored `pageToken` to get changed file IDs
   - For each changed file in the watched folder:
     - Export content based on MIME type
     - Compute SHA-256 hash — skip if unchanged
     - Delete old chunks for this document
     - Re-chunk and re-embed
   - Update stored `pageToken`
3. **Watch renewal**: Vercel cron job every ~20 hours (watches expire after ~24h)

### Format Handling

| Format | Method |
|--------|--------|
| Google Docs | `drive.files.export({ mimeType: 'text/plain' })` |
| Google Sheets | `drive.files.export({ mimeType: 'text/csv' })` |
| Google Slides | `drive.files.export({ mimeType: 'text/plain' })` |
| PDFs | `drive.files.get({ alt: 'media' })` → `pdf-parse` for text extraction |
| Plain text/Markdown | `drive.files.get({ alt: 'media' })` → use directly |

### New dependency
- `@googleapis/drive` (lightweight standalone Drive client)
- `pdf-parse` (PDF text extraction, works on Vercel serverless)

---

## Phase 3: RAG Integration into LLM Calls

### Next.js backend (`be-gifted/`)

**`lib/services/gift-generation.ts`** — Before `openai.responses.create()`:
- Build query from CIS fields (interests, occasion, budget)
- Call `retrieveContext(query, { matchCount: 3 })`
- Inject formatted context as additional system message

### Edge functions (`begifted-native/supabase/functions/`)

**New file: `recipient-conversation/rag.ts`**
- Same retrieval pattern but uses raw `fetch` for embeddings + Supabase client `.rpc()` for search
- Edge functions need a Supabase client created with service role key from `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`

**`recipient-conversation/index.ts`** — Create Supabase client, pass to data-extractor

**`recipient-conversation/data-extractor.ts`** — Add RAG context to:
- `handleConversation` (conversation system prompts)
- `recommendOccasions` (occasion prompts)
- Extraction prompts

**`refine-prompt/index.ts`** — Add RAG context to META_SYSTEM_PROMPT

### Context injection format
```
--- KNOWLEDGE BASE CONTEXT ---
The following are relevant excerpts from prompt engineering guidelines:

[Source: Prompt Engineering Notes v3 > Tone Guidelines]
<chunk content>

---

[Source: Gift Selection Rules > Budget Handling]
<chunk content>
--- END KNOWLEDGE BASE CONTEXT ---
```

---

## Phase 4: Watch Renewal Cron

Add to `vercel.json` crons:
```json
{ "path": "/api/cron/renew-drive-watch", "schedule": "0 */20 * * *" }
```

**`app/api/cron/renew-drive-watch/route.ts`**:
- Stop existing channel via `channels.stop()`
- Get new start page token
- Create new watch
- Update `drive_sync_state` table

---

## Implementation Order

1. Migration (tables, indexes, RPC function)
2. Chunker utility
3. RAG retrieval service (Next.js)
4. Manual upload admin endpoint (allows testing before Drive integration)
5. Google Drive client setup
6. Document processor (format conversion)
7. Webhook handler
8. Admin drive-sync endpoint (setup watch, manual resync)
9. Watch renewal cron
10. Edge function RAG utility
11. Integrate gift generation
12. Integrate edge functions (conversation, occasions, refinement)
13. Upload/sync initial documents, verify quality

## Verification

1. `supabase db push` — run migration
2. Upload a test doc via admin endpoint → verify chunks in DB
3. Set up Drive watch → edit a Google Doc → verify webhook fires and chunks update
4. Run gift generation → confirm RAG context appears in system messages
5. Test recipient conversation → confirm RAG context injected
6. Wait 24h → verify cron renews the watch channel
7. Compare LLM output quality with/without RAG context

## Status

**Status: ON HOLD** — Sync strategy (webhooks vs cron vs manual) still needs to be finalized before implementation begins.
