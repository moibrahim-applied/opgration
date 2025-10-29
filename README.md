# Opgration - Integration Hub

An integration hub that bridges internal workflow platforms with external services, providing a unified API gateway for seamless integrations.

## 🎯 Project Overview

Opgration allows users to:
- Browse available integrations (Google Drive, Dropbox, Slack, etc.)
- Authenticate with external services (OAuth2, API keys, etc.)
- Get unified API endpoints to use in workflow automation tools like Opus
- Manage integrations across organizations and projects

## 🏗️ Architecture

```
src/
├── domain/              # Business logic & entities
│   ├── entities/        # Core domain models
│   ├── repositories/    # Repository interfaces
│   └── usecases/        # Business use cases
├── infrastructure/      # External implementations
│   ├── database/        # Supabase repositories
│   ├── services/        # OAuth, encryption, etc.
│   └── api/             # API routes
└── presentation/        # UI layer
    ├── components/      # React components
    └── hooks/           # Custom React hooks
```

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Architecture**: Clean Architecture

## 📦 Database Schema

### Core Tables:
- `organizations` - Multi-tenancy support
- `projects` - Project hierarchy under orgs
- `integrations` - Integration catalog (admin-managed)
- `integration_actions` - Available actions per integration
- `connections` - User's authenticated integrations
- `encrypted_credentials` - Encrypted auth tokens/keys
- `api_logs` - API usage monitoring

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- Supabase account

### Setup

1. **Create Supabase Project**:
   - Go to [database.new](https://database.new)
   - Create a new project
   - Go to SQL Editor and run `supabase/schema.sql`
   - Run `supabase/seed.sql` for sample data

2. **Configure Environment**:
   - Rename `.env.example` to `.env.local`
   - Add your Supabase credentials from [Project Settings > API](https://supabase.com/dashboard/project/_/settings/api)

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OAuth credentials (for integrations)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DROPBOX_CLIENT_ID=
DROPBOX_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
```

3. **Install & Run**:
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔑 Key Features

### 1. Integration Setup Flow
```
User Flow:
1. Browse integrations catalog
2. Click "Create Connection"
3. Name the connection
4. Authenticate (OAuth/API Key/Token)
5. Get API endpoint details
```

### 2. Unified API Gateway
```
Endpoint Format:
POST /api/execute/{org-id}/{project-id}/{connection-id}/{action-slug}

Example:
POST /api/execute/org-123/proj-456/conn-789/create-folder
Body: { "folderName": "My Folder" }
```

### 3. Admin Panel
- Create new integrations
- Define authentication flows
- Configure actions and endpoints
- Generic schema for extensibility

## 🔐 Security

- Row Level Security (RLS) on all tables
- Encrypted credential storage using pgcrypto
- OAuth state validation
- Project-based access control

## 📝 API Usage Example

From your workflow tool (like Opus):

```bash
curl -X POST https://opgration.com/api/execute/org-abc/proj-xyz/conn-123/create-folder \
  -H "Content-Type: application/json" \
  -d '{
    "folderName": "New Project Files",
    "parentFolderId": "root"
  }'
```

## 🧩 Adding New Integrations

### Via Admin UI (Recommended):
1. Go to Admin Panel
2. Click "Add Integration"
3. Fill in details:
   - Name, slug, logo
   - Auth type & configuration
   - Base API URL
4. Add actions with endpoint paths and schemas

### Sample Integration Config:
```json
{
  "name": "GitHub",
  "authType": "oauth2",
  "authConfig": {
    "authorizationUrl": "https://github.com/login/oauth/authorize",
    "tokenUrl": "https://github.com/login/oauth/access_token",
    "scopes": ["repo", "user"]
  },
  "baseUrl": "https://api.github.com"
}
```

## 🎯 Development Roadmap

- [x] Database schema
- [x] Clean architecture setup
- [x] Domain models
- [ ] Supabase repositories
- [ ] OAuth service
- [ ] Unified API gateway
- [ ] Admin UI
- [ ] User dashboard
- [ ] Integration catalog
- [ ] Connection management
- [ ] API documentation

## 📄 License

MIT
