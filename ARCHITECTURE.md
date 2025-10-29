# Opgration - Architecture Documentation

## Overview

Opgration is an **integration hub platform** that enables users to connect external services (Google Drive, Dropbox, Slack, etc.) and access them through a unified API gateway. Built for workflow automation tools like Opus.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│  (Next.js App Router - React Components + Tailwind CSS)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│  • /api/integrations        - List available integrations       │
│  • /api/auth/initiate       - Start OAuth flow                  │
│  • /api/auth/callback       - OAuth callback handler            │
│  • /api/user/api-keys       - Manage user API keys              │
│  • /api/execute             - Unified API gateway             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DOMAIN LAYER (Business Logic)                │
│  • Entities:    Domain models (Integration, Connection, etc.)   │
│  • Repositories: Interface contracts                            │
│  • Use Cases:   (Future - business logic operations)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                          │
│  • Repositories: Supabase implementations                        │
│  • Services:                                                     │
│    - OAuthService:         Handle OAuth 2.0 flows               │
│    - ApiExecutionService:  Execute external API calls           │
│    - TokenRefreshService:  Refresh expired tokens               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (Supabase)                         │
│  • PostgreSQL Database with Row Level Security (RLS)            │
│  • Encrypted credential storage (pgcrypto)                      │
│  • Authentication (Supabase Auth)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  • Google Drive API                                              │
│  • Dropbox API                                                   │
│  • Slack API                                                     │
│  • (More integrations...)                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Unified API Gateway (`/api/execute`)

**Purpose**: Single endpoint for executing actions across all integrated services.

**URL Pattern**:
```
POST /api/execute/{organizationId}/{projectId}/{connectionId}/{actionSlug}
```

**Authentication**:
- Session-based (browser)
- API key-based (Postman, Opus)

**Flow**:
1. Authenticate request (session or API key)
2. Fetch connection details
3. Retrieve encrypted credentials
4. Fetch integration and action configuration
5. Transform request payload using templates
6. Execute external API call
7. Handle token expiration (auto-refresh)
8. Log API call
9. Return response

**Example**:
```bash
POST /api/execute/org-123/proj-456/conn-789/create-folder
Headers:
  X-API-Key: opgr_abc123xyz
  Content-Type: application/json
Body:
  {"folderName": "My Reports"}

Response:
  {
    "id": "1KOIHlfCQFUOCWbPlsLfWN91kG8wZ84WQ",
    "name": "My Reports",
    "mimeType": "application/vnd.google-apps.folder"
  }
```

### 2. OAuth Flow

**Purpose**: Securely connect user accounts to external services.

**Components**:
- `/api/auth/initiate` - Start OAuth flow
- `/api/auth/callback/[provider]` - Handle OAuth callback
- `OAuthService` - Generate auth URLs, exchange codes for tokens

**Flow**:
```
1. User clicks "Connect Google Drive"
   ↓
2. POST /api/auth/initiate
   - Create connection record
   - Generate OAuth URL with state
   ↓
3. Redirect to Google OAuth
   - User grants permissions
   ↓
4. Google redirects to /api/auth/callback/google-drive
   - Exchange code for access_token + refresh_token
   ↓
5. Encrypt and store tokens
   ↓
6. Redirect to success page
```

### 3. Token Management

**Purpose**: Keep OAuth tokens fresh and valid.

**Components**:
- `TokenRefreshService` - Refresh expired tokens
- `encrypted_credentials` table - Store tokens securely

**Auto-Refresh Flow**:
```
1. API call fails with 401
   ↓
2. Detect token expiration
   ↓
3. Fetch refresh_token
   ↓
4. Call provider's token endpoint
   ↓
5. Store new access_token
   ↓
6. Retry original API call
   ↓
7. Success (transparent to user)
```

### 4. Template Transformation

**Purpose**: Transform user payload into provider-specific API format.

**How it works**:
```javascript
// Stored in database:
{
  "request": {
    "body": {
      "name": "{{folderName}}",
      "mimeType": "application/vnd.google-apps.folder",
      "parents": ["{{parentFolderId}}"]
    }
  }
}

// User sends:
{"folderName": "Reports"}

// Transform to:
{
  "name": "Reports",
  "mimeType": "application/vnd.google-apps.folder"
  // parents omitted (empty template variable)
}

// Send to Google Drive API ✅
```

### 5. API Key Authentication

**Purpose**: Enable machine-to-machine authentication for Postman/Opus.

**Components**:
- `user_api_keys` table - Store hashed keys
- Middleware - Skip session check for API routes
- Execute endpoint - Validate API key

**Security**:
- Keys are SHA256 hashed
- Only full key shown once (on creation)
- Can be revoked anytime
- `last_used_at` tracking
- Service role client bypasses RLS

**Usage**:
```bash
# Generate key in UI
http://localhost:3000/api-keys

# Use in Postman
Header: X-API-Key: opgr_abc123xyz456...
```

## Database Schema

### Core Tables

#### `organizations`
Multi-tenancy support.
```sql
- id (UUID, PK)
- name (TEXT)
- slug (TEXT, UNIQUE)
- created_at, updated_at
```

#### `organization_members`
User membership in organizations.
```sql
- id (UUID, PK)
- organization_id (UUID, FK)
- user_id (UUID, FK → auth.users)
- role (owner|admin|member)
- created_at
```

#### `projects`
Projects within organizations.
```sql
- id (UUID, PK)
- organization_id (UUID, FK)
- name, slug
- description
- created_at, updated_at
```

#### `integrations`
Integration catalog (admin-managed).
```sql
- id (UUID, PK)
- name, slug
- description, logo_url
- auth_type (oauth2|api_key|bearer_token|basic_auth|custom)
- auth_config (JSONB) - OAuth URLs, scopes, client_id_env
- base_url
- is_active
- created_at, updated_at
```

#### `integration_actions`
Available actions per integration.
```sql
- id (UUID, PK)
- integration_id (UUID, FK)
- name, slug
- description
- http_method (GET|POST|PUT|PATCH|DELETE)
- endpoint_path
- request_schema (JSONB) - Input validation
- response_schema (JSONB) - Expected output
- transform_config (JSONB) - Request/response transformation
- created_at, updated_at
```

#### `connections`
User's authenticated integrations.
```sql
- id (UUID, PK)
- organization_id (UUID, FK)
- project_id (UUID, FK)
- integration_id (UUID, FK)
- user_id (UUID, FK)
- name (user-friendly name)
- is_active
- created_at, updated_at
```

#### `encrypted_credentials`
Encrypted OAuth tokens/API keys.
```sql
- id (UUID, PK)
- connection_id (UUID, FK)
- credential_type (access_token|refresh_token|api_key|custom)
- encrypted_value (TEXT) - PGP encrypted
- expires_at (TIMESTAMPTZ)
- created_at, updated_at
```

#### `user_api_keys`
User API keys for machine-to-machine auth.
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- name (TEXT) - "Production Key"
- key_prefix (TEXT) - "opgr_abc..."
- key_hash (TEXT, UNIQUE) - SHA256 hash
- last_used_at
- is_active
- created_at, updated_at
```

#### `api_logs`
API usage monitoring.
```sql
- id (UUID, PK)
- connection_id (UUID, FK)
- action_id (UUID, FK)
- request_payload (JSONB)
- response_payload (JSONB)
- status_code (INTEGER)
- error_message (TEXT)
- executed_at
```

### Security Features

**Row Level Security (RLS)**:
- Users can only access their organization's data
- RLS disabled for testing (re-enable for production)
- Service role key bypasses RLS for API key auth

**Encryption**:
```sql
-- Encrypt credentials
CREATE FUNCTION encrypt_credential(credential_value TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(credential_value, encryption_key),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrypt credentials
CREATE FUNCTION decrypt_credential(encrypted_value TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted_value, 'base64'),
    encryption_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Clean Architecture

### Domain Layer (`src/domain/`)

**Entities**: Pure TypeScript interfaces
```typescript
// src/domain/entities/Integration.ts
export interface Integration {
  id: string;
  name: string;
  slug: string;
  authType: AuthType;
  authConfig: OAuth2Config | ApiKeyConfig;
  baseUrl?: string;
  // ...
}
```

**Repositories**: Interface contracts
```typescript
// src/domain/repositories/IIntegrationRepository.ts
export interface IIntegrationRepository {
  findAll(): Promise<Integration[]>;
  findById(id: string): Promise<Integration | null>;
  create(input: CreateIntegrationInput): Promise<Integration>;
  // ...
}
```

### Infrastructure Layer (`src/infrastructure/`)

**Database**: Supabase implementations
```typescript
// src/infrastructure/database/SupabaseIntegrationRepository.ts
export class SupabaseIntegrationRepository implements IIntegrationRepository {
  constructor(private supabase: SupabaseClient) {}

  async findAll(): Promise<Integration[]> {
    const { data } = await this.supabase
      .from('integrations')
      .select('*');
    return data.map(this.mapToIntegration);
  }
}
```

**Services**: Business logic
```typescript
// src/infrastructure/services/OAuthService.ts
export class OAuthService {
  generateAuthorizationUrl(config, params): string { ... }
  exchangeCodeForToken(config, code): Promise<TokenResponse> { ... }
  refreshAccessToken(config, refreshToken): Promise<TokenResponse> { ... }
}

// src/infrastructure/services/ApiExecutionService.ts
export class ApiExecutionService {
  execute(input: ExecuteActionInput): Promise<ExecuteActionResult> { ... }
  private applyTransform(template, values): Record<string, any> { ... }
}

// src/infrastructure/services/TokenRefreshService.ts
export class TokenRefreshService {
  refreshAccessToken(input): Promise<string> { ... }
}
```

## Authentication & Authorization

### Session-based (Browser)

**Flow**:
1. User signs up/logs in via Supabase Auth
2. Supabase creates session with cookies
3. Middleware checks session on page requests
4. API routes verify session with `supabase.auth.getUser()`

**Middleware**:
```typescript
// lib/supabase/middleware.ts
export async function updateSession(request: NextRequest) {
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  if (isApiRoute) {
    return supabaseResponse; // Skip - API handles own auth
  }

  const user = await supabase.auth.getClaims();

  if (!user) {
    redirect('/auth/login');
  }

  return supabaseResponse;
}
```

### API Key-based (Postman/Opus)

**Flow**:
1. User generates API key in `/api-keys`
2. Key is SHA256 hashed and stored
3. Full key shown once (user must save it)
4. On API request:
   - Check `X-API-Key` header
   - Hash and lookup in `user_api_keys`
   - If valid, use service role client (bypass RLS)
   - Update `last_used_at`

**Security**:
- Keys never stored in plain text
- Service role key in environment (never exposed)
- Keys can be revoked anytime
- Each user has their own keys

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OAuth Providers
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
DROPBOX_CLIENT_ID=xxx
DROPBOX_CLIENT_SECRET=xxx
SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx

# Encryption (embedded in SQL functions)
# 32-character random key for pgcrypto
```

## API Endpoints

### Public Endpoints

#### `GET /api/integrations`
List all available integrations.

**Response**:
```json
{
  "integrations": [
    {
      "id": "uuid",
      "name": "Google Drive",
      "slug": "google-drive",
      "description": "Cloud storage and file management",
      "logoUrl": "https://...",
      "authType": "oauth2"
    }
  ]
}
```

#### `GET /api/integrations/{id}/actions`
List actions for an integration.

**Response**:
```json
{
  "actions": [
    {
      "id": "uuid",
      "name": "Create Folder",
      "slug": "create-folder",
      "httpMethod": "POST",
      "description": "Create a new folder in Google Drive"
    }
  ]
}
```

### Authenticated Endpoints

#### `POST /api/auth/initiate`
Start OAuth flow.

**Request**:
```json
{
  "organizationId": "uuid",
  "projectId": "uuid",
  "integrationId": "uuid",
  "connectionName": "My Google Drive"
}
```

**Response**:
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "connectionId": "uuid"
}
```

#### `GET /api/auth/callback/{provider}`
OAuth callback handler (not called directly).

#### `POST /api/execute/{org}/{project}/{connection}/{action}`
⭐ **Main API Gateway** - Execute integration action.

**Authentication**: Session OR `X-API-Key` header

**Request**:
```json
{
  "folderName": "Reports",
  "parentFolderId": "optional"
}
```

**Response**: Provider-specific JSON

**Error Handling**:
- 401: Invalid/expired token → Auto-refresh → Retry
- 404: Connection/action not found
- 500: Server error

#### `GET /api/user/api-keys`
List user's API keys.

**Response**:
```json
{
  "keys": [
    {
      "id": "uuid",
      "name": "Production Key",
      "key_prefix": "opgr_abc123...",
      "last_used_at": "2025-01-15T10:30:00Z",
      "created_at": "2025-01-10T08:00:00Z",
      "is_active": true
    }
  ]
}
```

#### `POST /api/user/api-keys`
Generate new API key.

**Request**:
```json
{
  "name": "Production Key"
}
```

**Response**:
```json
{
  "key": { "id": "uuid", "name": "Production Key", ... },
  "apiKey": "opgr_abc123xyz456...",
  "warning": "Save this key now. You will not be able to see it again."
}
```

#### `DELETE /api/user/api-keys/{id}`
Revoke API key.

#### `PATCH /api/user/api-keys/{id}`
Update API key (name, is_active).

## Technology Stack

### Frontend
- **Next.js 15** - App Router
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library (Radix UI)

### Backend
- **Next.js API Routes** - Server-side endpoints
- **Server Actions** - Form handling (future)
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication
  - Row Level Security
  - Realtime (future)

### Infrastructure
- **Vercel** - Hosting (future)
- **Supabase Cloud** - Database hosting
- **GitHub** - Version control

### Security
- **pgcrypto** - Database-level encryption
- **SHA256** - API key hashing
- **HTTPS** - Transport security (production)
- **RLS** - Row level security (to be re-enabled)

## Deployment Checklist

Before deploying to production:

### Security
- [ ] Re-enable RLS on all tables
- [ ] Add rate limiting (e.g., upstash/ratelimit)
- [ ] Enable CORS restrictions
- [ ] Add request size limits
- [ ] Implement API key quotas
- [ ] Add CSRF protection
- [ ] Enable HTTPS only
- [ ] Rotate encryption keys
- [ ] Set up monitoring/alerts

### Database
- [ ] Run migrations on production DB
- [ ] Set up automated backups
- [ ] Configure connection pooling
- [ ] Add database indexes for performance
- [ ] Set up read replicas (if needed)

### Environment
- [ ] Add production env vars to Vercel
- [ ] Update OAuth redirect URIs in provider consoles
- [ ] Set up custom domain
- [ ] Configure DNS

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Add analytics (Vercel Analytics)
- [ ] Set up uptime monitoring
- [ ] Configure log aggregation

### Testing
- [ ] End-to-end tests
- [ ] Load testing
- [ ] Security audit
- [ ] Penetration testing

## Performance Considerations

### Current Optimizations
- Connection pooling via Supabase
- Indexes on foreign keys
- Service role client for API key auth (bypasses RLS overhead)

### Future Optimizations
- [ ] Cache integration/action configs (Redis)
- [ ] Batch API calls
- [ ] Implement request queuing
- [ ] Add CDN for static assets
- [ ] Optimize database queries
- [ ] Implement connection pooling

## Known Limitations

1. **RLS Disabled**: Currently disabled for testing. Must re-enable for production.
2. **No Rate Limiting**: API can be abused. Add rate limiting per user/key.
3. **No Webhooks**: Integrations are poll-based. Add webhook support for real-time events.
4. **Basic Org Management**: No invites, roles, billing. Build org management UI.
5. **Limited Error Handling**: Some edge cases not handled. Add comprehensive error handling.
6. **No Audit Trail**: Only basic logging. Add detailed audit logs.

## Future Enhancements

### Short-term
- [ ] Add more integrations (GitHub, Notion, Airtable)
- [ ] Build organization management UI
- [ ] Add webhook support
- [ ] Implement rate limiting
- [ ] Add API documentation (Swagger/OpenAPI)

### Medium-term
- [ ] Advanced transformation engine
- [ ] Conditional logic in actions
- [ ] Batch operations
- [ ] Workflow builder UI
- [ ] Template marketplace

### Long-term
- [ ] Custom integrations (user-defined)
- [ ] GraphQL support
- [ ] Real-time subscriptions
- [ ] Multi-region deployment
- [ ] Enterprise SSO

## Support & Maintenance

### Logs
- API execution logs: `api_logs` table
- Error logs: Check server logs
- API key usage: `last_used_at` in `user_api_keys`

### Monitoring
- Track token refresh failures
- Monitor API error rates
- Alert on suspicious API key usage
- Track integration uptime

### Common Issues

**Token expired**:
- Auto-refresh should handle this
- If refresh fails, user must re-authenticate

**Invalid API key**:
- Check if key is revoked
- Verify key is correct (copy/paste error)

**Connection not found**:
- Verify connection belongs to correct org/project
- Check if connection is active

## License

MIT

---

**Built with ❤️ for workflow automation**