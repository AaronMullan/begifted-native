# Supabase Edge Functions

This directory contains all Supabase Edge Functions for the BeGifted application.

## Functions

### recipient-conversation

Handles AI-powered conversations for adding and updating recipients. Uses OpenAI to:

- Conduct natural language conversations about recipients
- Extract recipient data (name, relationship, interests, birthday, etc.)
- Support partial field updates (e.g., just updating interests)

### generate-gift-suggestions

Generates personalized gift suggestions based on recipient data.

## Deployment

- **Automated**: Functions are automatically deployed to production via GitHub Actions when changes are pushed to the `main` branch
- **Manual**: For testing, use `supabase functions deploy <function-name>`

See `DEPLOYMENT.md` for detailed deployment instructions.
