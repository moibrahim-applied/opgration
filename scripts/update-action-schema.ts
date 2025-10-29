/**
 * Utility script to update action schemas with proper items.properties structure
 *
 * This script helps convert simple array schemas to detailed schemas with
 * item properties, enabling the interactive form builder.
 *
 * Usage:
 * 1. Update the SCHEMA_UPDATES object below with your action schemas
 * 2. Run: npx ts-node scripts/update-action-schema.ts
 */

import { createClient } from '@supabase/supabase-js';

// Configure your Supabase connection
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Define schema updates here
 * Format:
 * 'action-slug': { complete request_schema with items.properties }
 */
const SCHEMA_UPDATES: Record<string, any> = {
  'search-row-advanced': {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        required: true,
        description: 'The ID of the spreadsheet to search'
      },
      sheetName: {
        type: 'string',
        required: false,
        description: 'The name of the sheet to search (optional)'
      },
      filters: {
        type: 'array',
        required: true,
        description: 'Array of filter conditions',
        items: {
          type: 'object',
          properties: {
            columnName: {
              type: 'string',
              description: 'The name of the column to filter on'
            },
            searchValue: {
              type: 'string',
              description: 'The value to search for in the column'
            }
          }
        }
      },
      returnAll: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Return all matching rows or just the first match'
      }
    }
  },
  // Add more action schema updates here
  // 'another-action-slug': { ... }
};

async function updateActionSchemas() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('🚀 Starting action schema updates...\n');

  for (const [actionSlug, newSchema] of Object.entries(SCHEMA_UPDATES)) {
    try {
      console.log(`📝 Updating schema for action: ${actionSlug}`);

      // Update the action schema
      const { data, error } = await supabase
        .from('integration_actions')
        .update({ request_schema: newSchema })
        .eq('slug', actionSlug)
        .select();

      if (error) {
        console.error(`❌ Error updating ${actionSlug}:`, error.message);
        continue;
      }

      if (!data || data.length === 0) {
        console.warn(`⚠️  Action not found: ${actionSlug}`);
        continue;
      }

      console.log(`✅ Successfully updated ${actionSlug}`);
    } catch (err) {
      console.error(`❌ Unexpected error for ${actionSlug}:`, err);
    }
  }

  console.log('\n✨ Schema update complete!');
}

// Run the update
updateActionSchemas().catch(console.error);
