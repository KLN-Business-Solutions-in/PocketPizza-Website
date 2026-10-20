-- Passwords are hashed in Postgres (bcrypt via pgcrypto) so the API can run
-- within the Cloudflare Workers free-plan CPU budget.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
