# Backend-Frontend Integration Guide

## Overview
`ewhq-new` currently integrates:
- Backend: `backend/EWHQ.Api` on `http://localhost:5125`
- Frontend: `frontend-hq-portal` (Vite, React) on `http://localhost:5173`

Authentication is Clerk-based.  
Do not use or document `/api/auth/login` in this repo.

## Architecture

```
Clerk Hosted/Auth Components
        |
        v
Frontend HQ Portal (5173)
  - @clerk/react
  - on-demand Clerk session token retrieval
  - fetch API clients
        |
        v
Backend API (5125)
  - Clerk.BackendAPI request authentication
  - /api/auth/sync-user + /api/auth/profile
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
- `CLERK_SECRET_KEY`
- `CLERK_ALLOWED_PARTIES`
- database vars (`DB_*`, `ADMIN_DB_*`)
- `SENDGRID_API_KEY`

Optional backend auth extras:
- `CLERK_JWT_KEY`
- `CLERK_MACHINE_SECRET_KEY`
- `CLERK_AUDIENCES`
- `CLERK_INVITATION_REDIRECT_URL`

### Frontend (`frontend-hq-portal/.env`)
- `VITE_API_URL=http://localhost:5125/api`
- `VITE_CLERK_PUBLISHABLE_KEY=<clerk-publishable-key>`
- `VITE_APP_NAME` (optional branding)

## Auth Flow

1. User opens `/login` and authenticates with Clerk.
2. Frontend requests a Clerk session token when calling the API.
3. Frontend calls:
   - `POST /api/auth/sync-user`
   - `GET /api/auth/profile`
4. Backend verifies the Clerk token, syncs the local HQ profile, and adds local role claims.
5. `ProtectedRoute` checks profile and tenant association.
6. If no tenant association, user is redirected to `/onboarding`.

## Core Integration Endpoints
- `POST /api/auth/sync-user`
- `GET /api/auth/profile`
- `PUT /api/auth/profile`
- `POST /api/auth/change-password`
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
API_TOKEN="<access-token>" ./test-auth.sh
```

## Troubleshooting
- `401` on API calls: confirm `CLERK_SECRET_KEY`, `CLERK_ALLOWED_PARTIES`, and the frontend publishable key belong to the same Clerk instance.
- Invite links not landing in the app: confirm `CLERK_INVITATION_REDIRECT_URL` or `APP_BASE_URL` is correct.
- `/onboarding` after successful login: check `GET /api/auth/profile` and tenant associations.
