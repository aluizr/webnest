# Release Notes 0.14.2

Date: 2026-03-11

## Summary
This release closes the sprint execution for stability, drag-and-drop UX, inline editing reliability, observability, and release readiness.

## Highlights

### Day 2 - Drag and Drop UX
- Improved drop-target visibility in board columns.
- Added directional drop helper in cards view.
- Enhanced sidebar category drop and reorder cues.

### Day 3 - Inline Editing and Filters
- Hardened Enter/Tab/Escape inline editing behavior.
- Prevented no-op updates when inline value is unchanged.
- Added regression tests for inline editing and filter/sort combinations.

### Day 4 - Observability
- Standardized operational, warning, and error events across auth, links, categories, and trash flows.
- Added structured logging context for troubleshooting.
- Added observability runbook for diagnostics and incident triage.

### Day 5 - Release Validation
- Final quality gate passed: lint, tests, and production build.
- Smoke checks passed for core routes: /, /auth, /robots.txt.
- Go decision recorded.

## Validation Evidence
- Lint: passed
- Tests: 96/96 passed
- Build: passed
- Smoke: / -> 200, /auth -> 200, /robots.txt -> 200

## Risk Assessment
- No P0/P1 blockers identified during sprint closure.
- No functional regressions detected in automated validation.

## Related Artifacts
- Changelog: CHANGELOG.md
- Observability runbook: docs/OBSERVABILITY_RUNBOOK.md
- Post-release checklist: docs/POST_RELEASE_CHECKLIST.md
