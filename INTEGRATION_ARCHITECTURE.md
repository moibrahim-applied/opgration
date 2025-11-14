# Integration Platform Architecture

## Overview

This platform is a universal API gateway that connects external services (Gmail, Google Drive, Slack, etc.) through a unified interface. Users authenticate once per service, then execute actions through a single endpoint. The architecture uses database-driven configuration, meaning new integrations can be added without code deployments.

## Core Architecture

The system has 4 main layers:

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                               │
│  Web UI or API client sends execute request                │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  API GATEWAY LAYER                                          │
│  /api/v2/execute endpoint                                   │
│  • Authenticates user (JWT/API key)                         │
│  • Routes request to execution service                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  DOMAIN LAYER (Business Rules)                             │
│  This is where business logic lives:                        │
│  • When to refresh OAuth tokens (if expires in <5 min)     │
│  • How to transform parameters (wrap arrays for Sheets)    │
│  • Who can access what (user must own connection)          │
│  • What to log (request, response, user, timestamp)        │
│  • How to handle errors (retry? fail?)                     │
│                                                             │
│  Files: src/domain/entities/* and repository interfaces    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  INFRASTRUCTURE LAYER (Implementation)                      │
│  Executes the rules from Domain Layer:                      │
│  • SupabaseConnectionRepository: Gets connection from DB    │
│  • SupabaseCredentialRepository: Decrypts OAuth tokens     │
│  • ApiExecutionService: Calls external APIs                │
│  • OAuthService: Refreshes tokens when needed              │
│                                                             │
│  Files: src/infrastructure/database/* and services/*        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  EXTERNAL LAYER                                             │
│  • Supabase database (PostgreSQL)                           │
│  • External APIs (Gmail, Slack, Google Drive, etc.)         │
└─────────────────────────────────────────────────────────────┘
```

Most integration configurations live in the database, not in code. This means adding simple integrations (Slack, Notion, etc.) is just inserting database records.

**However, some integrations need custom code:**
- Gmail send-email: Custom RFC 2822 formatting + multipart MIME for attachments (line 286 in ApiExecutionService.ts)
- Google Sheets: Array wrapping via transform_config
- File uploads: Multipart form data handling

**Rule of thumb:**
- 80% of integrations: Database only (REST APIs with standard JSON)
- 20% of integrations: Custom code (complex data formats, binary files, special protocols)

## What is "Business Logic"?

Business logic is the rules and decisions that are specific to your platform. Here are the actual business rules in this system:

**1. Token Refresh Rule**
- Rule: "Refresh OAuth token if it expires in less than 5 minutes"
- Why: Prevents failures during execution
- Where: `src/infrastructure/services/OAuthService.ts`

**2. Access Control Rule**
- Rule: "Users can only execute actions on connections they own"
- Why: Security - prevent users accessing other people's accounts
- Where: Domain entities + RLS policies

**3. Logging Rule**
- Rule: "Log every execution with user_id, request, response, timestamp"
- Why: Debugging, compliance, analytics
- Where: `ApiExecutionService` after each execution

**4. Parameter Transformation Rule**
- Rule: "Transform user-friendly parameters to API-specific format"
- Example: User sends `[1,2,3]` → Google Sheets needs `[[1,2,3]]`
- Where: `transformConfig` in action definitions

**5. Multi-Tenancy Rule**
- Rule: "Users can only see data from their workspace"
- Why: Customer isolation
- Where: RLS policies + organization_id checks

These rules are in the "Domain Layer" because they're about your business (the integration platform), not about technical implementation (database, API calls).

## Key Patterns

### 1. Database-Driven Configuration

**What it means:** Integration settings are stored in database tables, not hardcoded.

**Why it matters:**
- Add new integrations in 30 minutes without code deployment
- Update API endpoints without redeploying
- Ready for multi-tenancy (different configs per customer)

**Example:**
```sql
-- Adding Gmail requires no code changes
INSERT INTO integrations (name, slug, base_url, auth_type)
VALUES ('Gmail', 'gmail', 'https://gmail.googleapis.com', 'oauth2');
```

### 2. Repository Pattern

**What it means:** Database access is abstracted behind interfaces.

**Why it matters:**
- Switch from Supabase to PostgreSQL or MySQL without touching business logic
- Easy to test (mock the database)
- Can add caching layer without rewriting code

### 3. Clean Architecture

**What it means:** Code is organized in layers with clear boundaries.

**Why it matters:**
- Business logic independent of framework (Next.js, React, Supabase)
- Can switch databases, UI frameworks, or hosting without major rewrites
- Each layer can be tested and scaled independently

## Core Components

### Integration
A template for an external service. Contains authentication details and base URL.

```typescript
{
  name: "Gmail",
  slug: "gmail",
  baseUrl: "https://gmail.googleapis.com",
  authType: "oauth2",
  authConfig: { scopes: [...], clientIdEnv: "GMAIL_CLIENT_ID" }
}
```

### Action
A specific operation on an integration (e.g., "Send Email").

```typescript
{
  name: "Send Email",
  slug: "send-email",
  httpMethod: "POST",
  endpointPath: "/api/gmail/send-email",
  requestSchema: { /* parameter validation */ }
}
```

### Connection
A user's authenticated instance of an integration.

```typescript
{
  userId: "user-123",
  integrationId: "gmail-id",
  organizationId: "org-456",  // Multi-tenancy isolation
  name: "My Work Gmail"
}
```

### Encrypted Credentials
OAuth tokens stored with AES-256 encryption.

```typescript
{
  connectionId: "connection-789",
  credentialType: "access_token",
  encryptedValue: "...",  // pgcrypto encrypted
  expiresAt: "2025-01-06T10:00:00Z"
}
```

### Execution Logs
Audit trail of every API call.

```typescript
{
  userId: "user-123",
  actionId: "send-email-id",
  requestPayload: { to: "...", subject: "..." },
  responsePayload: { id: "...", status: "sent" },
  statusCode: 200,
  executedAt: "2025-01-06T09:30:00Z"
}
```

## How It Works

**Execution Flow:**

1. Client sends: `POST /api/v2/execute` with workspace_id, connection_id, action, parameters
2. System authenticates user and verifies permissions
3. Fetches integration config, action config, and encrypted credentials from database
4. Decrypts OAuth token using PostgreSQL function
5. Checks if token expires soon - if yes, refreshes it automatically
6. Transforms parameters to match external API format
7. Calls external API (Gmail, Slack, etc.)
8. Logs request and response to api_logs table
9. Returns response to client

**Token Refresh:** Tokens are automatically refreshed before expiration. Users never see "token expired" errors.

## Security

### Authentication
- Web users: JWT tokens via Supabase Auth
- API clients: Hashed API keys

### Authorization
- Row Level Security (RLS) enforces workspace isolation
- Users can only access their workspace data
- Database enforces security (not just application code)

### Credential Encryption
- All OAuth tokens encrypted at rest with AES-256
- Encryption key in PostgreSQL functions (not application code)
- Decryption only happens in-memory, never logged

### Audit Trail
Every execution logs:
- Who (user_id)
- What (action_id)
- When (executed_at)
- Where (connection_id)
- Result (status, request, response)

This enables compliance (SOC 2, GDPR), debugging, and usage analytics.

## Scalability

### Current Architecture
- Stateless API servers (can add more servers as needed)
- Database connection pooling
- Indexed foreign keys for fast lookups

### Scaling Path
- Horizontal: Add more servers behind load balancer
- Database: Add read replicas for analytics
- Caching: Redis for integration configs (reduce DB load)
- Rate limiting: Track executions per connection

## Extensibility

### Adding Integrations
1. Insert integration record in database
2. Define actions with schemas
3. Configure OAuth (if needed)
4. Test

Time: 30 minutes. No code deployment required.

### Custom Logic
For complex operations, add special handling in ApiExecutionService:

```typescript
// Check in execute() method (line 24)
if (action.slug === 'send-email' && integration.slug === 'gmail') {
  return this.handleGmailSendEmail(input);  // Custom logic
}
return this.executeStandardHttpCall(input);  // Standard
```

**When custom code is needed:**
- Complex data transformations (Gmail RFC 2822 email formatting)
- Binary/multipart data (file uploads, attachments)
- Special protocols (non-REST APIs)
- Multi-step operations (create + update + verify)

**When database config is enough:**
- Standard REST APIs with JSON
- Simple parameter mapping
- Bearer token authentication
- GET/POST/PUT/DELETE operations

Most integrations (80%) use standard HTTP calls. Only edge cases need custom code.

## Technology Stack

- **Backend:** Next.js 15, TypeScript
- **Database:** Supabase (PostgreSQL + Auth)
- **Encryption:** pgcrypto extension
- **Frontend:** React 18, Tailwind CSS, shadcn/ui
- **Hosting:** Vercel
- **CI/CD:** Automatic deployments on push

## Competitive Advantages

### vs. Zapier/Make.com
- Self-hosted option (customer controls infrastructure)
- Full source code access (audit security)
- Database-driven (easier to customize)
- No per-execution pricing

### vs. Building In-House
- 90% faster time to market
- Proven architecture patterns
- Security built-in (OAuth, encryption, RLS)
- Lower maintenance (we handle API updates)

## Key Benefits

**For Development:**
- Add integrations in 30 minutes vs 2-3 days
- Clean architecture reduces technical debt
- Repository pattern enables database changes without code changes
- Comprehensive logging simplifies debugging

**For Security:**
- AES-256 encryption for credentials
- Row Level Security for multi-tenancy
- Full audit trail for compliance
- Automatic token refresh (no downtime)

**For Business:**
- Fast time-to-market for new integrations
- Lower maintenance costs (centralized config)
- Ready for enterprise (multi-tenancy, compliance)
- Scalable (horizontal scaling, database optimization)

## Summary

This platform solves the integration problem by storing all configuration in the database instead of code. This architectural decision enables:

- Adding services without deployments
- Changing API endpoints without code changes
- Supporting multiple customers with different configs
- Scaling by adding servers

The clean architecture and repository pattern make the system flexible and maintainable. Security is built-in with encryption, RLS, and audit trails. The system is production-ready and designed for growth.
