# Overnight recovery checkpoint

Status: IN PROGRESS; NOT READY FOR PRODUCTION. No commit/push/deploy permitted.

## Baseline inspected
- Branch main, existing tracked and untracked server changes preserved; initial hashes in /tmp/hilal-overnight/before.json.
- Git diff --check exit 0. Main admin UI imports lib/store and uses authoritative localStorage; server APIs exist but are disconnected.
- Critical tasks: connect all admin reads/mutations and authentication; strict server parity and concurrency; re-enrollment tokens; operational logging/backups; actual tests/build/browser verification.
- Existing PostgreSQL-backed rate limiter and migration transaction are retained pending rerun.

## Execution design
Reuse existing UI and API routes. Load an authenticated server snapshot before rendering admin children; keep only transient in-memory view data. Every mutation awaits a server response; no browser-local business writes. Keep legacy exporter and pure question helpers. Add targeted transactional endpoints for CSV batches and ticket additions. Preserve historical records through archival/deactivation. Scoped roles must remain fail-closed where tenant support is incomplete.

## Next
Reproduce lint/TypeScript/unit baseline; implement server state endpoint and admin client adapter; switch existing callers with awaited writes. Then extend concurrency/security tests, staff enrollment, operations and verification.

## Resume 2026-10-23: Prisma blocker resolved
- Actual schema contains StaffEnrollment and User.enrollments; Prisma CLI/client both 5.22.0; default @prisma/client import resolves the expected generated output.
- Reproduced sandbox child-process EPERM: generation returned 0 without updating artifacts. Escalated supported `npx prisma generate --schema prisma/schema.prisma` generated the client successfully.
- Verified generated schema and runtime delegate `staffEnrollment.findMany`; schema validate exit 0 using a synthetic disposable URL.
- Temporary files and disposable PostgreSQL cluster from the previous host disappeared on restart. Recreate a fresh disposable cluster; never touch production.
- Current UI adapter/server snapshot, ticket append, atomic question batch and enrollment changes exist but require final runtime verification.
- Next: TypeScript/lint, fresh disposable migrations and integration tests; fix regressions before extending work.

## Verified baseline after client regeneration
- TypeScript exit 0, ESLint exit 0 (zero warnings).
- Fresh disposable database received all 3 migrations successfully.
- Escalated `npm test` executed all 61 individual tests: 58 passed, 3 failed because existing handler tests did not await newly async handlers. Tests now await completion; business assertions retained.
- Build still fails in Turbopack CSS worker with port-binding EPERM despite escalated invocation. Do not repeatedly retry this unchanged restriction.
- Next: rerun tests, add backend/enrollment concurrency coverage, verify API/UI integration and operational scripts.

## Backend verification checkpoint
- `npm test` now executes and passes all 61 tests; async handler assertions preserved.
- New disposable PostgreSQL tests exposed two real defects: duplicate primary-key arbitration under concurrent rate upserts; Prisma cannot decode void-returning advisory locks.
- Rate entries now use random independent row IDs with key-based atomic upsert. Advisory lock SELECTs cast void to text. Rerunning 30 integration tests.
- Enrollment lifecycle covers hashed tokens, 24h expiry, replacement, concurrent single-use and session revocation. UI uses a fragment token and administrator-only delivery; no public token issuance/logging.
- Operational backup/empty-disposable restore and explicit admin bootstrap scripts added; runtime verification pending.

## Build/tenant checkpoint
- Supported `npm run build -- --webpack` now completes successfully (exit 0), including TypeScript and route collection.
- Root cause of fallback CSS failure: parent ../postcss.config.js used Tailwind as a v3 PostCSS plugin. Added project-local PostCSS config and matching @tailwindcss/postcss 4.3.3; branding CSS retained. Default Turbopack still has environmental EPERM.
- Full build exposed refined Zod .omit runtime failure. Shared unrefined question fields plus full post-merge validation fix it; do not rely on TypeScript alone.
- Scoped queries/ownership checks added for exams/questions/classes/staff/reports. Questions now have nullable companyId (legacy null records remain root-managed). Migration remains unscoped-admin only.
- npm audit currently reports 8 advisories (2 critical, 5 high, 1 low), including concurrently added Auth.js dependencies not used by current authentication. Do not remove unrelated dependency changes or force-downgrade packages; release blocker pending review.
- Next: final tenant test rerun, restore evidence, rendered browser verification, stale-write protection and documentation.

## Student/concurrency and browser checkpoint
- 35 real PostgreSQL integration tests passed after fixing the sale repository transaction (the first patch did not match its variable name; inspected and corrected).
- Browser dev-webpack run passed: real admin login; 12 admin routes desktop; student mobile safe attempt load, refresh/resume and anonymous-admin rejection. Screenshot inspected; branding retained. Expanded mutation/submission test running separately.
- Added optimistic exam versions and answer versions. Stale exam edits return conflict; used tickets cannot be removed; concurrent answer writes cannot silently overwrite another tab. Explicit failed-autosave retry and reconnect retry are implemented, pending expanded browser pass.
- Attempt start/sale/ticket changes share the exam row lock. Snapshot metadata now retains title, company, academic year and duration for new attempts. Legacy snapshots without metadata fall back to existing exam fields; no historical data fabricated.
- Five migrations apply to disposable DB. Backup and restore to a separate empty local disposable DB both exited 0; no production restore performed.
- Default production build now uses supported webpack after actual successful fallback verification. Turbopack diagnostic script retained; its worker/port EPERM is environmental. Local Tailwind 4 PostCSS configuration prevents parent config leakage.
- Added explicit configuration validation at production start. External TLS/proxy/backups/email delivery still require deployment verification.

## Expanded browser and safety checkpoint
- Expanded Playwright run exited 0: true/false question created through UI and verified in server state; 6 admin routes at mobile width; student single/multiple/true-false answer selection, autosave/refresh, final submission, weighted score 100, wrong result token and ticket reuse denial. Actual browser script preserved as tests/browser.py; synthetic setup is tests/browser-fixture.mjs.
- 63 unit/regression tests passed. New bounded request reader protects auth/student/admin JSON parsing; no private payload echoed in errors.
- Added explicit autosave retry/reconnect, optimistic question review/edit timestamps and transactional last-root-admin protection. These latest changes need final regression rerun.
- Verified metadata-aware migrations apply; production startup validates canonical HTTPS origin/secret/database. No deployment has occurred.
- Next: final integration/lint/TypeScript/build, backup/bootstrap/cleanup checks, README and audit/report updates. Preserve concurrent unrelated Auth.js package additions and report their advisory risk rather than force-removing them.

## Secure legacy staff completion
- Added explicit, default-off staff re-enrollment import mode, protected by the same root-admin authorization as migration.
- Preview recomputes staff creates/reference validity; commit generates random unknown password hashes and one-time 24h setup tokens, preserving legacy staff IDs and seller relationships inside the import transaction. No legacy password/hash/token is accepted.
- Setup links are returned only to the authenticated operator after successful commit, shown transiently, and require private manual delivery. At most 100 staff per enrollment batch; normal import remains insert-only/manual-profile policy by default.
- Existing credential exclusions/default-off migration tests retained. New enabled-mode relationship/enrollment DB test running.
- Found and fixed mixed-case ticketCode redaction in the existing logger; added recursive redaction test. No raw credential/query data logged.

## Finalization checkpoint before final verification
- Public catalogue now returns active lifecycle status and counts only. Question text/options/media are withheld until authorized start; the previous UI status mismatch was confirmed and fixed.
- Expired abandoned attempts have an authorized finalize endpoint and results-page action using the same idempotent grading transaction. Optional bearer-authenticated scheduler support exists; no live schedule configured.
- Existing archived company/year assignments remain editable without forcing new registry assignments. Ownership is rechecked at transactional writes for scoped staff/exam/question/class operations.
- Backup/restore verification passed: all 13 model counts matched; 6 migration records preserved in an independent empty local restore DB. Cleanup retained valid sessions/counters and historical counts. Bootstrap first creation and duplicate refusal passed on fresh hilal_test.
- Source edits are ending; run final unit/DB/lint/TypeScript/build checks, then local HTTPS production browser verification without concurrent source edits. Previous dev browser scenario passed except one cold-compile timeout; no timeout counted as a pass.
- Remaining release blockers: dependency audit advisories, real deployment/ingress/TLS/backup scheduling/monitoring/load verification. No production infrastructure touched.

## Final security review additions
- New password hashes use explicit versioned scrypt N=16384/r=8/p=5 (OWASP listed configuration), not the older p=1 work factor. Only existing server two-part scrypt hashes retain compatibility; successful login upgrades them atomically. Browser SHA-256 hashes remain rejected.
- Login session creation locks the user and checks the exact verified credential, preventing an in-flight old password from creating a new session after a concurrent password reset/deactivation.
- Fixed seller availability: server excludes tickets sold by other sellers and tickets already claimed in attempts/results, without exposing other students' details. Dashboard ticket series now uses actual sales.
- Final verification pending these targeted changes; no readiness claim from earlier build/test results.

## Last integrity fixes and verification freeze
- Legacy case-insensitive login failed a real test (401): repository lowercased the lookup but old DB e-mail was mixed-case. Lookup now uses case-insensitive matching, backed by the unique lower(email) index.
- Year assignment gap reproduced: a new unregistered assignment incorrectly succeeded. Migration 7 adds NOT VALID foreign keys for new exam/class assignments, preserving old unresolved labels. Disposable pre/post migration test passed: old rows readable/editable unchanged, new invalid rows rejected. Existing legacy labels require operator review before full constraint validation.
- Public catalogue exposure/status and cross-seller availability fixes are covered by executable tests. Added abandoned-attempt finalization (100 per batch), scheduler authorization and manual results action.
- Final source freeze after health readiness checks latest migration. Next run: tests/lint/TypeScript/build, then immutable local HTTPS production browser scenario; no source edits while browser is running.

## Final verified recovery checkpoint
- StaffEnrollment client mismatch resolved by real supported generation; schema/client/delegate verified. No production data reset.
- Final executed checks: unit/regression 67/67 exit 0; disposable PostgreSQL integration 46/46 exit 0; TypeScript exit 0; lint exit 0 with 0 warnings; production webpack build exit 0; Prisma validate/generate/artifact check exit 0; seven disposable migrations exit 0; diff check exit 0.
- Production-mode local HTTPS browser suite exited 0 after exposing and fixing CommonJS @next/env imports in check-env and bootstrap. Config regression reproduced failure before fix; valid config and invalid HTTP/secret/database cases now tested in npm test.
- Browser exercised admin login, 12 desktop/6 mobile routes, question authoring, exam publishing, secure staff setup, public student entry, all answer types, autosave/resume, offline retry, score 100, protected results, ticket reuse denial, archival/history and logout. Sales/revenue/archive checks use APIs, not corresponding UI clicks. Student mobile screenshot inspected.
- Bootstrap + cleanup tests exit 0. New private backup restored to owned disposable copy; all 13 model counts and 7 migrations matched, exit 0. No live infrastructure touched.
- README, backup procedure, audit and report now replace unsupported readiness claims. Exact working-tree manifest includes pre-existing work; no files staged/committed/pushed/deployed.
- NOT READY FOR PRODUCTION: dependency advisories (2 critical/5 high/1 low); legacy NOT VALID year references and missing old snapshot metadata; live TLS/ingress/pooling/cache/load verification; encrypted off-site backup scheduling, monitoring, universal audit telemetry and setup delivery policy remain release gates.
- Next authorized work: dependency triage and representative staging acceptance/operational setup. Do not force major downgrades or delete parallel package changes. Preserve browser exports before cutover; never clear legacy storage automatically.
