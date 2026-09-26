# backend

> **Pokket Pizza — REST API** (Node.js + Express)

Express REST API with a local seeded public menu route while database integration is being rolled out.

## Folder structure

```
backend/
├── src/
│   ├── config/         # env & app config
│   ├── controllers/    # route handler logic
│   ├── middleware/     # auth, error-handling, validation
│   ├── models/         # data models / DB schemas
│   ├── routes/         # Express router definitions
│   └── services/       # business logic, third-party integrations
├── .env.example        # copy → .env and fill in values
└── package.json
```

## Local menu API

Copy `.env.example` to `.env`, then start the API:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

In development, the public API serves the seeded menu fixture at:

- `GET http://localhost:4000/api/v1/menu`
- `GET http://localhost:4000/api/v1/products/:id`

The development route uses the same frozen contract as the Prisma-backed service. Replace it with the database repository before deploying to production.
