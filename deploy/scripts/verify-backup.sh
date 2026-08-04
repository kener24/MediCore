#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

BACKUP="${1:?Usage: verify-backup.sh BACKUP [KEY_FILE]}"
KEY_FILE="${2:-${MEDICORE_BACKUP_KEY_FILE:-/root/.config/medicore/backup.key}}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

[[ -s "$BACKUP" ]] || { echo "Backup is missing or empty." >&2; exit 1; }
[[ -s "$KEY_FILE" ]] || { echo "Encryption key is missing." >&2; exit 1; }
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -pass file:"$KEY_FILE" -in "$BACKUP" -out "$WORK/archive.tar"
tar -C "$WORK" -xf "$WORK/archive.tar"
(cd "$WORK" && sha256sum --check SHA256SUMS >/dev/null)
gzip -t "$WORK/database.sql.gz"
tar -tzf "$WORK/media.tar.gz" >/dev/null
[[ -s "$WORK/manifest.txt" ]]
date -u +%Y-%m-%dT%H:%M:%SZ
