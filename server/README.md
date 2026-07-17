# Wedding API

## Local setup

1. Create a MySQL database and application user.
2. Import `../database/schema.sql` for a fresh database. For an existing database that still has `admin_password`, run `../database/migrations/002_admin_auth.sql` once instead.
3. Copy `.env.example` to `.env`, then replace every placeholder with real values.
4. Install dependencies with `npm ci`.
5. Create or reset the initial admin account:

```bash
ADMIN_INITIAL_USERNAME=admin ADMIN_INITIAL_PASSWORD='use-a-long-unique-password' npm run seed-admin
```

6. Run `npm run dev`, then run the frontend with `npm run dev` at the repository root.

Vite proxies browser requests from `/api` to `http://127.0.0.1:3001`. In production, Nginx provides the same proxy and the API binds only to localhost.

## Production checklist

- Set `NODE_ENV=production` and `COOKIE_SECURE=true` only after HTTPS is enabled.
- Keep `server/.env` outside Git and set permissions to `600`.
- Use a dedicated MySQL account; never use MySQL root for the app.
- Run `pm2 start deploy/ecosystem.config.cjs` from the repository root after setting the `cwd` path for the VPS.
