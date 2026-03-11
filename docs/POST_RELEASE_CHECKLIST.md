# Post-Release Checklist

## Purpose
Operational checklist for the first minutes and hours after a production release.

## Scope
Applies to WebNest releases validated through lint, test, build, and smoke checks.

## T+0 to T+15 minutes

- [ ] Confirm deployed version matches the intended release tag/commit.
- [ ] Validate homepage and auth route availability.
- [ ] Validate static asset delivery (including robots.txt).
- [ ] Confirm no startup errors in browser console.
- [ ] Confirm no unhandled error spikes in logger storage/providers.

## T+15 to T+60 minutes

- [ ] Execute quick happy-path flow:
  - [ ] login
  - [ ] create/update link
  - [ ] drag-and-drop move/reorder
  - [ ] inline edit in table
  - [ ] logout
- [ ] Validate critical event traces in observability logs:
  - [ ] auth.*
  - [ ] link.*
  - [ ] category.*
- [ ] Confirm no rate-limit false positives in normal usage.

## T+1h to T+24h

- [ ] Monitor error/warn trend versus baseline.
- [ ] Review top recurring errors and impacted flow.
- [ ] Verify no regressions reported by users/team.
- [ ] Capture lessons learned and update runbook/checklists.

## Rollback Decision Criteria

Trigger rollback (or hotfix) when any of the following is true:

- [ ] Core route unavailable or unstable.
- [ ] Authentication flow broken.
- [ ] Data mutation failure in critical flows (links/categories).
- [ ] Persistent P0/P1 issue without immediate mitigation.

## Communication Template

Use this summary in team channels:

- Release: <version>
- Time: <timestamp>
- Status: Stable | Monitoring | Action required
- Impact: <none or affected flow>
- Next update: <time>

## Artifacts

- Changelog: CHANGELOG.md
- Release notes: docs/RELEASE_NOTES_0.14.2.md
- Observability runbook: docs/OBSERVABILITY_RUNBOOK.md
- Reusable release issue template: .github/ISSUE_TEMPLATE/release-checklist.yml
