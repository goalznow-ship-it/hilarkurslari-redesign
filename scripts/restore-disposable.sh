#!/bin/bash
# Only an explicitly named, empty local disposable database may be restored.
set -euo pipefail
: "${RESTORE_DATABASE_URL:?Set RESTORE_DATABASE_URL explicitly}"
restore_archive=${1:?Usage: restore-disposable.sh ARCHIVE_PATH}
node - <<'JS'
const url=new URL(process.env.RESTORE_DATABASE_URL);
if(!['localhost','127.0.0.1'].includes(url.hostname)||!['/hilal_restore','/hilal_restore_final'].includes(url.pathname))throw Error('Only explicitly allowed local disposable restore databases are allowed');
JS
restore_tables=$(psql "$RESTORE_DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")
if [[ "$restore_tables" != 0 ]]; then echo 'Restore target must be empty.' >&2; exit 1; fi
pg_restore --dbname="$RESTORE_DATABASE_URL" --single-transaction --exit-on-error --no-owner --no-privileges "$restore_archive"
