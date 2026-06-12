#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/medicore"

cd "$APP_DIR"
git pull origin main

"$APP_DIR/venv/bin/pip" install -r requirements.txt gunicorn
"$APP_DIR/venv/bin/python" manage.py migrate
"$APP_DIR/venv/bin/python" manage.py collectstatic --noinput

cd "$APP_DIR/frontend"
npm ci
npm run build

sudo systemctl restart medicore
sudo nginx -t
sudo systemctl reload nginx
