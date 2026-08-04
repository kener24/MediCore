#!/usr/bin/env bash
set -Eeuo pipefail

STATUS_FILE="${MEDICORE_BACKUP_STATUS_FILE:-/var/lib/medicore/backup-status.json}"
BASE_URL="${MEDICORE_PUBLIC_URL:-https://kp-software.tech}"
MAX_BACKUP_AGE="${MEDICORE_MAX_BACKUP_AGE_SECONDS:-93600}"

curl --fail --silent --show-error --max-time 10 "$BASE_URL/health/live/" >/dev/null
curl --fail --silent --show-error --max-time 10 "$BASE_URL/health/ready/" >/dev/null
systemctl is-active --quiet medicore nginx mysql

DISK_USED="$(df -P / | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
[[ "$DISK_USED" -lt 90 ]] || { echo "Critical disk usage: ${DISK_USED}%" >&2; exit 1; }
[[ -s "$STATUS_FILE" ]] || { echo "Backup status is missing." >&2; exit 1; }
python3 - "$STATUS_FILE" "$MAX_BACKUP_AGE" <<'PY'
import datetime as dt
import json
import sys

payload = json.load(open(sys.argv[1], encoding="utf-8"))
if payload.get("status") != "verified":
    raise SystemExit("Latest backup is not verified")
created = dt.datetime.fromisoformat(payload["created_at"].replace("Z", "+00:00"))
age = (dt.datetime.now(dt.timezone.utc) - created).total_seconds()
if age > int(sys.argv[2]):
    raise SystemExit(f"Latest backup is stale: {int(age)} seconds")
PY
