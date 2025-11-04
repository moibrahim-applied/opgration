require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateGmailIcon() {
  try {
    console.log('🔄 Updating Gmail integration icon...\n');

    // Update the Gmail integration icon
    const { data, error } = await supabase
      .from('integrations')
      .update({
        logo_url: 'https://n8n.io/nodes/gmail.svg',
        icon_svg: 'https://n8n.io/nodes/gmail.svg'
      })
      .eq('slug', 'gmail')
      .select();

    if (error) {
      console.error('❌ Error updating Gmail integration:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  Gmail integration not found');
      return;
    }

    console.log('✅ Gmail integration icon updated successfully!');
    console.log(`   ID: ${data[0].id}`);
    console.log(`   Name: ${data[0].name}`);
    console.log(`   Logo URL: ${data[0].logo_url}`);
    console.log(`   Icon SVG: ${data[0].icon_svg}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

updateGmailIcon();
