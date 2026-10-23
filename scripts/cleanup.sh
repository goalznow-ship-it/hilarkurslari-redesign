#!/bin/bash
# Schedule explicitly in deployment; never delete attempts or historical results.
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL explicitly}"
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
WITH removed AS (DELETE FROM "RateLimitEntry" WHERE "resetAt" < NOW() RETURNING 1)
SELECT COUNT(*) AS expired_rate_limits_removed FROM removed;
WITH removed AS (DELETE FROM "Session" WHERE "expiresAt" < NOW() RETURNING 1)
SELECT COUNT(*) AS expired_sessions_removed FROM removed;
SQL
