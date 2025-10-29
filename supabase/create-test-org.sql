-- Create test organization and project for testing
-- Run this in Supabase SQL Editor

-- Insert test organization
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Organization', 'test-org')
ON CONFLICT (id) DO NOTHING;

-- Insert test project
INSERT INTO projects (id, organization_id, name, slug)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Test Project',
  'test-project'
)
ON CONFLICT (id) DO NOTHING;

-- Add current user to organization (replace with your actual user_id)
-- First, let's see what user_id you have:
SELECT id, email FROM auth.users;

-- After you get your user_id, uncomment and run this:
-- INSERT INTO organization_members (organization_id, user_id, role)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001',
--   'YOUR-USER-ID-HERE',
--   'owner'
-- )
-- ON CONFLICT DO NOTHING;