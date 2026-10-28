# DropLink on Cloudflare (guest-only deployment)

This deployment profile replaces the Node/Express + MySQL runtime with a Cloudflare Worker, D1 metadata database, and R2 object storage. It does not use accounts or OAuth; a random, HttpOnly browser cookie owns the visitor's files. Anyone with a share URL can view/download the file, while only the browser holding the ownership cookie can list or delete it.

## 1. Prerequisites

- A Cloudflare account with Workers, D1, and R2 enabled.
- Node.js 20+ and npm/pnpm locally.
- Wrangler authentication: `npx wrangler login`.

## 2. Create Cloudflare resources

From the project root:

```bash
npx wrangler r2 bucket create droplink-files
npx wrangler d1 create droplink-db
```

Copy the `database_id` from the D1 command into `cloudflare/wrangler.toml`, replacing `REPLACE_WITH_D1_DATABASE_ID`.

Apply the database schema:

```bash
npx wrangler d1 migrations apply droplink-db --remote --config cloudflare/wrangler.toml
```

## 3. Build and deploy

```bash
npm install
npm run cf:deploy
```

The Worker serves the built SPA and API from one origin. The frontend's guest upload/list/delete/preview flows use the Worker REST API. The legacy Node/tRPC runtime remains in the repository for reference but is not part of this Cloudflare deployment path.

For local development against Cloudflare bindings, use `npm run cf:dev` after setting the D1 database ID and creating the bucket. Use `npx wrangler d1 migrations apply droplink-db --local --config cloudflare/wrangler.toml` for a local D1 schema.

## 4. Limits and production hardening

- The default upload limit is 100 MiB. Adjust `MAX_FILE_SIZE_MB` in `cloudflare/wrangler.toml` (maximum 500 MiB in this configuration) and review current Cloudflare Worker/R2 request limits for your account before raising it.
- The browser ownership cookie is HttpOnly, Secure, and SameSite=Lax. Clearing browser cookies means losing management access to that browser's uploaded files; public share links continue to work.
- Add Turnstile verification and rate limiting before opening the service widely. `TURNSTILE_ENABLED` is currently false and is a deployment placeholder, not an active challenge.
- Public share URLs intentionally expose uploaded content to anyone who has the URL. Do not upload private or sensitive files.
- Add lifecycle rules in R2 and a scheduled cleanup for expired upload intents. Consider abuse reporting, quota controls, malware scanning, and retention/deletion policies before production use.
- Cloudflare resources must be created in your account and the deployment command must succeed before the site is live. This repository change alone does not publish the site.
