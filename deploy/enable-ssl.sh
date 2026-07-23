#!/usr/bin/env bash
# Run on the VPS after marryme.web.id DNS A record points to this server.
set -euo pipefail

DOMAIN="${DOMAIN:-marryme.web.id}"
EMAIL="${EMAIL:-admin@${DOMAIN}}"
PROJECT_DIR="${PROJECT_DIR:-/opt/wedding-summer}"

cd "$PROJECT_DIR"

echo "Stopping web container to free port 80 for certbot..."
docker compose stop web

certbot certonly --standalone \
  -d "$DOMAIN" \
  --agree-tos \
  --email "$EMAIL" \
  --non-interactive \
  --keep-until-expiring

echo "Switching nginx config to SSL..."
docker compose build --build-arg NGINX_CONF=nginx.docker.conf web
docker compose up -d web

# Enable secure cookies for admin session
if grep -q '^COOKIE_SECURE=' server/.env.docker; then
  sed -i 's/^COOKIE_SECURE=.*/COOKIE_SECURE=true/' server/.env.docker
else
  echo 'COOKIE_SECURE=true' >> server/.env.docker
fi
docker compose up -d api

# Renewal cron (idempotent)
CRON_LINE="0 3 * * * certbot renew --quiet --deploy-hook 'cd $PROJECT_DIR && docker compose restart web'"
(crontab -l 2>/dev/null | grep -v 'certbot renew' || true; echo "$CRON_LINE") | crontab -

echo "SSL enabled for https://$DOMAIN"
curl -sS "https://$DOMAIN/api/health" || true
