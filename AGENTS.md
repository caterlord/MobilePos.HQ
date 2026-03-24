# Repository Guidelines

## Project Structure & Module Organization
`backend/EWHQ.Api` is the .NET 9 service layer; its `Controllers/`, `Services/`, and `Migrations/` folders define the API surface, while companion docs live in `backend/EWHQ.Api/docs/`. Supporting utilities (`EWHQ.DbContextGenerator`, `EWHQ.SchemaConverter`) keep schemas in sync and should evolve together with the API. `frontend-hq-portal` (React 18) serves customers, `frontend-internal-admin` (React 19) powers staff tools, and the root `docs/` and `scripts/` directories capture architectural context and Auth0 automation.

## Build, Test, and Development Commands
- `dotnet restore && dotnet run --project backend/EWHQ.Api` starts the API on port 5125, loading configuration from a local `.env`.
- `npm install && npm run dev` inside each frontend folder launches the Vite dev servers (ports 5173 and 5174 by default).
- `npm run build` in both frontends and `dotnet publish -c Release backend/EWHQ.Api` validate production bundles before reviews.
- Bash probes such as `backend/EWHQ.Api/test-auth.sh` and `test-pending-invitations.sh` exercise high-risk flows; keep them updated when endpoints change.

## UI Design Guidelines
Before building any frontend UI, read and follow `docs/UI_GUIDELINES.md`. It defines which data grid component to use (Simple Table vs DataTable), page structure patterns, form patterns, and notification conventions. All frontend pages must adhere to these guidelines for consistency.

## Coding Style & Naming Conventions
Backend code follows standard C# conventions: PascalCase types, camelCase locals, DI-friendly constructors, and nullable reference types enabled—prefer `async` methods and guard clauses over nested conditionals. Frontend code uses TypeScript with functional components, two-space indentation, PascalCase component files, camelCase utilities, and Tailwind classes grouped by layout → spacing → color. Run `npm run lint` in each UI package; avoid `eslint-disable` comments unless the alternative is documented.

## Testing Guidelines
Add .NET tests in a sibling project (e.g., `backend/EWHQ.Api.Tests`) and run them with `dotnet test`; aim to cover new services and any controller branches you touch. For the web apps, enable Vitest (`npm run test` once configured) for unit coverage and lean on the repo-level Playwright dependency for end-to-end checks (`npx playwright test`). Enhance or add bash probes whenever you expose new external flows, and note expected fixtures in script comments.

## Commit & Pull Request Guidelines
Commit messages follow Conventional Commits (`feat:`, `refactor:`, etc.); scope directories when helpful (`feat(frontend-hq-portal): …`). Keep commits focused, include API payload examples when contracts change, and re-run builds before pushing. Pull requests must link the driving ticket, summarize risk, list the commands you ran, and attach UI screenshots for meaningful frontend updates.

## Security & Configuration Tips
Never commit `.env` files; rely on DotNetEnv locally and environment variables in deployment. Document new Auth0 or database keys in `backend/EWHQ.Api/docs/AUTHENTICATION_SETUP.md`. Use the utilities in `scripts/` when modifying Auth0 resources, and regenerate SQL artifacts instead of editing them inline.
