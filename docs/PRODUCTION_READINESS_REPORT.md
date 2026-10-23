# Recovery implementation report — 2026-10-23

**NOT READY FOR PRODUCTION.** No commit, push, deployment or production data operation performed. Existing branding and prior uncommitted work preserved.

## Root causes and repairs

- StaffEnrollment existed in the schema, but restricted child-process generation returned an empty apparent success without refreshing Prisma artifacts. Supported `prisma generate --schema prisma/schema.prisma` with approved execution regenerated the imported default client; `scripts/verify-prisma-client.mjs` asserts the real delegate. No schema reset or destructive database operation needed.
- Inherited parent PostCSS configuration invoked Tailwind4 as a Tailwind3 plugin. Added local matching PostCSS plugin/config. Turbopack still fails with worker port EPERM; supported webpack build succeeds with TypeScript checks enabled.
- Runtime verification exposed refined Zod object composition, asynchronous handler assertions, rate-limit upsert contention and void-returning advisory-lock decoding. Fixed at responsible boundaries; retained business assertions.
- Fixed case-insensitive legacy login, session/reset credential race, stale exam/answer edits, cross-company ownership rechecks, seller inventory leakage/availability, public catalogue lifecycle mismatch and premature question exposure.
- Added seven ordered migrations, including staff enrollment, company questions, historical metadata, case-insensitive identifiers and backward-compatible year references. No silent merging/deletion of conflicting legacy records.

## Functional changes

Administrative pages now use `lib/backend-store.ts` and authenticated server state rather than authoritative browser storage. CRUD, question verification/import, staff, registries, tickets, results and reports use server validation. Transactions preserve history and prevent duplicate sale/start/submit races. ExamForm preserves IDs/revisions and awaits persistence. Failed network/storage operations do not report success.

Staff enrollment stores token hashes, expires tokens and consumes them once; administrators privately deliver transient links. Migration defaults to profile/manual enrollment policy, with explicit root-only secure re-enrollment mode. Legacy credentials and browser sessions are never imported as trusted credentials.

Student start/resume/answers/submission use safe DTOs and server timing/scoring. Autosave failure/retry is visible. Public catalogue contains counts, not question content. Archived exams retain results. Expired abandoned attempts can be finalized idempotently by authorized staff or an explicitly configured scheduler.

## Verification evidence

See `docs/OVERNIGHT_PROGRESS.md` final verification checkpoint for the final command exit codes and test counts. Separate suites cover unit/regression modules, disposable PostgreSQL integration, bootstrap/cleanup/restore and rendered browser workflows. Browser API assertions are not described as clicking the corresponding UI.

Actual final evidence: `npm test` exit 0 (67/67); PostgreSQL integration exit 0 (46/46); TypeScript exit 0; ESLint exit 0 with zero errors/warnings; production webpack build exit 0; Prisma validation/generation/artifact verification exit 0; disposable seven-migration deployment exit 0; Git whitespace check exit 0. Startup configuration regression was first reproduced failing, then passed after CommonJS import correction in both configuration and bootstrap scripts.

Production-mode local HTTPS Playwright run exited 0: real login; 12 desktop and 6 mobile admin routes; true/false question creation; exam creation/publication; staff setup and seller authorization; public student entry; all three answer types, autosave/refresh, offline recovery and weighted score 100; protected results, ticket reuse denial, archive/history and logout. Sale/revenue and archive assertions use API calls inside the browser scenario, not clicks on those controls. A local self-signed test certificate was used; live deployment TLS is not verified.

Bootstrap and cleanup checks exited 0. Current-schema backup/restore drill exited 0: 13 model counts and seven migration records matched an independent disposable restore target. Only the owned disposable restore copy was recreated; source and production data were not reset. Private archives were retained locally, not committed.

## Exact changed-file inventory

`docs/OVERNIGHT_CHANGED_FILES.txt` records tracked modifications and every untracked source/asset in the final working tree. It includes existing prior work as well as this recovery; Git cannot attribute all uncommitted files to one phase. No staged changes were introduced. Main areas: admin/public/student pages, ExamForm/RegistryManager/DashboardShell, backend adapter/API client, server repositories/auth/enrollment/migration/exam services, API handlers, Prisma migrations, focused tests, scripts, build/PostCSS config and documentation.

## Remaining risks

Dependency audit advisories are unresolved (2 critical, 5 high, 1 low). Concurrent unrelated Auth.js dependency additions were preserved. New year foreign keys deliberately retain unresolved old rows as NOT VALID. Historical versions lacking metadata cannot gain authentic missing snapshots retroactively. Automatic setup email, live ingress/pooling/load validation, universal audit telemetry, scheduled encrypted off-site backups and real deployment drills remain incomplete or unverified. Full production readiness must not be inferred from successful local tests/build.
