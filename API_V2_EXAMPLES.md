# API V2 Examples

## Overview

API V2 uses a **unified payload format** where:
- **Authentication** goes in the header (`X-API-Key`)
- **Routing and data** go in the request body

**Base URL:** `http://localhost:3000/api/v2`

---

## Endpoint: POST /api/v2/execute

Execute any integration action with unified body payload.

### Request Headers

```
X-API-Key: your_api_key_here          // Required for API calls (optional for UI)
Content-Type: application/json
```

### Request Body

```json
{
  "workspace_id": "workspace-uuid",         // Required
  "project_id": "project-uuid",             // Required
  "connection_id": "connection-uuid",       // Required
  "action": "action-slug",                  // Required (e.g., "append-row")
  "parameters": {                           // Action-specific parameters
    // ... action parameters
  }
}
```

### Response Format

**Success:**
```json
{
  "success": true,
  "data": {
    // Action result data
  },
  "metadata": {
    "execution_id": "exec_abc123...",
    "request_id": "req_xyz789...",
    "timestamp": "2025-10-13T12:00:00Z",
    "action": "Append Row",
    "integration": "Google Sheets"
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid or inactive",
    "details": {}
  },
  "metadata": {
    "request_id": "req_xyz789...",
    "timestamp": "2025-10-13T12:00:00Z"
  }
}
```

---

## Examples

### Example 1: Google Sheets - Append Row

**Old way (v1):**
```bash
curl -X POST http://localhost:3000/api/execute/conn_123/append-row \
  -H "Content-Type: application/json" \
  -H "X-Workspace-ID: ws_456" \
  -H "X-Project-ID: proj_789" \
  -H "X-API-Key: key_abc" \
  -d '{
    "spreadsheetId": "1234567890",
    "values": [["John", "Doe", "john@example.com"]]
  }'
```

**New way (v2):**
```bash
curl -X POST http://localhost:3000/api/v2/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: key_abc" \
  -d '{
    "workspace_id": "ws_456",
    "project_id": "proj_789",
    "connection_id": "conn_123",
    "action": "append-row",
    "parameters": {
      "spreadsheetId": "1234567890",
      "values": [["John", "Doe", "john@example.com"]]
    }
  }'
```

---

### Example 2: Google Sheets - Search Rows (Advanced)

```bash
curl -X POST http://localhost:3000/api/v2/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: key_abc123" \
  -d '{
    "workspace_id": "00000000-0000-0000-0000-000000000001",
    "project_id": "00000000-0000-0000-0000-000000000002",
    "connection_id": "3385e4ef-e24b-4c0d-aaf9-76f481bb84ce",
    "action": "search-rows-advanced",
    "parameters": {
      "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      "sheetName": "Sheet1",
      "filters": [
        {
          "columnName": "Status",
          "searchValue": "Active"
        },
        {
          "columnName": "Age",
          "searchValue": "25"
        }
      ],
      "filterLogic": "AND",
      "returnAll": true
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rows": [
      {
        "Name": "John Doe",
        "Status": "Active",
        "Age": "25",
        "Email": "john@example.com"
      }
    ],
    "count": 1
  },
  "metadata": {
    "execution_id": "exec_a1b2c3...",
    "request_id": "req_d4e5f6...",
    "timestamp": "2025-10-13T12:30:00Z",
    "action": "Search Rows (Advanced)",
    "integration": "Google Sheets"
  }
}
```

---

### Example 3: Google Sheets - Update Row (Advanced)

```bash
curl -X POST http://localhost:3000/api/v2/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: key_abc123" \
  -d '{
    "workspace_id": "ws_456",
    "project_id": "proj_789",
    "connection_id": "conn_sheets_123",
    "action": "update-row-advanced",
    "parameters": {
      "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      "sheetName": "Sheet1",
      "filters": [
        {
          "columnName": "ID",
          "searchValue": "100"
        }
      ],
      "updates": [
        {
          "columnName": "Status",
          "newValue": "Completed"
        },
        {
          "columnName": "UpdatedAt",
          "newValue": "2025-10-13"
        }
      ]
    }
  }'
```

---

### Example 4: Google Drive - Upload File

```bash
curl -X POST http://localhost:3000/api/v2/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: key_abc123" \
  -d '{
    "workspace_id": "ws_456",
    "project_id": "proj_789",
    "connection_id": "conn_drive_456",
    "action": "upload-file",
    "parameters": {
      "fileName": "report.pdf",
      "fileContent": "base64_encoded_content_here",
      "mimeType": "application/pdf",
      "parentFolderId": "folder_xyz"
    }
  }'
```

---

### Example 5: Google Drive - Share File

```bash
curl -X POST http://localhost:3000/api/v2/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: key_abc123" \
  -d '{
    "workspace_id": "ws_456",
    "project_id": "proj_789",
    "connection_id": "conn_drive_456",
    "action": "share-file",
    "parameters": {
      "fileId": "file_abc123",
      "emailAddress": "user@example.com",
      "role": "reader",
      "sendNotificationEmail": true
    }
  }'
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `INVALID_REQUEST` | 400 | Request body is not valid JSON |
| `MISSING_REQUIRED_FIELDS` | 400 | Missing required fields in body |
| `UNAUTHORIZED` | 401 | No valid authentication provided |
| `INVALID_API_KEY` | 401 | API key is invalid or inactive |
| `ACCESS_DENIED` | 403 | User doesn't have access to workspace |
| `CONNECTION_MISMATCH` | 403 | Connection doesn't belong to workspace/project |
| `CONNECTION_NOT_FOUND` | 404 | Connection doesn't exist |
| `INTEGRATION_NOT_FOUND` | 404 | Integration doesn't exist |
| `ACTION_NOT_FOUND` | 404 | Action doesn't exist for integration |
| `CONNECTION_INACTIVE` | 400 | Connection is disabled |
| `NO_CREDENTIALS` | 500 | No credentials found for connection |
| `CREDENTIAL_DECRYPTION_FAILED` | 500 | Failed to decrypt credentials |
| `EXECUTION_FAILED` | 500 | Action execution failed |

---

## Benefits of V2

✅ **Simpler** - Unified body payload for routing and data
✅ **RESTful** - Authentication in header, data in body (industry standard)
✅ **Easier Testing** - Minimal header config, all routing in body
✅ **No-code Friendly** - Tools like n8n/Make work great with this pattern
✅ **Better Documentation** - Clear separation of auth and data
✅ **Consistent** - All endpoints use same format
✅ **Better Errors** - Structured error responses with codes

---

## Migration from V1

**V1 Endpoint:**
```
POST /api/execute/{connectionId}/{actionSlug}
Headers: X-Workspace-ID, X-Project-ID, X-API-Key
Body: { ...parameters }
```

**V2 Endpoint:**
```
POST /api/v2/execute
Headers: X-API-Key
Body: {
  workspace_id, project_id, connection_id, action, parameters
}
```

**Migration Steps:**
1. Update endpoint URL from `/api/execute/...` to `/api/v2/execute`
2. Keep `X-API-Key` in header (no change)
3. Move connection ID and action slug from URL to body
4. Move workspace/project IDs from headers to body (X-Workspace-ID → workspace_id, X-Project-ID → project_id)
5. Wrap action parameters in `parameters` object
6. Update error handling to check `success` field

---

## JavaScript/TypeScript Example

```typescript
interface ExecuteRequest {
  workspace_id: string;
  project_id: string;
  connection_id: string;
  action: string;
  parameters: Record<string, any>;
}

interface ExecuteResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    execution_id?: string;
    request_id: string;
    timestamp: string;
    action?: string;
    integration?: string;
  };
}

async function executeAction(
  apiKey: string,
  request: ExecuteRequest
): Promise<ExecuteResponse> {
  const response = await fetch('http://localhost:3000/api/v2/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(request),
  });

  return response.json();
}

// Usage
const result = await executeAction('key_abc123', {
  workspace_id: 'ws_456',
  project_id: 'proj_789',
  connection_id: 'conn_123',
  action: 'append-row',
  parameters: {
    spreadsheetId: '1234567890',
    values: [['John', 'Doe', 'john@example.com']],
  },
});

if (result.success) {
  console.log('Success:', result.data);
} else {
  console.error('Error:', result.error.message);
}
```

---

## Python Example

```python
import requests
import json

def execute_action(
    api_key: str,
    workspace_id: str,
    project_id: str,
    connection_id: str,
    action: str,
    parameters: dict
) -> dict:
    url = "http://localhost:3000/api/v2/execute"

    headers = {
        "Content-Type": "application/json",
        "X-API-Key": api_key
    }

    payload = {
        "workspace_id": workspace_id,
        "project_id": project_id,
        "connection_id": connection_id,
        "action": action,
        "parameters": parameters
    }

    response = requests.post(url, headers=headers, json=payload)
    return response.json()

# Usage
result = execute_action(
    api_key="key_abc123",
    workspace_id="ws_456",
    project_id="proj_789",
    connection_id="conn_123",
    action="append-row",
    parameters={
        "spreadsheetId": "1234567890",
        "values": [["John", "Doe", "john@example.com"]]
    }
)

if result["success"]:
    print("Success:", result["data"])
else:
    print("Error:", result["error"]["message"])
```
