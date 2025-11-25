# Edge Functions Deployment Guide

## Prerequisites

1. Install Supabase CLI: `npm install -g supabase`
2. Authenticate: `supabase login`
3. Link your project: `supabase link --project-ref qgcyndtymegkobgfcpdh`

## Manual Deployment (Testing)

Deploy a specific function:
supabase functions deploy recipient-conversation
supabase functions deploy generate-gift-suggestionsDeploy all functions:sh
supabase functions deploy## Environment Variables

Edge functions require the following environment variables set in Supabase Dashboard:

- `OPENAI_API_KEY` - OpenAI API key for AI conversations and gift suggestions

Set these in: Supabase Dashboard → Project Settings → Edge Functions → Secrets

## Automated Deployment

Functions are automatically deployed via GitHub Actions when:

- Code is pushed to the `main` branch
- Pull requests are merged to `main`

See `.github/workflows/deploy-edge-functions.yml` for the workflow configuration.

## Local Testing

Test functions locally:
supabase functions serve recipient-conversationThis starts a local server at `http://localhost:54321/functions/v1/recipient-conversation`

## Project Reference

- Project Ref: `qgcyndtymegkobgfcpdh`
- Supabase URL: `https://qgcyndtymegkobgfcpdh.supabase.co`
