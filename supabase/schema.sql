-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ORGANIZATIONS
-- =====================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ORGANIZATION MEMBERS
-- =====================================================
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- =====================================================
-- PROJECTS
-- =====================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- =====================================================
-- INTEGRATIONS (Catalog - Admin managed)
-- =====================================================
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('oauth2', 'api_key', 'bearer_token', 'basic_auth', 'custom')),
  auth_config JSONB NOT NULL DEFAULT '{}', -- OAuth endpoints, scopes, etc.
  base_url TEXT, -- Base API URL for the service
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INTEGRATION ACTIONS (Available actions per integration)
-- =====================================================
CREATE TABLE integration_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Create Folder"
  slug TEXT NOT NULL, -- e.g., "create-folder"
  description TEXT,
  http_method TEXT NOT NULL CHECK (http_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  endpoint_path TEXT NOT NULL, -- e.g., "/files"
  request_schema JSONB NOT NULL DEFAULT '{}', -- JSON schema for input validation
  response_schema JSONB DEFAULT '{}', -- Expected response structure
  transform_config JSONB DEFAULT '{}', -- Request/response transformations
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(integration_id, slug)
);

-- =====================================================
-- CONNECTIONS (User's authenticated integrations)
-- =====================================================
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- User-defined name for this connection
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ENCRYPTED CREDENTIALS (Stores auth tokens/keys)
-- =====================================================
CREATE TABLE encrypted_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL, -- 'access_token', 'refresh_token', 'api_key', etc.
  encrypted_value TEXT NOT NULL, -- PGP encrypted credential
  expires_at TIMESTAMPTZ, -- For OAuth tokens
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connection_id, credential_type)
);

-- =====================================================
-- API USAGE LOGS (Optional - for monitoring)
-- =====================================================
CREATE TABLE api_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES integration_actions(id) ON DELETE CASCADE,
  request_payload JSONB,
  response_payload JSONB,
  status_code INTEGER,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_connections_org ON connections(organization_id);
CREATE INDEX idx_connections_project ON connections(project_id);
CREATE INDEX idx_connections_integration ON connections(integration_id);
CREATE INDEX idx_credentials_connection ON encrypted_credentials(connection_id);
CREATE INDEX idx_integration_actions_integration ON integration_actions(integration_id);
CREATE INDEX idx_api_logs_connection ON api_logs(connection_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see orgs they're members of
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their owned organizations"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Organization Members: Can view members of their orgs
CREATE POLICY "Users can view members of their organizations"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Projects: Users can see projects in their orgs
CREATE POLICY "Users can view projects in their organizations"
  ON projects FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects in their organizations"
  ON projects FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

-- Connections: Users can manage connections in their projects
CREATE POLICY "Users can view connections in their projects"
  ON connections FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      INNER JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create connections in their projects"
  ON connections FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      INNER JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Encrypted Credentials: Only accessible through server-side functions
CREATE POLICY "Users can view credentials for their connections"
  ON encrypted_credentials FOR SELECT
  USING (
    connection_id IN (
      SELECT c.id FROM connections c
      INNER JOIN projects p ON c.project_id = p.id
      INNER JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- API Logs: Users can view logs for their connections
CREATE POLICY "Users can view logs for their connections"
  ON api_logs FOR SELECT
  USING (
    connection_id IN (
      SELECT c.id FROM connections c
      INNER JOIN projects p ON c.project_id = p.id
      INNER JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_actions_updated_at BEFORE UPDATE ON integration_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_encrypted_credentials_updated_at BEFORE UPDATE ON encrypted_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ENCRYPTION FUNCTIONS
-- =====================================================

-- Function to encrypt credentials
CREATE OR REPLACE FUNCTION encrypt_credential(credential_value TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(
      credential_value,
      current_setting('app.encryption_key')
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt credentials
CREATE OR REPLACE FUNCTION decrypt_credential(encrypted_value TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted_value, 'base64'),
    current_setting('app.encryption_key')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;