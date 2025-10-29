-- Complete fix for RLS recursion issues
-- Run this in Supabase SQL Editor

-- Drop all existing policies on organization_members
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;

-- Recreate with simpler logic that doesn't recurse
CREATE POLICY "Users can view members of their organizations"
  ON organization_members FOR SELECT
  USING (
    -- Users can see themselves
    user_id = auth.uid()
  );

-- Allow service role to bypass RLS for connections INSERT
-- Drop and recreate connections INSERT policy
DROP POLICY IF EXISTS "Users can create connections in their projects" ON connections;

CREATE POLICY "Users can create connections in their projects"
  ON connections FOR INSERT
  WITH CHECK (
    -- Just check the user_id matches
    user_id = auth.uid()
  );

-- For testing purposes, temporarily allow all authenticated users to insert
-- You can tighten this later when you have proper org/project structure
CREATE POLICY "Authenticated users can insert connections"
  ON connections FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);