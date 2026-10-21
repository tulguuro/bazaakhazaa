#!/usr/bin/env bash
# One-time setup of the bazaakhazaa.world web server (Ubuntu, nginx).
# Expects nginx-bazaakhazaa.conf next to it. Safe to run again: it pulls
# the latest site and reloads nginx.
set -euo pipefail

SITE_DIR=/var/www/bazaakhazaa
REPO=https://github.com/tulguuro/bazaakhazaa.git
HERE="$(cd "$(dirname "$0")" && pwd)"

export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q nginx git certbot python3-certbot-nginx

if [ -d "$SITE_DIR/.git" ]; then
  git -C "$SITE_DIR" pull --ff-only
else
  git clone --depth 1 "$REPO" "$SITE_DIR"
fi

install -m 644 "$HERE/nginx-bazaakhazaa.conf" /etc/nginx/sites-available/bazaakhazaa
ln -sf /etc/nginx/sites-available/bazaakhazaa /etc/nginx/sites-enabled/bazaakhazaa
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

# Vultr images ship with ufw enabled for SSH only
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 'Nginx Full'
fi

echo "site ready: $(git -C "$SITE_DIR" log -1 --format='%h %s')"
