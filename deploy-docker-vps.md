# Deploy Wedding-summer to VPS with Docker

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
