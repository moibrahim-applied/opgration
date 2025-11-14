# Integration Addition Prompt Template

## Standard Prompt

```
Add a new integration to this platform. Read CLAUDE.md for complete architecture details.

SERVICE: [Service Name]
SLUG: [service-slug]
AUTH TYPE: [oauth2 / api_key / bearer_token]
BASE URL: [https://api.service.com]

OAUTH2 CONFIG (if applicable):
- Authorization URL: [authorization endpoint]
- Token URL: [token endpoint]
- Required Scopes: [scope1, scope2]
- Environment Variables: [SERVICE_CLIENT_ID, SERVICE_CLIENT_SECRET]

ACTIONS:
1. [Action Name]
   - HTTP Method: [GET/POST/PUT/DELETE]
   - Endpoint Path: [/endpoint/path]
   - Required Parameters: [param1: type - description]
   - Optional Parameters: [param2: type - description]

2. [Additional actions as needed]

REQUIREMENTS:
1. Follow /scripts/add-gmail-integration.js pattern exactly
2. Check if integration exists before inserting (prevent duplicates)
3. Use lowercase-with-hyphens for all slugs
4. Include complete request_schema with parameter descriptions
5. No hardcoded localhost URLs (use relative paths)
6. Add error handling for all database operations
7. Test OAuth flow end-to-end before completion

DELIVERABLE: Single script file at /scripts/add-[service-slug]-integration.js
```

---

## Example: Slack Integration

```
Add a new integration to this platform. Read CLAUDE.md for complete architecture details.

SERVICE: Slack
SLUG: slack
AUTH TYPE: oauth2
BASE URL: https://slack.com/api

OAUTH2 CONFIG:
- Authorization URL: https://slack.com/oauth/v2/authorize
- Token URL: https://slack.com/api/oauth.v2.access
- Required Scopes: chat:write, channels:read
- Environment Variables: SLACK_CLIENT_ID, SLACK_CLIENT_SECRET

ACTIONS:
1. Send Message
   - HTTP Method: POST
   - Endpoint Path: /chat.postMessage
   - Required Parameters: channel: string - Channel ID or name, text: string - Message content
   - Optional Parameters: thread_ts: string - Parent message timestamp for threading

2. List Channels
   - HTTP Method: GET
   - Endpoint Path: /conversations.list
   - Optional Parameters: limit: number - Maximum results to return, types: string - Channel types filter

REQUIREMENTS:
1. Follow /scripts/add-gmail-integration.js pattern exactly
2. Check if integration exists before inserting
3. Use lowercase-with-hyphens for all slugs
4. Include complete request_schema with parameter descriptions
5. No hardcoded localhost URLs
6. Add error handling for all database operations
7. Test OAuth flow end-to-end

DELIVERABLE: Single script file at /scripts/add-slack-integration.js
```

---

## Verification Checklist

After script generation, verify:

- Script location: /scripts/add-[service-slug]-integration.js
- Includes dotenv loading at top
- Checks for existing integration before insert
- Slug naming: lowercase-with-hyphens only
- Complete request_schema with type, required flag, description
- OAuth config matches authentication type
- Error handling on all database operations
- Clear console output for success and failure states
- Next steps documentation for environment setup
- Script is idempotent (safe to run multiple times)

---

## Common Errors

| Wrong | Correct |
|-------|---------|
| slug: 'googleDrive' | slug: 'google-drive' |
| slug: 'google_drive' | slug: 'google-drive' |
| endpoint_path: 'http://localhost:3000/api/action' | endpoint_path: '/api/action' |
| Insert without checking | Check with .maybeSingle() first |
| properties: { name: { type: 'string' } } | properties: { name: { type: 'string', required: true, description: 'User name' } } |

---

## Success Criteria

1. Script executes without errors
2. Integration visible in UI integrations list
3. OAuth connection flow completes (if OAuth2)
4. Action execution returns expected response
5. Execution logged in executions history
6. Error handling shows clear messages
7. Script can run multiple times without duplicate errors
