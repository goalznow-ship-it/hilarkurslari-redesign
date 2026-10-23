# PostgreSQL backup, restore and retention

Status: local disposable backup/restore and cleanup VERIFIED. Production schedule, off-site encryption, key custody and restore drills are NOT IMPLEMENTED/NOT VERIFIED by this task. No production database was accessed or restored.

## Backup

Supply DATABASE_URL privately; never put it into Git, shared logs or command transcripts. Run `bash scripts/backup.sh NEW_ARCHIVE_PATH` in an approved environment. It creates a custom-format pg_dump archive with private umask and refuses to overwrite an existing path. Archives contain sensitive business data and authentication material; encrypt before off-site transfer. Local file permissions are not encryption.

Check archive integrity with `pg_restore --list` and perform regular disposable restore drills. Choose retention, encrypted storage and operators based on the organization's recovery objectives. No cron job or automated remote backup was installed here.

## Restore drill

Use a newly created, empty local database. `scripts/restore-disposable.sh` accepts only explicitly allowed local `hilal_restore` / `hilal_restore_final` targets. Set RESTORE_DATABASE_URL privately and run `bash scripts/restore-disposable.sh ARCHIVE_PATH`.

The script rejects nonempty targets and uses `pg_restore --single-transaction --exit-on-error --no-owner --no-privileges`. It never drops, truncates or cleans a database. A production restore requires a separately reviewed operator procedure, maintenance plan and explicit authorization; this script deliberately cannot do it.

Actual drill: custom archive restored to a second local PostgreSQL database; all 13 model counts and all 7 migration records matched. `tests/restore-check.mjs` verifies that disposable fixture. This is not evidence of encrypted off-site backups, a production RPO/RTO, or a live scheduled service.

## Cleanup

Supply DATABASE_URL explicitly and run `bash scripts/cleanup.sh`. Only expired RateLimitEntry and Session records are deleted. Attempts, exam versions, results, sales and review history are retained. `tests/operations.mjs` seeded expired and valid records and verified that valid entries and historical counts remained unchanged.

Staff setup tokens expire by server validation; only hashes are retained. Re-issuing setup invalidates unused prior tokens. No history-deletion retention policy is applied automatically.

## Abandoned attempts

The authenticated finalize-expired endpoint processes up to 100 expired attempts per call using saved answers and idempotent grading transactions. It can also be called by an externally configured scheduler with an independent CRON_SECRET. Check both finalized and failed counts; investigate failures instead of deleting records. No production scheduler has been configured.

## Deployment requirements

Use least-privileged database credentials appropriate to migration/runtime duties, connection pooling suitable for instance count, encrypted transport, private credentials, tested restore ownership, and monitoring. Verify reverse-proxy access logs redact capability query strings. Real infrastructure configuration and load testing require separate authorized deployment work.
