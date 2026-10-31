# Stockroom team integration plan

This handover reflects the current implementation and the MySQL workflow checks completed on 2026-10-31. It preserves the agreed owners and sets file boundaries to reduce concurrent edits.

## Shared setup

Prerequisites: Node.js 20+, npm and Docker Desktop with Compose.

1. From the repository root, start MySQL: `docker compose up -d mysql`; confirm it is healthy with `docker compose ps`.
2. Copy `server/.env.example` to `server/.env`. Set a private `JWT_SECRET` of at least 32 characters and a strong `SEED_ADMIN_PASSWORD`. Keep the file local.
3. Run `cd server && npm install && npm run migrate && npm run seed && npm test`.
4. Start the API in that terminal with `npm run dev`.
5. In another terminal, copy `client/.env.example` to `client/.env.local`, set `VITE_DATA_SOURCE=api` and `VITE_API_BASE_URL=http://localhost:3000/api/v1`, then run `cd client && npm install && npm run dev`.
6. Sign in using `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from the local server env file and workspace slug `default`.

To work on the frontend without the API, omit `VITE_DATA_SOURCE` or set it to `sample`. Sample mode is independent and browser-session-only. Never place credentials, tokens or secrets in `VITE_*` values.

## Ownership and boundaries

### Vittal — Frontend and Dashboard

**Primary files:**

- `client/src/App.jsx`, `client/src/App.css`, `client/src/index.css`
- `client/src/layout/`
- `client/src/features/dashboard/`
- `client/src/hooks/`
- `client/src/lib/currency.js`
- `client/src/services/api/index.js` for provider selection and shared frontend integration boundaries

**Already implemented:** responsive application shell, protected API-mode entry, navigation, dashboard KPI cards, database-backed chart/alerts/activity, theme control, sample/API provider selection and INR display formatter.

**Verify:** login/logout in API mode, dashboard values against `/api/v1/dashboard/overview`, sample mode without a server, route/theme behavior, narrow viewport behavior and `formatCurrency` output (`₹12,45,000.00`). Keep dashboard-only presentation logic in the dashboard feature. Coordinate any API response changes with Vishnu before changing shared provider mappings.

**Run:** `cd client && npm run dev`; verify locally at Vite's printed URL. Static checks: `npm run lint && npm test && npm run build`.

### Sanjana — Product and Stock Management

**Primary files:**

- `client/src/features/inventory/Inventory.jsx`
- `client/src/features/stock/StockMovementsPage.jsx`
- `client/src/components/ProductFormModal.jsx`
- `client/src/components/ProductTable.jsx`
- `server/src/services/stock.js` for stock-domain transaction behavior, coordinated with Vishnu

**Already implemented:** product/category list, create, edit and deactivate flows; search, filters and paging; stock receipt, issue and adjustment ledger; quantity validation, transaction locking, idempotency and low-stock notifications.

**Verify:** product edits preserve omitted values (especially reorder point), category/supplier references stay workspace-scoped, available stock cannot go negative, adjustment reasons are required, duplicate retries do not double-apply, and reported on-hand quantities agree with the movement ledger. Product and stock route declarations live in Vishnu's shared `server/src/routes/api.js`; send route/schema changes to Vishnu rather than editing that file concurrently.

**Run:** start MySQL/API and frontend using Shared setup, then use Inventory and Stock movements in API mode. Backend unit checks: `cd server && npm test`.

### Vishnu — Backend and API

**Primary files:**

- `server/src/app.js`, `server/src/index.js`
- `server/src/routes/api.js` (shared route registry; Vishnu is the merge owner)
- `server/src/middleware/`, `server/src/utils/`
- `server/src/config/database.js`
- `server/src/services/analytics.js`
- `client/src/services/api/httpClient.js`, `client/src/services/api/httpProvider.js`, `client/src/services/api/normalizers.js`
- `docs/api-contracts.md`

**Already implemented:** Express `/api/v1`, bearer sessions and revocation, current-role authorization, request validation, common errors/request IDs, CRUD routes, analytics, report export and frontend HTTP adapter. Strict MySQL date grouping and database workflow query mismatches found in handover checks have been fixed.

**Verify:** every route remains workspace-scoped, authorization is enforced server-side, error logs include request reference without credentials, mutations validate inputs and transaction boundaries, list routes return `{items,page,pageSize,total,totalPages}`, date-only fields remain `YYYY-MM-DD`, and browser API errors do not fall back to sample data.

**Run:** `cd server && npm run migrate && npm test && npm run dev`; API health: `http://localhost:3000/health`.

### Aakarshi — Database and Supplier Management

**Primary files:**

- `database/schema/001_initial.sql` through `database/schema/006_expiry_batch_updated_at.sql`
- `server/src/services/repository.js` for shared database resource queries (coordinate product changes with Sanjana/Vishnu)
- Supplier schema/query changes proposed through `server/src/routes/api.js` to Vishnu, who owns integrating the shared route registry
- `docs/database-design.md`

**Already implemented:** workspace-scoped supplier/category/product/order relationships, indexes and constraints, migrations 001–006, supplier create/edit/deactivate and search/pagination. Migration 005 changes defaults and the explicitly seeded demo product only; migration 006 matches the batch service's timestamp update.

**Verify:** rerunning migrations is safe, all required foreign keys and uniqueness rules match actual operations, seed is idempotent, supplier references remain valid for products and purchase orders, and date/money fields match the API contract. Do not mass-convert stored prices; only explicitly identified demo values may be changed as sample data.

**Run:** `docker compose up -d mysql`; `cd server && npm run migrate && npm run seed`; inspect the live schema using the local MySQL client or migration queries. Run `npm run dev` to exercise supplier APIs.

### Kayalvizhi — Transactions, Reports and Testing

**Primary files:**

- `client/src/features/purchases/PurchasesPage.jsx`
- `client/src/features/reports/Reports.jsx`, `client/src/features/reports/ReportMovementChart.jsx`
- `server/src/services/procurement.js`
- `server/src/services/expiryNotifications.js`
- `server/test/`
- `client/src/services/api/sampleProvider.test.js`, `client/src/services/api/httpClient.test.js`, `client/src/lib/currency.test.js`

**Already implemented:** purchase draft editing and state transitions, idempotent partial/full receipt, transactional stock and batch updates, batch expiry filters and scheduled expiry notifications, inventory report JSON/CSV/PDF, notification read state, frontend unit coverage and backend domain/API tests.

**Verify:** purchase state/quantity rules, receipt retries, purchase-line-to-batch linkage, FEFO stock-out, expiry boundaries and notification deduplication, report totals against database balances, exported INR grouping, and role/read access. Run the full MySQL workflow when changing persistence or transaction paths; existing `server/test` suites use mocked connections and do not themselves test MySQL.

**Run:** shared setup, then `cd client && npm test` and `cd server && npm test`; use API mode and a disposable workspace for database workflow checks.

## API and database conventions

- Base URL is `/api/v1`; session tokens are sent as `Authorization: Bearer <token>`. Login is `/auth/login`; logout revokes the active database session.
- Workspace identity comes from the authenticated session. Never authorize using a workspace ID supplied by the browser.
- List endpoints use the standard paginated envelope. Keep search, filters and paging parameters in sync with `docs/api-contracts.md` and the frontend normalizers.
- Use UUID identifiers, integer quantities, decimal monetary values, ISO date-only strings (`YYYY-MM-DD`) for dates and ISO-8601 UTC timestamps for instants. Display monetary values as INR using the shared `formatCurrency` utility; do not rewrite existing database amounts as part of presentation changes.
- Stock and purchase receipt operations are transactional and must carry a stable `Idempotency-Key`. Retries must not change balances a second time. Keep stock changes in the ledger path; do not patch balances directly from a screen.
- Update schema through the next numbered SQL migration, update `001_initial.sql` for new installs, and keep migrations rerunnable through `npm run migrate`. Seed records must stay clearly labelled and safe to rerun.
- Keep `application/problem+json` errors actionable and do not include credentials or SQL details in responses. Use the response request ID to find server logs.

## Integrating work safely

- The current shared checkout contains uncommitted project files. Do not run `git clean`, `git reset --hard`, or overwrite another person's files. Before team members begin parallel branch work, the maintainer should preserve/review this checkout and create a clean shared baseline; this handover does not commit or push it.
- Work in separate branches/worktrees once that baseline exists. Keep each change focused, pull/rebase from the agreed integration branch before merging, and resolve conflicts in a review rather than copying whole directories over another branch.
- Treat `server/src/routes/api.js`, `server/src/services/repository.js`, `client/src/App.jsx`, and `client/src/App.css` as shared hot spots. Vishnu integrates API route/schema edits; Aakarshi supplies migration/query changes as focused patches; feature owners keep module UI changes inside their primary feature files. Do not edit a shared hot spot simultaneously without a short owner agreement.
- Update API/database docs only when the contract or schema changes. Run the relevant tests and the full frontend lint/build before integration. Record whether a check used mocks or live MySQL; never report a mocked test as database verification.

## Handover verification snapshot

The live local MySQL container is healthy and migrations 001–006 and seed were verified. A temporary workspace was used and cleaned after exercising CRUD, filters/pagination, stock receipt/issue/adjustment and insufficient-stock rejection, purchase creation/edit/status/receipt/idempotency, expiry batch edits and alerts, reports and CSV/PDF exports, notification read states, user/role restrictions, login/logout and session revocation. Dashboard aggregates and INR were checked against live rows. Frontend tests, ESLint, production build and backend mocked tests passed. This is a local handover verification snapshot; rerun it after changing database behavior or before release.
