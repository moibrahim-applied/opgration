-- Temporarily update search-files to show ALL non-trashed files
-- This will help debug why search isn't finding the user's folder

UPDATE integration_actions
SET transform_config = '{
  "request": {
    "params": {
      "q": "trashed = false",
      "pageSize": "100",
      "fields": "files(id,name,mimeType,parents,trashed,createdTime),nextPageToken"
    }
  }
}'::jsonb
WHERE slug = 'search-files'
AND integration_id IN (SELECT id FROM integrations WHERE slug = 'google-drive');

-- To verify the update
SELECT
  name,
  slug,
  transform_config
FROM integration_actions
WHERE slug = 'search-files';
