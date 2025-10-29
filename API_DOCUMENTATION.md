# Opgration API Documentation

Version: 1.0.0
Base URL: `http://localhost:3000` (development)

## Authentication

Opgration supports two authentication methods:

### 1. Session-based (Browser)
Sign in through the web interface. Session is managed via cookies.

### 2. API Key (Recommended for Postman/Opus)
Include your API key in the request header:

```
X-API-Key: opgr_your_api_key_here
```

**Generate API key**: Visit `/api-keys` in the web interface.

---

## Endpoints

### Integrations

#### List All Integrations
Get available integrations catalog.

```http
GET /api/integrations
```

**Response 200**:
```json
{
  "integrations": [
    {
      "id": "06f7f1c8-5ce2-4f9a-bcbb-6beef16addab",
      "name": "Google Drive",
      "slug": "google-drive",
      "description": "Cloud storage and file management",
      "logoUrl": "https://cdn.cdnlogo.com/logos/g/35/google-drive.svg",
      "authType": "oauth2",
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

#### Get Integration Actions
List all actions available for an integration.

```http
GET /api/integrations/{integrationId}/actions
```

**Path Parameters**:
- `integrationId` (string, required) - Integration UUID

**Response 200**:
```json
{
  "actions": [
    {
      "id": "uuid",
      "integrationId": "06f7f1c8-5ce2-4f9a-bcbb-6beef16addab",
      "name": "Create Folder",
      "slug": "create-folder",
      "description": "Create a new folder in Google Drive",
      "httpMethod": "POST",
      "endpointPath": "/files",
      "requestSchema": {
        "type": "object",
        "properties": {
          "folderName": { "type": "string", "required": true },
          "parentFolderId": { "type": "string" }
        }
      },
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

### OAuth Flow

#### Initiate OAuth Connection
Start OAuth flow for connecting an integration.

```http
POST /api/auth/initiate
```

**Authentication**: Required (session or API key)

**Request Body**:
```json
{
  "organizationId": "00000000-0000-0000-0000-000000000001",
  "projectId": "00000000-0000-0000-0000-000000000002",
  "integrationId": "06f7f1c8-5ce2-4f9a-bcbb-6beef16addab",
  "connectionName": "My Google Drive"
}
```

**Response 200**:
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "connectionId": "d8fea74d-0c8a-488f-928e-d432c7b038b6"
}
```

**Usage**:
1. Make POST request
2. Redirect user to `authUrl`
3. User authorizes
4. Provider redirects back to callback
5. Connection is created with encrypted credentials

---

### Execute API (Main Gateway) ⭐

#### Execute Integration Action
Execute an action on a connected integration.

```http
POST /api/execute/{organizationId}/{projectId}/{connectionId}/{actionSlug}
```

**Authentication**: Required (session or API key)

**Headers**:
```
Content-Type: application/json
X-API-Key: opgr_your_key_here  (if using API key auth)
```

**Path Parameters**:
- `organizationId` (string) - Organization UUID
- `projectId` (string) - Project UUID
- `connectionId` (string) - Connection UUID
- `actionSlug` (string) - Action slug (e.g., "create-folder")

**Request Body**: Varies by action (see action's `requestSchema`)

**Example - Create Google Drive Folder**:
```http
POST /api/execute/00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000002/d8fea74d-0c8a-488f-928e-d432c7b038b6/create-folder
Content-Type: application/json
X-API-Key: opgr_abc123xyz

{
  "folderName": "Q4 Reports"
}
```

**Response 200** (varies by provider):
```json
{
  "kind": "drive#file",
  "id": "1KOIHlfCQFUOCWbPlsLfWN91kG8wZ84WQ",
  "name": "Q4 Reports",
  "mimeType": "application/vnd.google-apps.folder"
}
```

**Error Responses**:

**401 Unauthorized**:
```json
{
  "error": "Unauthorized"
}
```

**401 Token Expired** (auto-refreshed and retried):
```json
// Automatically handled - request succeeds after refresh
```

**404 Not Found**:
```json
{
  "error": "Connection not found"
}
```

**500 Server Error**:
```json
{
  "error": "Execution failed"
}
```

---

### API Keys

#### List API Keys
Get all API keys for the authenticated user.

```http
GET /api/user/api-keys
```

**Authentication**: Required (session only)

**Response 200**:
```json
{
  "keys": [
    {
      "id": "key-uuid",
      "name": "Production Key",
      "key_prefix": "opgr_abc123...",
      "last_used_at": "2025-01-15T10:30:00Z",
      "created_at": "2025-01-10T08:00:00Z",
      "is_active": true
    }
  ]
}
```

---

#### Create API Key
Generate a new API key.

```http
POST /api/user/api-keys
```

**Authentication**: Required (session only)

**Request Body**:
```json
{
  "name": "Production Key"
}
```

**Response 200**:
```json
{
  "key": {
    "id": "key-uuid",
    "name": "Production Key",
    "key_prefix": "opgr_abc123...",
    "is_active": true,
    "created_at": "2025-01-15T10:00:00Z"
  },
  "apiKey": "opgr_abc123xyz456def789ghi...",
  "warning": "Save this key now. You will not be able to see it again."
}
```

⚠️ **Important**: The full `apiKey` is only shown once. Save it securely!

---

#### Revoke API Key
Delete/revoke an API key.

```http
DELETE /api/user/api-keys/{keyId}
```

**Authentication**: Required (session only)

**Path Parameters**:
- `keyId` (string) - API key UUID

**Response 200**:
```json
{
  "success": true
}
```

---

#### Update API Key
Update API key settings.

```http
PATCH /api/user/api-keys/{keyId}
```

**Authentication**: Required (session only)

**Path Parameters**:
- `keyId` (string) - API key UUID

**Request Body**:
```json
{
  "name": "Updated Name",
  "is_active": false
}
```

**Response 200**:
```json
{
  "key": {
    "id": "key-uuid",
    "name": "Updated Name",
    "is_active": false,
    "updated_at": "2025-01-15T11:00:00Z"
  }
}
```

---

## Integration-Specific Actions

### Google Drive

#### Create Folder
```http
POST /api/execute/{org}/{project}/{connection}/create-folder
```

**Request**:
```json
{
  "folderName": "My Folder",
  "parentFolderId": "optional-parent-id"
}
```

**Response**:
```json
{
  "id": "folder-id",
  "name": "My Folder",
  "mimeType": "application/vnd.google-apps.folder"
}
```

---

#### Upload File
```http
POST /api/execute/{org}/{project}/{connection}/upload-file
```

**Request**:
```json
{
  "fileName": "report.pdf",
  "fileContent": "base64-encoded-content",
  "mimeType": "application/pdf",
  "parentFolderId": "optional"
}
```

---

#### List Files
```http
POST /api/execute/{org}/{project}/{connection}/list-files
```

**Request**:
```json
{
  "pageSize": 10,
  "query": "name contains 'report'"
}
```

**Response**:
```json
{
  "files": [
    {
      "id": "file-id",
      "name": "report.pdf",
      "mimeType": "application/pdf"
    }
  ]
}
```

---

### Dropbox

#### Create Folder
```http
POST /api/execute/{org}/{project}/{connection}/create-folder
```

**Request**:
```json
{
  "path": "/Reports/Q4"
}
```

---

#### Upload File
```http
POST /api/execute/{org}/{project}/{connection}/upload-file
```

**Request**:
```json
{
  "path": "/Reports/report.pdf",
  "fileContent": "base64-encoded-content"
}
```

---

### Slack

#### Send Message
```http
POST /api/execute/{org}/{project}/{connection}/send-message
```

**Request**:
```json
{
  "channel": "#general",
  "text": "Hello from Opgration!"
}
```

---

#### List Channels
```http
POST /api/execute/{org}/{project}/{connection}/list-channels
```

**Request**:
```json
{
  "limit": 100
}
```

**Response**:
```json
{
  "channels": [
    {
      "id": "C123456",
      "name": "general"
    }
  ]
}
```

---

## Rate Limits

Currently no rate limits (to be implemented).

**Recommended limits for production**:
- 100 requests/minute per API key
- 1000 requests/hour per user

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid auth |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error - Internal error |

---

## Webhooks

Not yet implemented.

**Planned**: Receive real-time events from integrated services.

---

## SDKs

### JavaScript/TypeScript

```typescript
// Example usage
const response = await fetch('http://localhost:3000/api/execute/org/proj/conn/create-folder', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'opgr_your_key_here'
  },
  body: JSON.stringify({
    folderName: 'My Folder'
  })
});

const data = await response.json();
console.log('Created folder:', data);
```

### cURL

```bash
curl -X POST \
  'http://localhost:3000/api/execute/org-id/proj-id/conn-id/create-folder' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: opgr_your_key_here' \
  -d '{"folderName": "My Folder"}'
```

### Python

```python
import requests

url = "http://localhost:3000/api/execute/org/proj/conn/create-folder"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "opgr_your_key_here"
}
payload = {"folderName": "My Folder"}

response = requests.post(url, json=payload, headers=headers)
print(response.json())
```

---

## Postman Collection

Import this collection to test all endpoints:

```json
{
  "info": {
    "name": "Opgration API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "List Integrations",
      "request": {
        "method": "GET",
        "header": [],
        "url": "{{baseUrl}}/api/integrations"
      }
    },
    {
      "name": "Execute Action",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "X-API-Key",
            "value": "{{apiKey}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"folderName\": \"Test Folder\"\n}"
        },
        "url": "{{baseUrl}}/api/execute/{{orgId}}/{{projectId}}/{{connectionId}}/create-folder"
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "apiKey",
      "value": "YOUR_API_KEY"
    },
    {
      "key": "orgId",
      "value": "00000000-0000-0000-0000-000000000001"
    },
    {
      "key": "projectId",
      "value": "00000000-0000-0000-0000-000000000002"
    },
    {
      "key": "connectionId",
      "value": "YOUR_CONNECTION_ID"
    }
  ]
}
```

---

## Support

For issues or questions:
- GitHub Issues: [Repository URL]
- Documentation: `/ARCHITECTURE.md`
- Setup Guide: `/README.md`

---

**Last Updated**: 2025-01-15