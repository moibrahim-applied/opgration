-- Add user API keys table
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- User-friendly name like "Production Key"
  key_prefix TEXT NOT NULL, -- First 8 chars for display: "opgr_abc"
  key_hash TEXT NOT NULL UNIQUE, -- SHA256 hash of full key
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Index for fast lookups
CREATE INDEX idx_user_api_keys_user ON user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_hash ON user_api_keys(key_hash);

-- RLS policies
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own keys
CREATE POLICY "Users can view their own API keys"
  ON user_api_keys FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own keys
CREATE POLICY "Users can create their own API keys"
  ON user_api_keys FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own keys
CREATE POLICY "Users can update their own API keys"
  ON user_api_keys FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own keys
CREATE POLICY "Users can delete their own API keys"
  ON user_api_keys FOR DELETE
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON user_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();