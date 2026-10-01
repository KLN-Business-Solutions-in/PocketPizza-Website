# Pokket Pizza - Database Documentation

## Database Stack

- PostgreSQL
- Prisma ORM
- Neon PostgreSQL
- Separate development and production database projects

## Environment Separation

Pokket Pizza uses separate databases for development and production.

- Development database: used for development, testing, migrations, and seed data.
- Production database: separate Neon project reserved for the live application.

The production database must not be used for local development or testing.

Database connection strings are secrets and must never be committed to Git or shared in public documentation.

## Restaurant Site Content

`Restaurant` carries the public About/Contact content served by `GET /api/v1/restaurant`.

- `aboutText`, `openingHours`, `socialLinks`, `mapLat`, `mapLng`, `whatsappNumber`
- All nullable. The column add is a safe migration on a non-empty table, and the
  API returns `null` rather than failing when content is unpublished.
- `openingHours` and `socialLinks` are `JSONB`. They are **not** arbitrary
  blobs: entries are validated at the API boundary against the Zod schemas in
  `shared/contract/contract.ts` (`openingHoursEntrySchema`, `socialLinkSchema`).
  A malformed entry is dropped from the response; the rest of the content still
  renders.
- `mapLat` and `mapLng` are only returned as a map when **both** are set. A
  half-set pair yields `null`, because a single coordinate cannot be embedded.
- These columns are customer-facing only. `deliveryFee`, `AdminUser` fields and
  anything else non-public must never be added to this endpoint's select list.

## Admin Password Storage

Admin passwords are never stored as plaintext.

The application stores only a cryptographic password hash in:

`AdminUser.passwordHash`

Passwords must be hashed using the password-hashing algorithm used by the Backend authentication implementation before being stored in PostgreSQL.

During login, the Backend authentication flow should verify the submitted password against the stored password hash. The original plaintext password cannot be recovered from the database.

## Password Security Rules

- Never store plaintext passwords in PostgreSQL.
- Never include plaintext passwords in seed data intended for production.
- Never log plaintext passwords.
- Never commit passwords, password hashes intended as credentials, or database connection strings to Git.
- Secrets must be supplied through environment variables or an approved secret-management system.
- Production credentials must be kept separate from development credentials.

## Production Database

A separate Neon project named `pokket-pizza-production` has been provisioned for production.

As of Day 4, the production database is intentionally left empty. Migrations and production data will be handled during the later production stages of the sprint.

The production `DATABASE_URL` must only be provided to authorized backend/deployment environments and must never be exposed to the frontend.