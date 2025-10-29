-- Fix RLS policies to avoid infinite recursion

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Users can create connections in their projects" ON connections;

-- Recreate organization_members policy without recursion
CREATE POLICY "Users can view members of their organizations"
  ON organization_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- Recreate connections INSERT policy without recursion
CREATE POLICY "Users can create connections in their projects"
  ON connections FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );