-- Temporarily disable RLS on connections table for testing
-- WARNING: Only for development! Re-enable for production

ALTER TABLE connections DISABLE ROW LEVEL SECURITY;

-- Or if you want to keep it enabled but allow all inserts:
-- DROP POLICY IF EXISTS "Authenticated users can insert connections" ON connections;
-- DROP POLICY IF EXISTS "Users can create connections in their projects" ON connections;

-- CREATE POLICY "Allow all authenticated inserts for testing"
--   ON connections FOR INSERT
--   WITH CHECK (true);

-- CREATE POLICY "Allow all authenticated selects for testing"
--   ON connections FOR SELECT
--   USING (true);