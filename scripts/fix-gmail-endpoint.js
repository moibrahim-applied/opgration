require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixGmailEndpoint() {
  try {
    console.log('🔧 Fixing Gmail send-email endpoint...\n');

    // Get Gmail integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id')
      .eq('slug', 'gmail')
      .single();

    if (integrationError || !integration) {
      console.error('❌ Gmail integration not found');
      return;
    }

    // Update the send-email action to use absolute URL
    const { data, error } = await supabase
      .from('integration_actions')
      .update({
        endpoint_path: 'http://localhost:3000/api/gmail/send-email'
      })
      .eq('integration_id', integration.id)
      .eq('slug', 'send-email')
      .select();

    if (error) {
      console.error('❌ Error updating action:', error.message);
      return;
    }

    console.log('✅ Gmail send-email endpoint fixed!');
    console.log(`   New endpoint: ${data[0].endpoint_path}`);
    console.log('\n⚠️  Note: For production, update to your production domain');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixGmailEndpoint();
