#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

APP_DIR="${MEDICORE_APP_DIR:-/var/www/medicore}"
DB_NAME="${MEDICORE_DB_NAME:-medicore_db}"
BACKUP_ROOT="${MEDICORE_BACKUP_ROOT:-/var/backups/medicore}"
STATUS_FILE="${MEDICORE_BACKUP_STATUS_FILE:-/var/lib/medicore/backup-status.json}"
KEY_FILE="${MEDICORE_BACKUP_KEY_FILE:-/root/.config/medicore/backup.key}"
VERIFY_SCRIPT="$APP_DIR/deploy/scripts/verify-backup.sh"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
CREATED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STAGE="$(mktemp -d)"
PLAIN_ARCHIVE="$STAGE/medicore-$STAMP.tar"
DAILY_DIR="$BACKUP_ROOT/daily"
FINAL="$DAILY_DIR/medicore-$STAMP.tar.enc"

write_status() {
  local state="$1" message="$2" verified_at="${3:-}"
  install -d -m 0750 "$(dirname "$STATUS_FILE")"
  printf '{"status":"%s","created_at":"%s","verified_at":%s,"message":"%s"}\n' \
    "$state" "$CREATED_AT" "$(if [[ -n "$verified_at" ]]; then printf '"%s"' "$verified_at"; else printf 'null'; fi)" "$message" \
    > "$STATUS_FILE.tmp"
  mv "$STATUS_FILE.tmp" "$STATUS_FILE"
  chmod 0640 "$STATUS_FILE"
}

cleanup() { rm -rf "$STAGE"; }
failed() { write_status "failed" "Backup process failed"; }
trap cleanup EXIT
trap failed ERR

[[ "$EUID" -eq 0 ]] || { echo "This script must run as root." >&2; exit 1; }
[[ -s "$KEY_FILE" ]] || { echo "Backup encryption key is missing." >&2; exit 1; }
command -v mysqldump >/dev/null
command -v openssl >/dev/null
command -v sha256sum >/dev/null

install -d -m 0700 "$DAILY_DIR" "$BACKUP_ROOT/weekly" "$BACKUP_ROOT/monthly"
exec 9>"$BACKUP_ROOT/.backup.lock"
flock -n 9 || { echo "Another backup is already running." >&2; exit 1; }

mysqldump --single-transaction --quick --routines --triggers --events \
  --set-gtid-purged=OFF "$DB_NAME" | gzip -9 > "$STAGE/database.sql.gz"
tar -C "$APP_DIR" -czf "$STAGE/media.tar.gz" media
tar -C / -czf "$STAGE/infrastructure.tar.gz" \
  etc/nginx/sites-available/medicore \
  etc/systemd/system/medicore.service \
  etc/systemd/system/medicore-notifications.service \
  etc/systemd/system/medicore-notifications.timer 2>/dev/null || true
printf 'created_at=%s\ndatabase=%s\nrelease=%s\n' \
  "$CREATED_AT" "$DB_NAME" "$(git -C "$APP_DIR" rev-parse --short HEAD 2>/dev/null || printf unknown)" \
  > "$STAGE/manifest.txt"
(cd "$STAGE" && sha256sum database.sql.gz media.tar.gz infrastructure.tar.gz manifest.txt > SHA256SUMS)
tar -C "$STAGE" -cf "$PLAIN_ARCHIVE" database.sql.gz media.tar.gz infrastructure.tar.gz manifest.txt SHA256SUMS
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 \
  -pass file:"$KEY_FILE" -in "$PLAIN_ARCHIVE" -out "$FINAL.tmp"
mv "$FINAL.tmp" "$FINAL"
chmod 0600 "$FINAL"

VERIFIED_AT="$($VERIFY_SCRIPT "$FINAL" "$KEY_FILE")"
write_status "verified" "Encrypted backup created and verified" "$VERIFIED_AT"

if [[ "$(date -u +%u)" == "7" ]]; then cp -p "$FINAL" "$BACKUP_ROOT/weekly/"; fi
if [[ "$(date -u +%d)" == "01" ]]; then cp -p "$FINAL" "$BACKUP_ROOT/monthly/"; fi
find "$DAILY_DIR" -type f -name '*.enc' -mtime +7 -delete
find "$BACKUP_ROOT/weekly" -type f -name '*.enc' -mtime +35 -delete
find "$BACKUP_ROOT/monthly" -type f -name '*.enc' -mtime +190 -delete

if [[ -n "${MEDICORE_OFFSITE_DIR:-}" && -d "$MEDICORE_OFFSITE_DIR" ]]; then
  install -m 0600 "$FINAL" "$MEDICORE_OFFSITE_DIR/$(basename "$FINAL")"
fi

trap - ERR
printf '%s\n' "$FINAL"
