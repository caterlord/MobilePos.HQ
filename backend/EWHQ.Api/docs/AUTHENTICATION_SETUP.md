# Authentication Setup (Clerk)

This backend uses Clerk as the authentication provider.  
Local `/api/auth/login` and custom JWT-secret login flows are not used.

## Runtime Model
- User authenticates with Clerk in the frontend.
- Frontend calls backend with `Authorization: Bearer <clerk_session_token>`.
- Backend validates the request with `Clerk.BackendAPI` request authentication.
- Backend syncs and reads the local HQ user profile via `api/auth/*`.

## Required Environment Variables

Create `/backend/EWHQ.Api/.env` based on `.env.example`.

### Authentication
```env
CLERK_SECRET_KEY=sk_test_your_secret_key
CLERK_ALLOWED_PARTIES=http://localhost:5173,http://localhost:5174
```

Optional:
```env
CLERK_JWT_KEY=
CLERK_MACHINE_SECRET_KEY=
CLERK_AUDIENCES=
CLERK_INVITATION_REDIRECT_URL=http://localhost:5173/sign-up
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

### Profile sync/read
- `POST /api/auth/sync-user` (authorized)
- `GET /api/auth/profile` (authorized)
- `PUT /api/auth/profile` (authorized)

### Account management
- `POST /api/auth/change-password` (authorized)
- Returns a Clerk-directed message; password changes happen in Clerk account settings.

### Invitations
- `GET /api/invitations/validate/{token}` (anonymous)
- `POST /api/invitations/accept` (authorized)
- Route aliases supported: `/api/invitations/*` and `/api/invitation/*`.

## Local Verification

Run backend:
```bash
dotnet run --project backend/EWHQ.Api
```

Use bearer token checks:
```bash
cd backend/EWHQ.Api
API_TOKEN="<access-token>" ./test-auth.sh
```

## Troubleshooting
- `401 Unauthorized`: verify `CLERK_SECRET_KEY`, `CLERK_ALLOWED_PARTIES`, and frontend publishable key configuration.
- Invitation emails landing outside the app: set `CLERK_INVITATION_REDIRECT_URL` or `APP_BASE_URL`.
- `sync-user` failures: verify the Clerk secret key belongs to the same instance as the frontend publishable key.
