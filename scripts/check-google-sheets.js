const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGoogleSheets() {
  try {
    // Check if Google Sheets integration exists
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('slug', 'google-sheets')
      .single();

    if (integrationError) {
      console.log('❌ Google Sheets integration not found');
      console.log('Error:', integrationError.message);
      return;
    }

    console.log('✅ Google Sheets integration exists');
    console.log('ID:', integration.id);
    console.log('Name:', integration.name);
    console.log('Auth Type:', integration.auth_type);
    console.log('');

    // Check for actions
    const { data: actions, error: actionsError } = await supabase
      .from('integration_actions')
      .select('*')
      .eq('integration_id', integration.id)
      .order('name');

    if (actionsError) {
      console.log('Error fetching actions:', actionsError);
      return;
    }

    console.log('Found', actions.length, 'action(s):');
    console.log('');

    actions.forEach(action => {
      console.log(`- ${action.name} (${action.slug})`);
      console.log(`  Method: ${action.http_method}`);
      console.log(`  Endpoint: ${action.endpoint_path}`);
      console.log('');
    });

    // Check specifically for "Get Row(s)" or similar
    const getRowAction = actions.find(a =>
      a.slug === 'get-rows' ||
      a.slug === 'get-row' ||
      a.name.toLowerCase().includes('get row')
    );

    if (getRowAction) {
      console.log('✅ Found Get Row(s) action:');
      console.log(JSON.stringify(getRowAction, null, 2));
    } else {
      console.log('❌ No "Get Row(s)" action found');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkGoogleSheets();
