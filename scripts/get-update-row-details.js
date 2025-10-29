const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getUpdateRowDetails() {
  try {
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id')
      .eq('slug', 'google-sheets')
      .single();

    if (integrationError) {
      console.error('Integration not found:', integrationError);
      return;
    }

    const { data: action, error } = await supabase
      .from('integration_actions')
      .select('*')
      .eq('slug', 'update-row')
      .eq('integration_id', integration.id)
      .single();

    if (error) {
      console.error('Error fetching action:', error);
      return;
    }

    console.log('Update Row Action Details:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(action, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

getUpdateRowDetails();
