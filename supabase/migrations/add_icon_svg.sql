-- Add icon_svg column to integrations table
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS icon_svg TEXT;

-- Update existing integrations with SVG URLs
UPDATE integrations
SET icon_svg = 'https://n8n.io/nodes/google-drive.svg'
WHERE slug = 'google-drive';

UPDATE integrations
SET icon_svg = 'https://n8n.io/nodes/dropbox.svg'
WHERE slug = 'dropbox';

UPDATE integrations
SET icon_svg = 'https://n8n.io/nodes/slack.svg'
WHERE slug = 'slack';
