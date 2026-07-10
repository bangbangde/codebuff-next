# AI-native Workflow

## Purpose

This document is the source of truth for the AI-native development workflow used in this repository. It defines process, not product direction or phase scope.

The workflow makes collaboration between the human project owner, GitHub Issues, pull requests, and AI coding agents stable, reviewable, and repeatable. Agents should not depend on hidden memory or long conversation history; the repository should carry the context needed to continue the project.

## Document Responsibilities

Each source has one primary responsibility:

| Source | Responsibility |
| --- | --- |
| `AGENTS.md` | Concise context-loading and change-boundary instructions for agents |
| `docs/project.md` | Stable, long-term product and technical direction |
| `docs/ai-native-workflow.md` | Milestone lifecycle, collaboration roles, and documentation process |
| `docs/current-milestone.md` | Pointer to the active milestone README |
| Active Milestone Contract | Phase-level objective, scope, non-goals, constraints, and acceptance criteria |
| Active Milestone Tracking | Current progress, open questions, and milestone-local decisions |
| GitHub Issue or current task | Task-level requirements and acceptance criteria |
| Pull request | Delivery record, review context, and declared impact on milestone state |
| Supporting milestone files | Optional notes, references, reviews, and assets |

Supporting milestone files are non-binding unless the active milestone README or current task explicitly references them.

When instructions appear to conflict, use the current task to determine the requested work, the active Milestone Contract to determine the allowed phase boundary, and `docs/project.md` to preserve long-term direction. Work that changes the phase boundary must explicitly revise or reopen the milestone; it must not silently override the Contract.

## Delivery Hierarchy

```text
Project direction
  -> Milestone
     -> GitHub Issues
        -> Branches
           -> Pull Requests
```

A milestone is a phase boundary, not a single task. Multiple issues and pull requests may proceed in parallel when they fit within the active Milestone Contract.

## Milestone Workspace

Each milestone is a folder. Its `README.md` is the required entry point; other files are optional.

```text
docs/milestones/001-example/
  README.md
  notes.md
  references.md
  review.md
  assets/
```

The README contains:

1. Metadata
2. Milestone Contract
3. Milestone Tracking
4. Closure Summary

### Milestone Contract

The Contract defines the agreed phase boundary. It should contain the objective, relevant context, scope, non-goals, constraints, and acceptance criteria.

Once the milestone is active, the Contract is locked during normal work. Changes must follow the explicit Revise or Reopen process below.

### Milestone Tracking

Tracking records the current truth of the milestone. It may contain current status, completed and in-progress work, open questions, and milestone-local decisions.

Tracking may be updated during normal work. Keep it concise and current rather than turning it into an unstructured activity log.

### Closure Summary

The Closure Summary is completed when the milestone closes. It records the outcome, selected and rejected directions when relevant, unresolved questions, carry-forward decisions, and the follow-up milestone.

Closure is human-led. Agents may prepare evidence, proposals, and document updates, but the project owner makes final product, design, and scope decisions.

## Milestone Lifecycle

### Initialize

1. Review `docs/project.md`.
2. Review the previous milestone's Closure Summary, if one exists.
3. Identify unresolved questions and carry-forward decisions.
4. Create the new milestone folder and README.
5. Draft a stable Milestone Contract.
6. Initialize Milestone Tracking.
7. Update `docs/current-milestone.md` when the milestone becomes active.
8. Create or update the milestone's GitHub Issues.

Do not begin feature implementation before the Contract is stable enough to guide the work.

### Execute

- Use issues or current tasks for focused deliverables.
- Keep work within the active Contract.
- Allow parallel tasks when they share the same phase boundary.
- Update Tracking when progress, open questions, or milestone-local decisions materially change.
- Keep optional exploratory notes separate from binding requirements.

Small maintenance work may run alongside a milestone when it does not change product scope. Other out-of-milestone work requires an explicit milestone revision or reopen task.

### Revise or Reopen

Revising the active Contract is an exceptional, explicit action. It requires all of the following:

- the current task explicitly authorizes the revision or reopen;
- the task states what is changing and why it cannot wait for a later milestone;
- the resulting pull request explains the change and its consequences; and
- Milestone Tracking records the decision.

### Close

1. Review completed issues, pull requests, prototypes, and implementation results.
2. Resolve or record open questions.
3. Complete the Closure Summary.
4. Record carry-forward decisions and the proposed next milestone.
5. Update `docs/current-milestone.md` only when the next milestone becomes active.

A milestone must not drift silently into the next phase.

## Issue Guidance

Issues define task-level work and should avoid repeating the full project background. They should identify:

- the intended outcome and why it matters now;
- any context beyond the required project and milestone documents;
- acceptance criteria;
- relevant exclusions or files that should not change; and
- whether the task is authorized to revise the active Contract.

## Pull Request Guidance

A pull request should record:

- the related issue;
- what changed and what was intentionally left unchanged;
- evidence for UI or behavior changes when applicable;
- whether Milestone Tracking changed;
- whether the active Contract changed and, if so, where that was authorized; and
- follow-up work or unresolved questions.

Normal feature pull requests must not change the active Contract.

## Responsibilities

### Human Project Owner

The owner defines project direction, starts and closes milestones, approves scope changes, makes product and design decisions, and chooses which directions carry forward.

### AI Agents

Agents follow the repository instructions, implement focused work within the active Contract, keep changes reviewable, and explain tradeoffs.

Agents may propose owner-level choices but must not silently make them. When existing context safely bounds a task, agents should prefer a conservative, reviewable implementation over unnecessary clarification.

## Guiding Principles

- Externalize project context instead of relying on conversational memory.
- Give each decision one authoritative home and link to it instead of duplicating it.
- Keep long-term direction, milestone scope, and task requirements at their respective levels.
- Keep optional exploration separate from binding requirements and delivery records reviewable.
- Let agents execute, propose, and summarize; let the owner decide direction, scope, and taste.
