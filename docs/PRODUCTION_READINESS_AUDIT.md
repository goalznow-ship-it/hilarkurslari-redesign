# Production readiness audit — 2026-10-23

**NOT READY FOR PRODUCTION.** This replaces earlier unsupported readiness claims. Verification uses synthetic local data only; no deployment or production database changes occurred.

| Boundary | Status | Evidence / limitation |
|---|---|---|
| Prisma StaffEnrollment client | VERIFIED | Schema valid; supported generation outside restricted child-process sandbox creates actual delegate; artifact assertion added. No database reset required. |
| Administrative source of truth | VERIFIED | Backend adapter/snapshot and authenticated APIs replace authoritative browser writes in current admin UI. Integration and selected browser workflows exercised; not every control has browser coverage. Legacy storage remains explicit migration input and pure helper compatibility. |
| Authentication / enrollment | VERIFIED | Server scrypt versioned N16384/r8/p5; old server hashes upgrade on login. Session credential race guard, deactivation, single-use expiring setup token tests. No legacy hashes/default passwords imported. Private manual delivery supported; automatic email delivery NOT IMPLEMENTED. |
| Company authorization | VERIFIED | Scoped snapshots/reports and mutation ownership checks; cross-company integration denials. Global migration/registries require root admin. Production policy acceptance still required. |
| Student payload / grading | VERIFIED | Catalogue counts only, authorized safe question DTOs, server deadline/exact-set weighted scoring, answer revision conflicts, idempotent submission and snapshot tests. |
| Sales / tickets | VERIFIED | Shared exam row locks and database constraints prevent conflicting sale/start and duplicate sales; available inventory excludes all sold/claimed tickets. |
| Historical integrity | PARTIALLY IMPLEMENTED | New versions retain metadata and grading snapshots. Old versions without metadata use legacy fallback; missing historical metadata cannot be reconstructed safely. |
| Legacy migration | VERIFIED | Strict versioned credential-free schemas, duplicate/reference conflict preview, server recomputation and transactional rollback; optional root-only secure staff re-enrollment preserves IDs. Per-browser operator export still required. |
| Rate limiting | VERIFIED | PostgreSQL atomic counters, concurrent limit and expiry tests. No forwarded-header trust by default. Real ingress/load tuning remains unverified. |
| Academic year references | PARTIALLY IMPLEMENTED | Seven migrations applied locally. NOT VALID constraints protect new writes while preserving unresolved legacy labels; operator reconciliation/full validation remains outstanding. |
| Build | VERIFIED | Supported webpack production build completes. Turbopack worker port EPERM remains environmental; diagnostic command retained. Project-local Tailwind4 PostCSS config prevents inherited incompatible parent config. |
| Logging / operations | PARTIALLY IMPLEMENTED | Redacted structured errors, bounded bodies, health schema check, private no-overwrite backup and empty-disposable restore scripts. Universal audit/event monitoring, deployment alerts and scheduled encrypted off-site backups remain outstanding. |
| Dependencies | BLOCKED | Actual npm audit: 8 advisories (2 critical, 5 high, 1 low), including unused concurrently added Auth.js packages. No unsafe forced major downgrade or unrelated package removal performed. |
| Deployment acceptance | BLOCKED | Live TLS/cookies/proxy trust, pooling, capacity/concurrency load, CDN/private-cache behavior and operational restore objectives require authorized staging/deployment verification. |

## Evidence discipline

Unit/regression tests execute actual modules; PostgreSQL integration tests use disposable databases and transaction failure fixtures. Browser evidence is recorded separately in the report/checkpoint. A green test suite does not establish production readiness. Source inspection is not browser or real-service verification.

## Required release gates

1. Triage dependency advisories without breaking the locked Next/React stack or overwriting parallel dependency work.
2. Review legacy year labels and snapshot limitations with operators; export every relevant browser before cutover. Never clear browser data automatically.
3. Verify real HTTPS ingress, trusted identity header configuration, secure cookie behavior, secret management, log redaction, private response caching and database pooling under representative load.
4. Configure and drill encrypted off-site backup/restore, monitoring and expired-attempt scheduling. Approve staff setup link delivery policy.
5. Run a full staging role/workflow matrix and review remaining manual browser gaps before deployment authorization.
