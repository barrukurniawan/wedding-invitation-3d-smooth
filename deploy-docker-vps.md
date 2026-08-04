# Deploy Wedding-summer to VPS with Docker

> This document describes the current VPS state observed on 2026-08-04. Container ages, image tags, and commit IDs are volatile facts, not deployment guarantees.

## VPS Specs
- Ubuntu 24.04.4 LTS, kernel 6.8.0-134-generic
- RAM 5 GB, CPU 3 core, SSD 60 GB
- SSH: `root@95.135.208.186`
- Domain: `marryme.web.id` (already pointed to IP)

## Architecture

3 Docker containers via `docker compose`:

| Service | Image | Port | Role |
|---------|-------|------|------|
| `db` | `mysql:8.0` | 3306 (internal) | MySQL database `wedding_db` |
| `api` | Custom (Node 20 Alpine) | 3001 (internal) | Express.js backend |
| `web` | Custom (Nginx Alpine) | 80, 443 → host | Static SPA + reverse proxy `/api/` → api:3001 + SSL |

Nginx exposes ports 80/443. MySQL and API are internal only — communicate via Docker network.

## Files to Create

### 1. `docker-compose.yml` (project root)

Defines 3 services: `db`, `api`, `web` on a shared bridge network `wedding-net`.

- `db`: MySQL 8.0, volume `db_data` for persistence, healthcheck, init from `database/schema.sql`
- `api`: Build from `./server/Dockerfile`, depends on `db` healthy, env from `server/.env.docker`
- `web`: Build from `./Dockerfile.web`, depends on `api`, ports 80:80, 443:443, mounts certbot certs

### 2. `server/Dockerfile` (backend)

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache python3 make g++   # bcrypt native build deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=production
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
```

### 3. `Dockerfile.web` (frontend + Nginx)

Multi-stage build:
- **Stage 1 (build)**: Node 20 Alpine, copy project root, `npm ci`, `npm run build` → produces `build/` dir
- **Stage 2 (serve)**: Nginx Alpine, copy `build/` to `/usr/share/nginx/html`, copy `nginx.docker.conf`

### 4. `nginx.docker.conf` (for Docker container)

Adapted from existing `deploy/nginx.conf`:
- `listen 80` → redirect to HTTPS
- `listen 443 ssl` with Let's Encrypt certs
- `server_name marryme.web.id`
- `location /api/` → `proxy_pass http://api:3001`
- SPA fallback: `try_files $uri $uri/ /index.html`
- Static asset caching headers
- SSL hardening (protocols, headers, HSTS)

### 5. `server/.env.docker` (backend env — TEMPLATE, user fills passwords)

```
PORT=3001
NODE_ENV=production
DB_HOST=db
DB_PORT=3306
DB_USER=wedding
DB_PASSWORD=__REPLACE_WITH_STRONG_PASSWORD__
DB_NAME=wedding_db
SESSION_TTL_HOURS=12
COOKIE_SECURE=true
ADMIN_INITIAL_USERNAME=admin
ADMIN_INITIAL_PASSWORD=__REPLACE_WITH_STRONG_PASSWORD_12_CHARS__
```

### 6. `init-db/01-schema.sql`

Copy `database/schema.sql` content — MySQL Docker auto-executes in `/docker-entrypoint-initdb.d/`.

### 7. `.dockerignore` (project root)

```
node_modules/
build/
.svelte-kit/
.git/
.env
.env.*
!.env.example
server/node_modules/
server/.env
server/.env.docker
```

## Deployment Steps (executed on VPS via SSH)

### Step 1: SSH & install Docker
```bash
ssh root@95.135.208.186

apt update && apt upgrade -y
apt install -y docker.io docker-compose-plugin certbot
systemctl enable --now docker
```

### Step 2: Clone repo
```bash
git clone -b development_stage https://github.com/barrukurniawan/wedding-invitation-3d-smooth.git /opt/wedding-summer
cd /opt/wedding-summer
```

### Step 3: Create init-db directory & copy schema
```bash
mkdir -p init-db
cp database/schema.sql init-db/01-schema.sql
```

### Step 4: Create server/.env.docker with real credentials
```bash
# User edits this file to fill in passwords
cp server/.env.example server/.env.docker
nano server/.env.docker
# Change: DB_HOST=db, DB_PASSWORD=<real>, COOKIE_SECURE=true, ADMIN_INITIAL_PASSWORD=<real>
```

### Step 5: Get SSL certificate FIRST (before starting Nginx)
```bash
# Start only db + api first
docker compose up -d db api

# Get cert (certbot standalone on port 80)
certbot certonly --standalone -d marryme.web.id --agree-tos --email admin@marryme.web.id --non-interactive

# Certs now at: /etc/letsencrypt/live/marryme.web.id/
```

### Step 6: Build & start all containers
```bash
docker compose up -d --build
```

### Step 7: Seed admin user
```bash
docker compose exec api node scripts/seed-admin.js
```

### Step 8: Verify
```bash
docker compose ps                        # All 3 containers running
curl http://localhost/api/health         # API health check
curl -I https://marryme.web.id          # Frontend with SSL
```

### Step 9: Auto-renew SSL cron
```bash
# Add cron job for cert renewal
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker compose -f /opt/wedding-summer/docker-compose.yml restart web") | crontab -
```

### Step 10: Configure UFW firewall
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

## Resource Estimates

- MySQL: ~300 MB RAM (innodb-buffer-pool limited)
- Node.js API: ~150 MB RAM
- Nginx + SPA: ~50 MB RAM
- **Total: ~500 MB** — well within 5 GB VPS

## Post-Deploy TODO

- [ ] Replace placeholder QRIS/bank/wedding data via admin dashboard at `https://marryme.web.id/api/admin` (or wherever admin route is)
- [ ] Upload wedding photo and QRIS image
- [ ] Update Google Maps URL in admin config
- [ ] Monitor container logs: `docker compose logs -f`

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `docker-compose.yml` | Create | Orchestrate 3 services |
| `Dockerfile.web` | Create | Multi-stage: build SvelteKit + serve via Nginx |
| `server/Dockerfile` | Create | Node.js backend container |
| `nginx.docker.conf` | Create | Nginx config with SSL + proxy to api:3001 |
| `server/.env.docker` | Create (template) | Backend env vars (user fills passwords) |
| `init-db/01-schema.sql` | Create | MySQL schema initialization |
| `.dockerignore` | Create | Exclude unnecessary files from Docker context |

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| MySQL data lost on container restart | Named volume `db_data` persists |
| Build fails due to large glTF assets (~20MB) | Multi-stage build keeps final image small |
| bcrypt native module fails in Alpine | `python3 make g++` in server Dockerfile |
| Container OOM on 5GB VPS | MySQL buffer pool 256M, Node max-old-space 300M |
| SSL cert expires | Cron job auto-renews every 3 months |

## Current VPS State

- Host: Ubuntu 24.04.4 LTS, x86_64, kernel `6.8.0-134-generic`
- Resources: approximately 4.8 GiB RAM, 2 GiB swap, 58 GiB root disk with approximately 47 GiB free at last observation
- Docker Engine `29.6.2`; Docker Compose `v5.3.1`
- UFW is enabled with inbound deny by default; only TCP ports 22, 80, and 443 are allowed
- Public HTTPS health check: `curl -fsS https://marryme.web.id`
- API health check: `curl -fsS https://marryme.web.id/api/health`
- Wedding project: `/opt/wedding-summer`, branch `refactor`; an untracked `static/models/pemandu.glb` must be preserved
- AI project: `/opt/ai-workspace`; LiteLLM service remains active on the private Docker network and is not publicly exposed
- The one-shot `migrate` service is expected to remain `Exited (0)` after a successful deployment

## Hermes Operations

Hermes Agent replaced the custom Python Telegram bot on 2026-08-04. Hermes runs as the unprivileged `hermes` user under the systemd unit `hermes-gateway.service`. The replacement gateway uses Telegram long polling and is restricted to the configured numeric owner allowlist.

### Configuration and boundaries

- Hermes state: `/home/hermes/.hermes/`
- Hermes non-secret configuration: `/home/hermes/.hermes/config.yaml`
- Hermes secrets: `/home/hermes/.hermes/.env`, mode `0600`; never print, commit, or copy this file
- Hermes SSH identity: `/home/hermes/.ssh/id_ed25519`, used only for the `hermes-ops` account
- Hermes remote working directory: `/opt/wedding-summer`
- LiteLLM stays on the private `ai-workspace_default` Docker network; Hermes uses its private container address and does not publish a new host port
- Hermes does not mount the Docker socket or Wedding secret files
- The old `ai-workspace-telegram-bot` container is retired; do not start a second Telegram poller with the replacement token

### Safe checks

```bash
systemctl status hermes-gateway
journalctl -u hermes-gateway --since "-15 minutes" --no-pager
docker compose -f /opt/wedding-summer/docker-compose.yml ps -a
docker compose -f /opt/ai-workspace/docker-compose.yml ps
curl -fsS https://marryme.web.id
curl -fsS https://marryme.web.id/api/health
```

Use `hermes doctor` as the `hermes` user after upgrades. Logs are expected to be redacted, but operators must still avoid sending environment files, private keys, database data, or full secret-bearing logs to chat.

### Deployment and rollback

1. Snapshot Hermes state before upgrades, including `config.yaml`, cron, memory, skills, sessions, and pairing state. Keep snapshots outside Git.
2. Validate `hermes doctor`, a read-only terminal request, a Wedding health check, and an approval-gated harmless command in a disposable path.
3. Restart only `hermes-gateway.service` for Hermes changes. Confirm exactly one Telegram gateway is polling.
4. If rollback is required, stop Hermes, restore the custom bot configuration only with a newly verified token, and leave Hermes state intact. Do not remove Wedding containers, the named database volume, or the router.

Never run `docker compose down -v`, `docker system prune`, broad recursive ownership changes, unrestricted Docker access, firewall changes, or remote script piping from Telegram. Destructive cron jobs remain denied by default.

### Existing maintenance jobs

- `/usr/local/bin/healthcheck-wedding.sh` runs every five minutes
- Certbot renewal runs through the existing timer/cron configuration and restarts only Wedding `web` through its deploy hook
- Do not alter these jobs during Hermes maintenance unless separately approved
