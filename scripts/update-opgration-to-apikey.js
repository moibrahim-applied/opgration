const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateOpgrationAuth() {
  try {
    // Update Opgration integration to use API key auth
    const { data, error } = await supabase
      .from('integrations')
      .update({
        auth_type: 'api_key',
        auth_config: {
          api_key_header: 'X-Opgration-API-Key',
          api_key_placeholder: 'Enter your Opgration API key'
        }
      })
      .eq('slug', 'opgration')
      .select();

    if (error) {
      console.error('Error updating Opgration auth:', error);
      return;
    }

    console.log('✅ Updated Opgration integration to use API key authentication');
    console.log(JSON.stringify(data[0], null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

updateOpgrationAuth();
