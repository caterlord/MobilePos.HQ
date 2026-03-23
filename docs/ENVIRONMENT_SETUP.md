# Environment Setup

This document is the single source for local environment configuration.

## Backend (`backend/EWHQ.Api/.env`)
Copy:
```bash
cp backend/EWHQ.Api/.env.example backend/EWHQ.Api/.env
```

Required groups:
- Database: `DB_*`, `ADMIN_DB_*`, `DB_PROVIDER`
- Clerk auth: `CLERK_SECRET_KEY`, `CLERK_ALLOWED_PARTIES`
- Email: `SENDGRID_API_KEY`
- Azure audit (optional): `AZURE_LOG_AUDIT_*`
- Azure Monitor request telemetry (optional): `APPLICATIONINSIGHTS_CONNECTION_STRING`, `AZURE_MONITOR_*`
- Azure audit provisioning runbook: [AZURE_LOG_ANALYTICS_SETUP_GUIDE.md](/Users/michaelyung/RiderProjects/ewhq-new/docs/execution-plan/AZURE_LOG_ANALYTICS_SETUP_GUIDE.md)

Optional Clerk backend vars:
- `CLERK_JWT_KEY`
- `CLERK_MACHINE_SECRET_KEY`
- `CLERK_AUDIENCES`
- `CLERK_INVITATION_REDIRECT_URL`

## Frontend (`frontend-hq-portal/.env`)
Copy:
```bash
cp frontend-hq-portal/.env.example frontend-hq-portal/.env
```

Required vars:
- `VITE_API_URL` (example: `http://localhost:5125/api`)
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_APP_NAME` (optional branding)

## Start Commands
Backend:
```bash
dotnet restore
dotnet run --project backend/EWHQ.Api
```

Frontend:
```bash
cd frontend-hq-portal
npm install
npm run dev
```

## Notes
- Never commit `.env` files.
- This repo uses Clerk for authentication; local username/password backend login is not used.
- DB-backed HQ settings audit table writes are currently disabled; use Azure Log Analytics audit flow for ongoing rollout.
