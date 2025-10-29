-- =====================================================
-- SEED DATA FOR DEVELOPMENT
-- =====================================================

-- Insert sample integrations
INSERT INTO integrations (name, slug, description, logo_url, auth_type, auth_config, base_url) VALUES
(
  'Google Drive',
  'google-drive',
  'Cloud storage and file management',
  'https://cdn.cdnlogo.com/logos/g/35/google-drive.svg',
  'oauth2',
  '{
    "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth",
    "token_url": "https://oauth2.googleapis.com/token",
    "scopes": ["https://www.googleapis.com/auth/drive.file"],
    "client_id_env": "GOOGLE_CLIENT_ID",
    "client_secret_env": "GOOGLE_CLIENT_SECRET"
  }',
  'https://www.googleapis.com/drive/v3'
),
(
  'Dropbox',
  'dropbox',
  'File hosting and collaboration',
  'https://cdn.cdnlogo.com/logos/d/64/dropbox.svg',
  'oauth2',
  '{
    "authorization_url": "https://www.dropbox.com/oauth2/authorize",
    "token_url": "https://api.dropboxapi.com/oauth2/token",
    "scopes": ["files.content.write", "files.content.read"],
    "client_id_env": "DROPBOX_CLIENT_ID",
    "client_secret_env": "DROPBOX_CLIENT_SECRET"
  }',
  'https://api.dropboxapi.com/2'
),
(
  'Slack',
  'slack',
  'Team communication and collaboration',
  'https://cdn.cdnlogo.com/logos/s/4/slack.svg',
  'oauth2',
  '{
    "authorization_url": "https://slack.com/oauth/v2/authorize",
    "token_url": "https://slack.com/api/oauth.v2.access",
    "scopes": ["chat:write", "channels:read"],
    "client_id_env": "SLACK_CLIENT_ID",
    "client_secret_env": "SLACK_CLIENT_SECRET"
  }',
  'https://slack.com/api'
);

-- Insert sample actions for Google Drive
INSERT INTO integration_actions (integration_id, name, slug, description, http_method, endpoint_path, request_schema, response_schema, transform_config) VALUES
(
  (SELECT id FROM integrations WHERE slug = 'google-drive'),
  'Create Folder',
  'create-folder',
  'Create a new folder in Google Drive',
  'POST',
  '/files',
  '{
    "type": "object",
    "properties": {
      "folderName": {"type": "string", "required": true},
      "parentFolderId": {"type": "string"}
    }
  }',
  '{
    "type": "object",
    "properties": {
      "id": {"type": "string"},
      "name": {"type": "string"},
      "mimeType": {"type": "string"}
    }
  }',
  '{
    "request": {
      "body": {
        "name": "{{folderName}}",
        "mimeType": "application/vnd.google-apps.folder",
        "parents": ["{{parentFolderId}}"]
      }
    }
  }'
),
(
  (SELECT id FROM integrations WHERE slug = 'google-drive'),
  'Upload File',
  'upload-file',
  'Upload a file to Google Drive',
  'POST',
  '/upload/drive/v3/files?uploadType=multipart',
  '{
    "type": "object",
    "properties": {
      "fileName": {"type": "string", "required": true},
      "fileContent": {"type": "string", "required": true},
      "mimeType": {"type": "string"},
      "parentFolderId": {"type": "string"}
    }
  }',
  '{
    "type": "object",
    "properties": {
      "id": {"type": "string"},
      "name": {"type": "string"}
    }
  }',
  '{}'
),
(
  (SELECT id FROM integrations WHERE slug = 'google-drive'),
  'List Files',
  'list-files',
  'List files from Google Drive',
  'GET',
  '/files',
  '{
    "type": "object",
    "properties": {
      "pageSize": {"type": "number", "default": 10},
      "query": {"type": "string"}
    }
  }',
  '{
    "type": "object",
    "properties": {
      "files": {"type": "array"}
    }
  }',
  '{
    "request": {
      "params": {
        "pageSize": "{{pageSize}}",
        "q": "{{query}}"
      }
    }
  }'
);

-- Insert sample actions for Dropbox
INSERT INTO integration_actions (integration_id, name, slug, description, http_method, endpoint_path, request_schema, transform_config) VALUES
(
  (SELECT id FROM integrations WHERE slug = 'dropbox'),
  'Create Folder',
  'create-folder',
  'Create a new folder in Dropbox',
  'POST',
  '/files/create_folder_v2',
  '{
    "type": "object",
    "properties": {
      "path": {"type": "string", "required": true}
    }
  }',
  '{
    "request": {
      "body": {
        "path": "{{path}}",
        "autorename": false
      }
    }
  }'
),
(
  (SELECT id FROM integrations WHERE slug = 'dropbox'),
  'Upload File',
  'upload-file',
  'Upload a file to Dropbox',
  'POST',
  '/files/upload',
  '{
    "type": "object",
    "properties": {
      "path": {"type": "string", "required": true},
      "fileContent": {"type": "string", "required": true}
    }
  }',
  '{}'
);

-- Insert sample actions for Slack
INSERT INTO integration_actions (integration_id, name, slug, description, http_method, endpoint_path, request_schema, transform_config) VALUES
(
  (SELECT id FROM integrations WHERE slug = 'slack'),
  'Send Message',
  'send-message',
  'Send a message to a Slack channel',
  'POST',
  '/chat.postMessage',
  '{
    "type": "object",
    "properties": {
      "channel": {"type": "string", "required": true},
      "text": {"type": "string", "required": true}
    }
  }',
  '{
    "request": {
      "body": {
        "channel": "{{channel}}",
        "text": "{{text}}"
      }
    }
  }'
),
(
  (SELECT id FROM integrations WHERE slug = 'slack'),
  'List Channels',
  'list-channels',
  'List all Slack channels',
  'GET',
  '/conversations.list',
  '{
    "type": "object",
    "properties": {
      "limit": {"type": "number", "default": 100}
    }
  }',
  '{
    "request": {
      "params": {
        "limit": "{{limit}}"
      }
    }
  }'
);