# AI-native Workflow

This file contains only project-specific workflow rules. Use the lightest process that preserves the relevant product boundary.

## Sources

- `docs/project.md`: stable product and technical direction.
- Current task or GitHub Issue: deliverable and acceptance criteria.
- Assigned GitHub Milestone: phase boundary.
- Pull request: delivery evidence and review record.

The work item cannot override its Milestone or authorize a phase-boundary change.

## Work Paths

- **Current task:** small ad hoc, offline, diagnostic, or maintenance work that does not change product scope.
- **Standalone Issue:** a bounded one-off change with explicit outcome, exclusions, acceptance criteria, and independence from the active Milestone.
- **Milestone Issue:** product, UI, or architecture work contributing to an approved phase.

Before implementing a standalone Issue while a product Milestone is active, inspect that Milestone. The Issue must not change its boundary, consume a required phase decision, or become necessary for its closure. If this stops being true, pause the conflicting work and move it into the Milestone or `milestone-change` process.

An explicit owner request starts local work; creating or labeling an Issue does not. If required live context is missing, stop only the affected implementation.

## Milestones

Keep at most one product Milestone open. Use one for a multi-item product or architecture phase or for decisions affecting later work; otherwise prefer a current task or standalone Issue.

Use this description:

```md
## Objective
## Scope
## Non-goals
## Constraints
## Closure criteria
## Decisions
## Closure
```

The first five sections are the phase boundary. `Decisions` contains links to consequential decisions; `Closure` stays empty until closure.

Creating, opening, editing, or closing a Milestone requires explicit owner authorization. Description edits are limited to approved boundary changes, consequential decision links, and owner-led closure. A boundary change requires an Issue labeled `milestone-change` that records the change, consequences, reason it cannot wait, and owner approval.

To activate a phase: propose it in an unassigned Issue, obtain owner approval, open the Milestone, then create only the first ready work items. Do not begin phase implementation earlier.

To close a phase: review the evidence and running product or UI, obtain owner acceptance, resolve or defer remaining Issues, fill `Closure`, and close the Milestone. Propose the next phase separately.

Assign Milestone work through its Issue. Link the pull request to that Issue, but do not also assign the pull request to the Milestone because that double-counts progress.

## Records and Delivery

- A Milestone Issue adds task-specific requirements and evidence without copying the phase boundary.
- A pull request links its work item and records the change, verification, exclusions, Milestone impact, and unresolved follow-up.
- Record a phase-wide decision in an Issue labeled `decision`; use `experiment` for reversible work whose primary result is learning.
- Keep routine progress in Issues and pull requests. Do not maintain repository copies of Milestone descriptions, tracking, closure summaries, or Git history.
- Start UI work from a concrete product surface. Extract shared UI only after repeated use or a clear shared need.

The owner decides direction and phase boundaries. Agents execute within them, surface conflicts and tradeoffs, and preserve proportionate evidence.
