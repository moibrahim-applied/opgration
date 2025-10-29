const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createOpgrationConnection() {
  try {
    // Get Opgration integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id')
      .eq('slug', 'opgration')
      .single();

    if (integrationError) {
      console.error('Error finding Opgration integration:', integrationError);
      return;
    }

    // Get default workspace and project (using the test ones)
    const workspaceId = '00000000-0000-0000-0000-000000000001';
    const projectId = '00000000-0000-0000-0000-000000000002';

    // Get user ID from any existing connection
    const { data: existingConn } = await supabase
      .from('connections')
      .select('user_id')
      .limit(1)
      .single();

    if (!existingConn) {
      console.error('No existing connections found to get user_id');
      return;
    }

    const userId = existingConn.user_id;

    // Check if Opgration connection already exists
    const { data: existing } = await supabase
      .from('connections')
      .select('id')
      .eq('integration_id', integration.id)
      .eq('organization_id', workspaceId)
      .eq('project_id', projectId)
      .single();

    if (existing) {
      console.log('✅ Opgration connection already exists:', existing.id);
      return;
    }

    // Create Opgration connection (no credentials needed)
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .insert({
        user_id: userId,
        integration_id: integration.id,
        organization_id: workspaceId,
        project_id: projectId,
        name: 'Opgration Utilities',
        is_active: true
      })
      .select()
      .single();

    if (connectionError) {
      console.error('Error creating connection:', connectionError);
      return;
    }

    console.log('✅ Created Opgration connection:', connection.id);
    console.log('');
    console.log('You can now use Opgration utility actions!');
    console.log('Connection ID:', connection.id);
  } catch (error) {
    console.error('Error:', error);
  }
}

createOpgrationConnection();
