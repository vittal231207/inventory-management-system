# Stockroom API

Express API mounted at `/api/v1`; MySQL migrations are in `../database/schema/`.

```sh
cp .env.example .env # configure DATABASE_URL, JWT_SECRET (32+ chars), and SEED_ADMIN_PASSWORD
npm install
npm run migrate
npm run seed
npm test
npm run dev
```

`GET /health` checks process readiness only. Business routes require a bearer token and active database session. Run migrations and seed against a disposable local database before using API mode. Current automated server tests use mocked connections and do not replace MySQL integration tests.
