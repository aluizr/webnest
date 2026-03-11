# Label Convention

This guide defines the standard labels used in issues and pull requests.

## Why this exists

- Keep triage consistent.
- Make sprint and release filtering easier.
- Reduce ambiguity when prioritizing work.

## Label groups

### Type

- bug: defects or broken behavior.
- enhancement: new capability or improvement.
- docs: documentation-only work.
- release: release planning and execution tasks.
- observability: logging, metrics, diagnostics, and runbook updates.
- qa: validation and regression-focused tasks.

### Priority

- p0: critical impact, immediate action.
- p1: high priority, near-term execution.
- p2: normal priority, planned execution.

### Workstream

- sprint: sprint execution and tracking items.
- frontend: UI/UX and client-side behavior.

### Process status labels (optional)

If needed, keep this set minimal and explicit:

- blocked: work cannot proceed due to dependency or incident.
- ready: clear scope, ready for execution.
- in-progress: actively being implemented.
- needs-review: waiting for review or sign-off.

## Usage rules

- Use at least one Type label.
- Use exactly one Priority label when priority is known.
- Add one Workstream label when the item belongs to a stream such as sprint or frontend.
- Avoid label explosion. Prefer 2 to 4 labels per issue.
- Keep names lowercase and use hyphens only when needed.

## Suggested combinations

- Bug in sprint validation: bug, qa, sprint, p0
- UX refinement task: enhancement, frontend, sprint, p1
- Release closure issue: release, sprint, p2
- Logging/runbook work: observability, sprint, p1

## Governance

- Repository maintainers can create or retire labels.
- If a new label is proposed, document rationale in the related issue.
- Remove obsolete labels to avoid drift.

## Sync automation

- Label catalog source of truth: .github/labels.yml
- Sync workflow: .github/workflows/label-sync.yml
- Trigger manually in GitHub Actions: Label Sync -> Run workflow
