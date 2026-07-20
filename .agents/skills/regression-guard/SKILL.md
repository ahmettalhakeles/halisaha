---
name: regression-guard
description: Protect existing behavior during every repository code, configuration, schema, API, frontend, backend, test, build, or deployment change. Use whenever Codex plans, implements, fixes, refactors, or reviews code in this project; inspect affected flows before editing, preserve contracts, add regression coverage, run relevant tests, and audit the final diff.
---

# Regression Guard

Apply this workflow to every code-producing task in the repository. Treat a skill review as guidance, not as a substitute for executable tests.

## Before editing

1. Read the applicable `AGENTS.md` and `MIMARI_DOKUMAN.md` sections.
2. Inspect `git status` and the relevant diff. Preserve unrelated user changes.
3. Trace the complete affected path across frontend, route, middleware, database, workers, and build output as applicable.
4. Record the existing contracts that must remain true and identify at least one failure scenario.

## Protect project invariants

- Authentication: preserve JWT role and `fieldKey` tenant isolation; distinguish normal business sessions from admin impersonation; do not log out a valid session because an unrelated request used the wrong credential.
- Reservations: preserve conflict checks, date/time normalization, transaction boundaries, and concurrent-request safety.
- Payments: preserve authorization, validation, idempotency, and repeated-request behavior.
- Database: keep migrations idempotent and compatible with Railway environment variables; never read or expose secrets.
- Frontend: update source files first and keep tracked minified outputs synchronized when their source changes.
- Deployment: preserve `server/index.js`, `package.json`, `railway.json`, and `/health` compatibility.

## Implement narrowly

1. Make the smallest change that fixes the requested behavior.
2. Reuse existing helpers and conventions before adding abstractions.
3. Keep public API shapes and stored data compatible unless the user explicitly requests a breaking change.
4. Add or update focused regression tests for the discovered failure and the retained success path.

## Verify

1. Run the narrowest relevant tests first, then `npm.cmd test`.
2. Exercise the affected happy path and at least one negative or authorization path.
3. For frontend changes, verify both remembered and in-memory sessions where relevant and regenerate minified assets with `npm.cmd run minify`.
4. For auth, reservation, payment, or deployment changes, perform an additional defect-first review of the complete diff.
5. Inspect the final diff and confirm no unrelated files or secrets were introduced. Run `git diff --check` only before a commit/release or when the change has whitespace-sensitive edits, conflict resolution, generated patches, or formatting risk.

## Report

State what behavior was preserved, which regression test covers the failure, which commands passed, and any validation that could not be completed.
