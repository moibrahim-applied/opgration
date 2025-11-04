require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGmailAction() {
  const { data: integration } = await supabase
    .from('integrations')
    .select('id, slug, base_url')
    .eq('slug', 'gmail')
    .single();

  const { data: action } = await supabase
    .from('integration_actions')
    .select('*')
    .eq('integration_id', integration.id)
    .eq('slug', 'send-email')
    .single();

  console.log('Gmail Integration:');
  console.log('  Base URL:', integration.base_url);
  console.log('\nSend Email Action:');
  console.log('  Endpoint Path:', action.endpoint_path);
  console.log('  HTTP Method:', action.http_method);
}

checkGmailAction();
