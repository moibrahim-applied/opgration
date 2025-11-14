# Integration Platform Development Guide

## The Philosophy

This integration platform is built on three core principles: **Clean Architecture**, **Database-Driven Configuration**, and **Security by Design**. Every addition to this platform should honor these principles. You are not here to add code—you are here to extend a system architected for scale, maintainability, and elegance.

---

## Before You Begin

### Read First

1. **INTEGRATION_ARCHITECTURE.md** - Understand the complete system design
2. **ARCHITECTURE.md** - Core platform architecture and patterns
3. Existing integration scripts in `/scripts/` - Learn from established patterns

### Understand the Patterns

**Repository Pattern**
- All data access goes through repository interfaces
- Implementations are in `/src/infrastructure/database/`
- Never write raw SQL in API routes or services

**Clean Architecture**
- Domain Layer: Pure TypeScript interfaces (no dependencies)
- Infrastructure Layer: Implementations (Supabase, OAuth, etc.)
- API Layer: Next.js routes (thin controllers)

**Database-Driven Configuration**
- Integrations are records, not code files
- Actions are database rows with schemas
- Add integrations via scripts, not deployments

---

## Adding a New Integration

### Step 1: Study Existing Integrations

Before writing anything, examine these files:
```bash
# Look at how Gmail was added
/scripts/add-gmail-integration.js
/app/api/gmail/send-email/route.ts
/src/infrastructure/services/ApiExecutionService.ts (line 24-27, 286-415)

# Look at authentication patterns
/src/infrastructure/services/OAuthService.ts
```

### Step 2: Understand the Integration

Ask yourself:
- **Authentication**: OAuth2, API Key, Bearer Token, or Custom?
- **Base URL**: What is the root API endpoint?
- **Scopes**: What permissions are needed? (OAuth2 only)
- **Actions**: What operations will users perform?
- **Complexity**: Can actions use standard HTTP calls, or do they need custom endpoints?

### Step 3: Create the Integration Script

**Location**: `/scripts/add-[service-name]-integration.js`

**Template**:
```javascript
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addServiceIntegration() {
  try {
    console.log('🔍 Checking if [SERVICE_NAME] integration already exists...\n');

    // 1. CHECK IF EXISTS
    const { data: existing } = await supabase
      .from('integrations')
      .select('id, name, slug')
      .eq('slug', '[service-slug]')
      .maybeSingle();

    if (existing) {
      console.log('⚠️  [SERVICE_NAME] integration already exists!');
      console.log(`   ID: ${existing.id}`);
      return;
    }

    console.log('✅ [SERVICE_NAME] integration does not exist. Proceeding...\n');

    // 2. INSERT INTEGRATION
    const integrationConfig = {
      name: '[Service Display Name]',
      slug: '[service-slug]',  // URL-safe, lowercase, hyphens only
      description: '[Brief description of what this service does]',
      logo_url: 'https://cdn.example.com/logo.svg',  // Or from n8n.io/nodes/
      icon_svg: 'https://cdn.example.com/logo.svg',
      base_url: 'https://api.service.com/v1',
      is_active: true
    };

    // FOR OAUTH2 SERVICES
    if (AUTH_TYPE === 'oauth2') {
      integrationConfig.auth_type = 'oauth2';
      integrationConfig.auth_config = {
        authorization_url: 'https://auth.service.com/oauth/authorize',
        token_url: 'https://auth.service.com/oauth/token',
        scopes: [
          'scope:read',
          'scope:write'
        ],
        client_id_env: 'SERVICE_CLIENT_ID',      // Must match .env.local
        client_secret_env: 'SERVICE_CLIENT_SECRET'
      };
    }

    // FOR API KEY SERVICES
    if (AUTH_TYPE === 'api_key') {
      integrationConfig.auth_type = 'api_key';
      integrationConfig.auth_config = {
        key_location: 'header',  // or 'query'
        key_name: 'X-API-Key'     // or 'api_key'
      };
    }

    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .insert(integrationConfig)
      .select()
      .single();

    if (integrationError) {
      console.error('❌ Error adding integration:', integrationError.message);
      return;
    }

    console.log('✅ Integration added successfully!');
    console.log(`   ID: ${integration.id}\n`);

    // 3. ADD ACTIONS
    const actions = [
      {
        name: 'Action Display Name',
        slug: 'action-slug',
        description: 'What this action does',
        http_method: 'POST',  // GET, POST, PUT, PATCH, DELETE
        endpoint_path: '/endpoint/path',  // Relative to base_url
        request_schema: {
          type: 'object',
          properties: {
            paramName: {
              type: 'string',  // string, number, boolean, array, object
              required: true,
              description: 'User-facing parameter description'
            }
          }
        },
        response_schema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Response field' }
          }
        },
        transform_config: {}  // Leave empty unless parameter mapping needed
      }
    ];

    for (const action of actions) {
      const { error: actionError } = await supabase
        .from('integration_actions')
        .insert({
          integration_id: integration.id,
          ...action
        });

      if (actionError) {
        console.error(`❌ Error adding action ${action.name}:`, actionError.message);
      } else {
        console.log(`✅ Added action: ${action.name}`);
      }
    }

    console.log('\n🎉 Integration setup complete!');
    console.log('\n⚠️  NEXT STEPS:');
    console.log('1. Add CLIENT_ID and CLIENT_SECRET to .env.local (OAuth2 only)');
    console.log('2. Configure OAuth consent screen with required scopes');
    console.log('3. Add redirect URI: http://localhost:3000/api/auth/callback/[service-slug]');
    console.log('4. Test connection in UI');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

addServiceIntegration();
```

### Step 4: Run the Script

```bash
node scripts/add-[service-name]-integration.js
```

### Step 5: Test in UI

1. Navigate to `/w/[workspace]/integrations`
2. Find your new integration
3. Click "Connect"
4. Complete OAuth flow (or enter API key)
5. Execute test action

---

## Adding Custom Endpoints (When Needed)

### When to Create Custom Endpoints

Only when the external API requires:
- Complex data transformations (RFC 2822 email formatting)
- Multi-step operations (chaining multiple API calls)
- Binary data handling (file uploads with multipart)
- Special encoding (base64url for Gmail)

**95% of integrations should NOT need custom endpoints.**

### How to Add Custom Endpoint

**1. Create API Route**

**Location**: `/app/api/[service-name]/[action-name]/route.ts`

**Pattern**:
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const { param1, param2 } = body;

    // 2. Validate required fields
    if (!param1 || !param2) {
      return NextResponse.json(
        { error: 'Missing required fields: param1, param2' },
        { status: 400 }
      );
    }

    // 3. Get authorization header (passed from execute endpoint)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization' },
        { status: 401 }
      );
    }

    // 4. Perform custom transformation
    const transformedData = yourCustomLogic(param1, param2);

    // 5. Call external API
    const response = await fetch('https://api.service.com/endpoint', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transformedData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: `API error: ${response.statusText}`, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Custom endpoint error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

**2. Update Action endpoint_path**

```javascript
// In your integration script
endpoint_path: 'http://localhost:3000/api/[service]/[action]'
```

**3. Handle in ApiExecutionService (Optional)**

If the logic is simple enough, add inline handling:

```typescript
// In src/infrastructure/services/ApiExecutionService.ts
async execute(input: ExecuteActionInput): Promise<ExecuteActionResult> {
  // Special handling for your service
  if (input.action.slug === 'your-action' && input.baseUrl.includes('service.com')) {
    return this.handleYourCustomAction(input);
  }

  // Standard execution
  // ...
}
```

---

## Transform Configuration (Parameter Mapping)

### When to Use

When user parameters don't match API format exactly.

### Examples

**Wrapping Arrays** (Google Sheets):
```javascript
// User sends: { values: ["A", "B", "C"] }
// API needs:   { values: [["A", "B", "C"]] }

transform_config: {
  request: {
    body: {
      values: ["{{values}}"]  // Wraps in outer array
    }
  }
}
```

**Renaming Parameters**:
```javascript
// User sends: { email: "user@example.com" }
// API needs:   { emailAddress: "user@example.com" }

transform_config: {
  request: {
    body: {
      emailAddress: "{{email}}"
    }
  }
}
```

**Adding Static Values**:
```javascript
// User sends: { folderName: "Reports" }
// API needs:   { name: "Reports", mimeType: "application/vnd.google-apps.folder" }

transform_config: {
  request: {
    body: {
      name: "{{folderName}}",
      mimeType: "application/vnd.google-apps.folder"
    }
  }
}
```

**Query Parameters**:
```javascript
transform_config: {
  request: {
    params: {
      limit: "{{pageSize}}",
      offset: "{{page}}"
    }
  }
}
```

---

## Authentication Setup

### OAuth2

**1. Register OAuth Application**
- Go to service's developer console
- Create new OAuth application
- Set redirect URI: `http://localhost:3000/api/auth/callback/[service-slug]`
- Copy Client ID and Client Secret

**2. Add to Environment**
```bash
# .env.local
SERVICE_CLIENT_ID=your-client-id
SERVICE_CLIENT_SECRET=your-client-secret
```

**3. Configure Scopes**
Research the service's OAuth scopes documentation. Request minimum necessary permissions.

### API Key

**1. Document Key Location**
- Header: `X-API-Key: abc123`
- Query: `?api_key=abc123`
- Bearer: `Authorization: Bearer abc123`

**2. Update auth_config**
```javascript
auth_config: {
  key_location: 'header',  // or 'query'
  key_name: 'X-API-Key'     // or 'api_key'
}
```

**3. Create Connection Flow**
Users will manually enter their API key when connecting.

---

## Code Quality Standards

### TypeScript

- **All parameters must be typed** - No `any` unless absolutely necessary
- **Interfaces for complex objects** - Define in domain layer
- **Null safety** - Use `?` for optional fields, check before access

### Security

- **Never log credentials** - Tokens, API keys, passwords must never appear in console.log
- **Validate all inputs** - Check required fields, sanitize for injection attacks
- **Use encrypted_credentials table** - Never store tokens in plain text
- **Rate limiting consideration** - Document if API has rate limits

### Error Handling

```typescript
try {
  // Happy path
} catch (error) {
  console.error('Descriptive error context:', error);
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Generic error message',
    statusCode: 500
  };
}
```

### Documentation

Every action must have:
- **Description** - What it does in one sentence
- **Parameter descriptions** - User-facing explanation
- **Example payload** - In request_schema.properties.*.default

---

## Testing Checklist

Before marking integration complete:

- [ ] OAuth flow completes without errors (OAuth2 only)
- [ ] Connection appears in connections list
- [ ] Action executes successfully
- [ ] Response data is correct format
- [ ] Error handling works (test with invalid parameters)
- [ ] Execution logged in api_logs table
- [ ] Token refresh works (OAuth2 only - wait 1 hour or manually expire token)
- [ ] Multiple connections work (test with 2+ accounts)
- [ ] RLS policies respected (user can't access other's connections)

---

## Common Pitfalls

### 1. Hardcoding localhost URLs

**Wrong**:
```javascript
endpoint_path: 'http://localhost:3000/api/service/action'
```

**Right**:
```javascript
// For production compatibility
endpoint_path: '/api/service/action'  // Will use base_url if relative
```

### 2. Inconsistent Slug Naming

**Wrong**:
```javascript
integration slug: 'GoogleDrive'
action slug: 'create_folder'
```

**Right**:
```javascript
integration slug: 'google-drive'   // lowercase, hyphens
action slug: 'create-folder'       // lowercase, hyphens
```

### 3. Not Checking Existing Records

Always check if integration/action exists before inserting:
```javascript
const { data: existing } = await supabase
  .from('integrations')
  .select('id')
  .eq('slug', 'service-slug')
  .maybeSingle();

if (existing) {
  console.log('Already exists');
  return;
}
```

### 4. Missing Environment Variables

OAuth2 integrations need .env.local entries:
```bash
SERVICE_CLIENT_ID=...
SERVICE_CLIENT_SECRET=...
```

### 5. Incorrect HTTP Methods

- **GET** - Reading data (no request body)
- **POST** - Creating new resources
- **PUT** - Full replacement of resource
- **PATCH** - Partial update of resource
- **DELETE** - Removing resource

---

## Example: Complete Integration

### Scenario: Add Notion Integration

**Requirements**:
- Auth: OAuth2
- Actions: Create Page, Get Database, Update Page

**Implementation**:

```javascript
// scripts/add-notion-integration.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addNotionIntegration() {
  try {
    // Check if exists
    const { data: existing } = await supabase
      .from('integrations')
      .select('id')
      .eq('slug', 'notion')
      .maybeSingle();

    if (existing) {
      console.log('⚠️  Notion integration already exists');
      return;
    }

    // Insert integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .insert({
        name: 'Notion',
        slug: 'notion',
        description: 'Collaborative workspace and note-taking application',
        logo_url: 'https://n8n.io/nodes/notion.svg',
        icon_svg: 'https://n8n.io/nodes/notion.svg',
        base_url: 'https://api.notion.com/v1',
        auth_type: 'oauth2',
        auth_config: {
          authorization_url: 'https://api.notion.com/v1/oauth/authorize',
          token_url: 'https://api.notion.com/v1/oauth/token',
          scopes: [],  // Notion uses default scopes
          client_id_env: 'NOTION_CLIENT_ID',
          client_secret_env: 'NOTION_CLIENT_SECRET'
        },
        is_active: true
      })
      .select()
      .single();

    if (integrationError) {
      console.error('❌ Error:', integrationError.message);
      return;
    }

    console.log('✅ Notion integration added');

    // Add actions
    const actions = [
      {
        name: 'Create Page',
        slug: 'create-page',
        description: 'Create a new page in a Notion database',
        http_method: 'POST',
        endpoint_path: '/pages',
        request_schema: {
          type: 'object',
          properties: {
            databaseId: {
              type: 'string',
              required: true,
              description: 'Database ID where page will be created'
            },
            title: {
              type: 'string',
              required: true,
              description: 'Page title'
            },
            content: {
              type: 'string',
              description: 'Page content (markdown or plain text)'
            }
          }
        },
        response_schema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Created page ID' }
          }
        },
        transform_config: {
          request: {
            headers: {
              'Notion-Version': '2022-06-28'  // Required by Notion API
            },
            body: {
              parent: { database_id: '{{databaseId}}' },
              properties: {
                title: {
                  title: [{ text: { content: '{{title}}' } }]
                }
              }
            }
          }
        }
      },
      {
        name: 'Get Database',
        slug: 'get-database',
        description: 'Retrieve database information and schema',
        http_method: 'GET',
        endpoint_path: '/databases/{{databaseId}}',
        request_schema: {
          type: 'object',
          properties: {
            databaseId: {
              type: 'string',
              required: true,
              description: 'Database ID to retrieve'
            }
          }
        },
        response_schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'array' },
            properties: { type: 'object' }
          }
        },
        transform_config: {
          request: {
            headers: {
              'Notion-Version': '2022-06-28'
            }
          }
        }
      }
    ];

    for (const action of actions) {
      await supabase.from('integration_actions').insert({
        integration_id: integration.id,
        ...action
      });
      console.log(`✅ Added action: ${action.name}`);
    }

    console.log('\n🎉 Notion integration complete!');
    console.log('\n⚠️  Next steps:');
    console.log('1. Add to .env.local:');
    console.log('   NOTION_CLIENT_ID=your-client-id');
    console.log('   NOTION_CLIENT_SECRET=your-client-secret');
    console.log('2. Set redirect URI: http://localhost:3000/api/auth/callback/notion');
    console.log('3. Test in UI');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addNotionIntegration();
```

**Run**:
```bash
node scripts/add-notion-integration.js
```

---

## The Standard

This is not just code. This is infrastructure that teams depend on. Every integration you add should:

- **Work reliably** - No silent failures, comprehensive error handling
- **Feel consistent** - Same patterns as existing integrations
- **Be maintainable** - Clear code, proper types, good names
- **Stay secure** - No credential leaks, proper validation
- **Scale gracefully** - No hardcoded limits, efficient queries

When in doubt, study how Gmail, Google Drive, or Google Sheets integrations were implemented. They represent the gold standard for this platform.

---

## Getting Help

If you're stuck:

1. **Read existing code** - `/scripts/`, `/app/api/`, `/src/infrastructure/`
2. **Check documentation** - INTEGRATION_ARCHITECTURE.md, ARCHITECTURE.md
3. **Review external API docs** - Service's official API documentation
4. **Test incrementally** - Don't write everything at once, test each step
5. **Ask for code review** - Another pair of eyes catches mistakes

Remember: It's better to ask before you break production than to apologize after.

---

## Final Checklist

Before committing:

- [ ] Script runs without errors
- [ ] Integration appears in UI integrations list
- [ ] OAuth flow completes (if OAuth2)
- [ ] Action executes successfully
- [ ] Response format matches expected schema
- [ ] Error messages are clear and helpful
- [ ] Code follows existing patterns
- [ ] No hardcoded values (use env vars)
- [ ] No credentials in logs
- [ ] TypeScript types are correct
- [ ] Documentation updated (if needed)

When all checks pass, you've successfully extended the platform. Welcome to the team.
