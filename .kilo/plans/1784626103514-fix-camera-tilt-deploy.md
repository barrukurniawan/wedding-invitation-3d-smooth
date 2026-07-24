# Fix Camera Tilt: Deploy Commit 8c2d5c7 to VPS

## Problem
Camera on mobile is tilted to the right ("miring ke kanan") because the VPS is still running commit `1356a9f` which has `MOBILE_CAM_LEFT = 1.6` and `MOBILE_LOOK_RIGHT = 1.2` offsets in `CameraRig.svelte`. The fix in commit `8c2d5c7` removed these offsets but was never deployed.

## Steps

1. **rsync** local → VPS (exclude node_modules, build, .git, .env, server/.env.docker)
2. **Restore secrets** on VPS: merge `MYSQL_ROOT_PASSWORD` + `MYSQL_PASSWORD` from `/root/.wedding-secrets/credentials.txt` into `.env`
3. **Rebuild web container** with SSL: `docker compose build --no-cache --build-arg NGINX_CONF=nginx.docker.conf web`
4. **Restart**: `docker compose up -d web`
5. **Verify**: 
   - `docker compose ps` — all containers up
   - `curl -s https://marryme.web.id/api/health` → 200
   - Frontend loads at https://marryme.web.id
   - Camera on mobile should be centered (no right tilt)

## Key Files
- `src/lib/components/threed/CameraRig.svelte` — the changed file (commit 8c2d5c7)
