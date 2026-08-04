#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

APP_DIR="${MEDICORE_APP_DIR:-/var/www/medicore}"
BACKUP="${1:-$(find "${MEDICORE_BACKUP_ROOT:-/var/backups/medicore}/daily" -type f -name '*.enc' -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)}"
KEY_FILE="${2:-${MEDICORE_BACKUP_KEY_FILE:-/root/.config/medicore/backup.key}}"
TEST_DB="medicore_restore_test_$(date -u +%Y%m%d%H%M%S)"
WORK="$(mktemp -d)"
STARTED="$(date +%s)"

cleanup() {
  mysql -e "DROP DATABASE IF EXISTS \`$TEST_DB\`;" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

[[ "$EUID" -eq 0 ]] || { echo "This script must run as root." >&2; exit 1; }
"$APP_DIR/deploy/scripts/verify-backup.sh" "$BACKUP" "$KEY_FILE" >/dev/null
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -pass file:"$KEY_FILE" -in "$BACKUP" -out "$WORK/archive.tar"
tar -C "$WORK" -xf "$WORK/archive.tar"
tar -C "$WORK" -xzf "$WORK/media.tar.gz"
mysql -e "CREATE DATABASE \`$TEST_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
gzip -dc "$WORK/database.sql.gz" | mysql "$TEST_DB"

TABLES="$(mysql -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$TEST_DB';")"
[[ "$TABLES" -ge 60 ]] || { echo "Restore has an unexpected table count: $TABLES" >&2; exit 1; }
for table in clinics_clinic accounts_user patients_patient appointments_appointment medical_records_clinicalconsultation billing_invoice billing_payment inventory_inventoryitem hospitalization_hospitalization audit_auditlog; do
  mysql -N -B "$TEST_DB" -e "SELECT '$table', COUNT(*) FROM \`$table\`;"
done

DB_NAME="$TEST_DB" DB_USER=root DB_PASSWORD='' DB_HOST=localhost \
  "$APP_DIR/venv/bin/python" "$APP_DIR/manage.py" audit_media_integrity --json --media-root "$WORK/media"

ELAPSED="$(( $(date +%s) - STARTED ))"
printf '{"status":"passed","database":"isolated","tables":%s,"duration_seconds":%s,"completed_at":"%s"}\n' \
  "$TABLES" "$ELAPSED" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
