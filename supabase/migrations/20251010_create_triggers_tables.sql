
-- Triggers Table
-- Stores trigger configurations
CREATE TABLE IF NOT EXISTS triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  -- Trigger configuration
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(100) NOT NULL, -- 'new-sheet-row', 'new-calendar-event', etc.
  config JSONB NOT NULL DEFAULT '{}',

  -- Webhook configuration
  webhook_url TEXT NOT NULL,
  webhook_headers JSONB DEFAULT '{}',
  webhook_method VARCHAR(10) NOT NULL DEFAULT 'POST',

  -- State and status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_triggered_at TIMESTAMPTZ,
  error_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes
  CONSTRAINT triggers_webhook_method_check CHECK (webhook_method IN ('POST', 'PUT'))
);

-- Indexes for triggers table
CREATE INDEX IF NOT EXISTS idx_triggers_user_id ON triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_triggers_workspace_id ON triggers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_triggers_connection_id ON triggers(connection_id);
CREATE INDEX IF NOT EXISTS idx_triggers_is_active ON triggers(is_active);
CREATE INDEX IF NOT EXISTS idx_triggers_last_checked_at ON triggers(last_checked_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_triggers_trigger_type ON triggers(trigger_type);

-- Trigger Events Table
-- Stores individual events that were triggered
CREATE TABLE IF NOT EXISTS trigger_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id UUID NOT NULL REFERENCES triggers(id) ON DELETE CASCADE,

  -- Event data
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',

  -- Delivery status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  status_message TEXT,

  -- Webhook delivery details
  webhook_url TEXT NOT NULL,
  webhook_method VARCHAR(10) NOT NULL,
  webhook_payload JSONB NOT NULL DEFAULT '{}',
  webhook_response JSONB,

  -- Retry tracking
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  CONSTRAINT trigger_events_status_check CHECK (status IN ('pending', 'delivered', 'failed', 'retrying'))
);

-- Indexes for trigger_events table
CREATE INDEX IF NOT EXISTS idx_trigger_events_trigger_id ON trigger_events(trigger_id);
CREATE INDEX IF NOT EXISTS idx_trigger_events_status ON trigger_events(status);
CREATE INDEX IF NOT EXISTS idx_trigger_events_created_at ON trigger_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trigger_events_next_retry_at ON trigger_events(next_retry_at) WHERE status = 'retrying';

-- Trigger State Table
-- Stores the current state for polling-based triggers
CREATE TABLE IF NOT EXISTS trigger_state (
  trigger_id UUID PRIMARY KEY REFERENCES triggers(id) ON DELETE CASCADE,
  last_item_id VARCHAR(255),
  last_timestamp TIMESTAMPTZ,
  last_row_count INTEGER,
  state_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trigger_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE trigger_state ENABLE ROW LEVEL SECURITY;

-- Triggers policies
CREATE POLICY "Users can view their own triggers"
  ON triggers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own triggers"
  ON triggers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own triggers"
  ON triggers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own triggers"
  ON triggers FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger events policies
CREATE POLICY "Users can view events for their triggers"
  ON trigger_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM triggers
      WHERE triggers.id = trigger_events.trigger_id
      AND triggers.user_id = auth.uid()
    )
  );

-- Trigger state policies
CREATE POLICY "Users can view state for their triggers"
  ON trigger_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM triggers
      WHERE triggers.id = trigger_state.trigger_id
      AND triggers.user_id = auth.uid()
    )
  );

-- Service role has full access (for background jobs)
CREATE POLICY "Service role has full access to triggers"
  ON triggers FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to trigger_events"
  ON trigger_events FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to trigger_state"
  ON trigger_state FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_triggers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER triggers_updated_at_trigger
  BEFORE UPDATE ON triggers
  FOR EACH ROW
  EXECUTE FUNCTION update_triggers_updated_at();

CREATE TRIGGER trigger_state_updated_at_trigger
  BEFORE UPDATE ON trigger_state
  FOR EACH ROW
  EXECUTE FUNCTION update_triggers_updated_at();

-- Function to clean up old events (called by background job)
CREATE OR REPLACE FUNCTION cleanup_old_trigger_events(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM trigger_events
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
  AND status IN ('delivered', 'failed');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE triggers IS 'Stores trigger configurations that monitor external events';
COMMENT ON TABLE trigger_events IS 'Stores individual events that were triggered and their delivery status';
COMMENT ON TABLE trigger_state IS 'Stores the current state for polling-based triggers';
COMMENT ON COLUMN triggers.config IS 'Type-specific configuration (filters, schedules, etc.)';
COMMENT ON COLUMN triggers.webhook_headers IS 'Custom headers to send with webhook requests';
COMMENT ON COLUMN trigger_events.webhook_response IS 'Response received from webhook delivery';
COMMENT ON COLUMN trigger_events.attempt_count IS 'Number of delivery attempts made';
