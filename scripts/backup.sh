#!/bin/bash
# Writes a new private archive; never overwrites an existing backup.
set -euo pipefail
umask 077
: "${DATABASE_URL:?Set DATABASE_URL explicitly}"
backup_file=${1:?Usage: backup.sh NEW_ARCHIVE_PATH}
if [[ -e "$backup_file" ]]; then echo 'Backup path already exists.' >&2; exit 1; fi
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file="$backup_file"
