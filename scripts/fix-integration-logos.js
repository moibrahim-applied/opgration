const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLogos() {
  try {
    // Get all integrations where icon_svg exists but logo_url is null
    const { data: integrations, error: fetchError } = await supabase
      .from('integrations')
      .select('id, name, icon_svg, logo_url')
      .not('icon_svg', 'is', null);

    if (fetchError) {
      console.error('Error fetching integrations:', fetchError);
      return;
    }

    console.log(`Found ${integrations.length} integrations with icon_svg\n`);

    for (const integration of integrations) {
      // Copy icon_svg to logo_url
      const { error: updateError } = await supabase
        .from('integrations')
        .update({ logo_url: integration.icon_svg })
        .eq('id', integration.id);

      if (updateError) {
        console.error(`❌ Error updating ${integration.name}:`, updateError.message);
      } else {
        console.log(`✅ Updated ${integration.name} logo`);
      }
    }

    console.log('\n✅ Done! All logos fixed.');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixLogos();
