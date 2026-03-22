# Authentication Setup (Auth0)

This backend uses Auth0 as the only authentication provider.  
Local `/api/auth/login` and Identity/JWT-secret login flows are not used.

## Runtime Model
- User authenticates in Auth0 (frontend Universal Login).
- Frontend calls backend with `Authorization: Bearer <auth0_access_token>`.
- Backend validates token using:
  - `AUTH0_DOMAIN` as issuer authority
  - `AUTH0_AUDIENCE` as API audience
- Backend syncs and reads local user profile via `api/auth0/*`.

## Required Environment Variables

Create `/backend/EWHQ.Api/.env` based on `.env.example`.

### Authentication
```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api-audience
AUTH0_ADMIN_CLIENT_ID=your-admin-application-client-id
AUTH0_CLIENT_ID=optional-fallback-client-id
AUTH0_DB_CONNECTION=Username-Password-Authentication
AUTH0_MANAGEMENT_API_ID=your-m2m-client-id
AUTH0_MANAGEMENT_API_SECRET=your-m2m-client-secret
```

### Email
```env
SENDGRID_API_KEY=your-sendgrid-api-key
```

### Optional: Azure Log Analytics Audit
```env
AZURE_LOG_AUDIT_ENABLED=true
AZURE_LOG_AUDIT_ENDPOINT=https://<dce>.ingest.monitor.azure.com
AZURE_LOG_AUDIT_DCR_IMMUTABLE_ID=dcr-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AZURE_LOG_AUDIT_REQUEST_STREAM=Custom-HqRequestAudit
AZURE_LOG_AUDIT_MUTATION_STREAM=Custom-HqDataMutationAudit
```

### Databases
Use the DB variables from `.env.example` (`DB_*`, `ADMIN_DB_*`, and provider-specific settings).

## Key Endpoints

### Auth0 profile sync/read
- `POST /api/auth0/sync-user` (authorized)
- `GET /api/auth0/profile` (authorized)
- `PUT /api/auth0/profile` (authorized)

### Password reset email
- `POST /api/auth0/change-password` (authorized)
- Triggers Auth0 `dbconnections/change_password` flow for Auth0 DB users.

### Invitations
- `GET /api/invitations/validate/{token}` (anonymous)
- `POST /api/invitations/accept` (authorized)
- Route aliases supported: `/api/invitations/*` and `/api/invitation/*`.

## Local Verification

Run backend:
```bash
dotnet run --project backend/EWHQ.Api
```

Use Auth0 bearer token checks:
```bash
cd backend/EWHQ.Api
AUTH0_TOKEN="<access-token>" ./test-auth.sh
```

## Troubleshooting
- `401 Unauthorized`: verify token audience/issuer match `AUTH0_AUDIENCE` and `AUTH0_DOMAIN`.
- `500 Password reset is not configured`: set `AUTH0_ADMIN_CLIENT_ID` (or `AUTH0_CLIENT_ID`) and `AUTH0_DOMAIN`.
- `sync-user` failures: verify Auth0 Management API credentials are valid and have required scopes.
