ALTER TABLE app_config
  ADD COLUMN ai_provider TEXT NOT NULL DEFAULT 'openai',
  ADD COLUMN ai_model    TEXT NOT NULL DEFAULT 'gpt-4o-mini';
