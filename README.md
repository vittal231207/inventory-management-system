# Stockroom

Stockroom is an inventory management application with a React/Vite client, an Express API, and MySQL 8. The client supports an independent sample-data mode and an authenticated API mode. Monetary values are presented in INR.

## Requirements

- Node.js 20 or newer and npm
- Docker Desktop with Docker Compose

## Start MySQL and prepare the API

From the repository root:

```sh
docker compose up -d mysql
docker compose ps
cp server/.env.example server/.env
```

Edit `server/.env` locally. Set `JWT_SECRET` to a private random value of at least 32 characters and set a strong `SEED_ADMIN_PASSWORD`. Do not commit this file. The Compose credentials are for local development only; change them before exposing the service or using non-disposable data.

In one terminal:

```sh
cd server
npm install
npm run migrate
npm run seed
npm test
npm run dev
```

Migrations are numbered in `database/schema/` and are safe to rerun through `npm run migrate`. Migration 005 changes INR defaults and updates only the explicitly seeded `DEMO-001` product in the `default` demo workspace. Migration 006 adds the batch update timestamp required by batch receiving and editing.

The API listens at `http://localhost:3000`; `GET /health` checks process readiness. Business endpoints require a database-backed bearer session.

## Start the frontend in API mode

In a second terminal:

```sh
cp client/.env.example client/.env.local
```

Set these values in `client/.env.local`:

```dotenv
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Then run:

```sh
cd client
npm install
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`) and sign in with the email and password configured in `server/.env`; use workspace slug `default`. The seed command creates the administrator and clearly labelled starter records. The password is never stored in this README or the checked-in environment example.

## Sample-data mode

Sample mode needs no API or database. Omit `VITE_DATA_SOURCE` or set it to `sample` in `client/.env.local`, then start the frontend with `npm run dev`. Sample changes live only in the current browser session and are not persisted to MySQL.

## Verification commands

```sh
cd client && npm test && npm run lint && npm run build
cd ../server && npm test
```

Backend automated tests use mocked database connections; they do not replace the MySQL workflow check. See [API contracts](docs/api-contracts.md), [database design](docs/database-design.md), and the [team integration plan](docs/team-integration-plan.md) for module behavior, schema and ownership.

## Current implementation and handover

API mode covers login/logout and session revocation, role-protected routes, products, categories, stock movements, suppliers, purchases and receipts, expiry batches, reports/exports, notifications and users. The dashboard uses database aggregates. The authenticated MySQL workflows, seeded administrator login, migrations, frontend and backend test suites, ESLint, production build, and browser dashboard were verified for this handover. The checked-in server tests remain unit tests with mocks; use the documented MySQL commands and team acceptance checks when changing database behavior.

See [team integration plan](docs/team-integration-plan.md) for exact file boundaries, verification responsibilities and local commands.
