# Backend-Frontend Integration Guide

## Overview
`ewhq-new` currently integrates:
- Backend: `backend/EWHQ.Api` on `http://localhost:5125`
- Frontend: `frontend-hq-portal` (Vite, React) on `http://localhost:5173`

Authentication is Auth0-only.  
Do not use or document `/api/auth/login` in this repo.

## Architecture

```
Auth0 Universal Login
        |
        v
Frontend HQ Portal (5173)
  - @auth0/auth0-react
  - localStorage auth0_token cache
  - fetch API clients
        |
        v
Backend API (5125)
  - JwtBearer Auth0 validation
  - /api/auth0/sync-user + /api/auth0/profile
  - tenant/invitation/user-access APIs
```

## Quick Start

### 1. Backend
```bash
dotnet restore
dotnet run --project backend/EWHQ.Api
```

### 2. Frontend
```bash
cd frontend-hq-portal
npm install
npm run dev
```

## Required Config

### Backend (`backend/EWHQ.Api/.env`)
- `AUTH0_DOMAIN`
- `AUTH0_AUDIENCE`
- `AUTH0_ADMIN_CLIENT_ID`
- `AUTH0_MANAGEMENT_API_ID`
- `AUTH0_MANAGEMENT_API_SECRET`
- database vars (`DB_*`, `ADMIN_DB_*`)

### Frontend (`frontend-hq-portal/.env`)
- `VITE_API_URL=http://localhost:5125/api`
- `VITE_AUTH0_DOMAIN=<tenant-domain>`
- `VITE_AUTH0_CLIENT_ID=<spa-client-id>`
- `VITE_AUTH0_AUDIENCE=<api-audience>`
- `VITE_AUTH0_REDIRECT_URI=http://localhost:5173/callback`

## Auth Flow (Current)

1. User opens `/login` and authenticates via Auth0 Universal Login.
2. Frontend receives Auth0 access token.
3. Frontend calls:
   - `POST /api/auth0/sync-user`
   - `GET /api/auth0/profile`
4. `ProtectedRoute` checks profile and tenant association.
5. If no tenant association, user is redirected to `/onboarding`.

## Core Integration Endpoints
- `POST /api/auth0/sync-user`
- `GET /api/auth0/profile`
- `PUT /api/auth0/profile`
- `POST /api/auth0/change-password`
- `GET /api/tenants/check-setup`
- `POST /api/tenants/setup`
- `GET /api/invitations/validate/{token}` (also `/api/invitation/validate/{token}`)
- `POST /api/invitations/accept` (also `/api/invitation/accept`)
- `GET /api/user-access/companies-brands`
- `POST /api/user-access/select-brand`

## Verification

Backend auth probe:
```bash
cd backend/EWHQ.Api
AUTH0_TOKEN="<access-token>" ./test-auth.sh
```

## Troubleshooting
- `401` on API calls: check Auth0 audience/domain values on both backend and frontend.
- Redirect loop `/login` <-> `/callback`: confirm `VITE_AUTH0_REDIRECT_URI` matches Auth0 app config.
- `/onboarding` after successful login: check `GET /api/auth0/profile` and tenant associations.
