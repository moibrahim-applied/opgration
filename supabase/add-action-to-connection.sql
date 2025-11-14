-- Add action_id to connections table to track which specific action this connection is for
ALTER TABLE connections
ADD COLUMN action_id UUID REFERENCES integration_actions(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_connections_action_id ON connections(action_id);

-- Update existing connections to set action_id to NULL (they can still work for all actions)
-- New connections will require an action_id
