# Environment Setup

This document is the single source for local environment configuration.

## Backend (`backend/EWHQ.Api/.env`)
Copy:
```bash
cp backend/EWHQ.Api/.env.example backend/EWHQ.Api/.env
```

Required groups:
- Database: `DB_*`, `ADMIN_DB_*`, `DB_PROVIDER`
- Auth0 API validation: `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`
- Auth0 management: `AUTH0_MANAGEMENT_API_ID`, `AUTH0_MANAGEMENT_API_SECRET`
- Auth0 app IDs: `AUTH0_ADMIN_CLIENT_ID` (and optional `AUTH0_CLIENT_ID` fallback)
- Auth0 DB reset connection: `AUTH0_DB_CONNECTION`
- Email: `SENDGRID_API_KEY`

## Frontend (`frontend-hq-portal/.env`)
Copy:
```bash
cp frontend-hq-portal/.env.example frontend-hq-portal/.env
```

Required vars:
- `VITE_API_URL` (example: `http://localhost:5125/api`)
- `VITE_AUTH0_DOMAIN`
- `VITE_AUTH0_CLIENT_ID`
- `VITE_AUTH0_AUDIENCE`
- `VITE_AUTH0_REDIRECT_URI` (example: `http://localhost:5173/callback`)
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
- This repo uses Auth0-only authentication; local username/password backend login is not used.
