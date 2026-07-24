# Deploy development_stage_new to VPS

## VPS
- SSH: `root@95.135.208.186`
- Path: `/opt/wedding-summer`
- Domain: https://marryme.web.id (SSL aktif, certbot)

## Steps

1. **Pull latest** `development_stage_new` locally
2. **rsync** local → VPS (exclude node_modules, build, .git, .env, server/.env.docker)
3. **Restore secrets** di VPS: merge `MYSQL_ROOT_PASSWORD` + `MYSQL_PASSWORD` dari `/root/.wedding-secrets/credentials.txt` ke `.env`, pastikan `server/.env.docker` ada
4. **Rebuild web** container (`docker compose build --no-cache --build-arg NGINX_CONF=nginx.docker.conf web`)
5. **Restart** `docker compose up -d web`
6. **Verify**: `docker compose ps`, `curl https://marryme.web.id/api/health`, frontend 200

## Notes
- SSL sudah aktif (Let's Encrypt cert di `/etc/letsencrypt/live/marryme.web.id/`)
- `COOKIE_SECURE=true` sudah di-set
- Auto-renewal cron sudah terpasang
- Build arg `NGINX_CONF=nginx.docker.conf` diperlukan untuk SSL config
