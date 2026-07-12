# AI-native Workflow

## Purpose

This document defines the AI-native development process used in this repository. Product direction belongs in `docs/project.md`; phase scope belongs in the active Milestone Contract.

The workflow should make work stable, reviewable, and easy to continue across human and AI sessions without allowing process or documentation to become the main product output.

## Source Responsibilities

| Source | Responsibility |
| --- | --- |
| `AGENTS.md` | Context-loading and change-boundary instructions for agents |
| `docs/project.md` | Stable product and technical direction |
| `docs/ai-native-workflow.md` | Milestone lifecycle and collaboration process |
| `docs/current-milestone.md` | Pointer to the active milestone README |
| Milestone Contract | Phase objective, scope, non-goals, constraints, and acceptance criteria |
| Milestone Tracking | Current status, open questions, and milestone-local decisions |
| Work item | Focused outcome, requirements, and acceptance criteria |
| Pull request | Delivery record, evidence, review context, and milestone impact |
| Supporting files | Optional knowledge that remains useful after a work item closes |

A work item is normally a GitHub Issue when GitHub is available. A current task may be used for small, ad hoc, or offline work. Repository task files are a fallback and must not duplicate an Issue or conversation.

Supporting files are non-binding unless the active milestone README or work item references them. When instructions conflict, use the work item for the deliverable, the Contract for the phase boundary, and `docs/project.md` for long-term direction. Changing the phase boundary requires an explicit revision or reopen.

## Delivery Model

```text
Project direction
  -> Milestone Contract
     -> Work item
        -> Change
           -> Review, evidence, and decision
```

With GitHub, a work item normally maps to an Issue and a change to a branch and pull request. Review results feed back into milestone documents only when they change milestone-level truth.

A milestone is a phase boundary, not a single task. Work items may proceed in parallel when they fit the same Contract and do not depend on unresolved owner decisions.

## Product-slice-first UI Work

Do not establish a UI foundation, design system, component catalog, or prototype infrastructure in isolation. Start with a concrete, reviewable product surface and create only the styles, components, and supporting structure that surface needs.

Promote a pattern into shared UI only after current product work demonstrates repeated use or a meaningful shared semantic or behavioral need. Early UI milestones should optimize for product learning before infrastructure completeness.

## Starting Local Agent Work

Creating or labeling an Issue does not start a local AI agent. The default trigger is an explicit owner instruction such as `Implement Issue #12`; the agent then reads the Issue and required repository context. The owner should not copy the Issue body into the conversation.

Polling or automatic execution is optional and outside the baseline workflow. Before it may modify the repository, it must define task selection, locking, isolation, failure recovery, permissions, and owner-decision boundaries.

## Milestone Workspace

Each milestone is a folder whose `README.md` contains:

1. Metadata
2. Milestone Contract
3. Milestone Tracking
4. Closure Summary

Other notes, reviews, references, or assets are optional.

### Contract

The Contract defines the agreed phase boundary. Once active, it is locked during normal work.

### Tracking

Tracking records current milestone truth, not an activity log. Update it only when one of these materially changes:

- milestone status;
- the state of an acceptance criterion;
- an open question;
- a milestone-local decision; or
- a finding that changes later milestone work.

Routine steps, implementation details, and commit lists belong in Issues and pull requests. At closure, avoid preserving a second detailed history in Tracking.

### Closure Summary

Closure records the outcome, selected and rejected directions when relevant, unresolved questions, carry-forward decisions, and proposed follow-up milestone.

Reference evidence instead of restating every work item. Evidence may include pull requests, automated checks, representative UI captures, interaction review, prototype findings, and owner decisions. Use a compact `Criterion | Evidence | Result | Follow-up` table when several criteria need mapping.

Closure is human-led. Agents may prepare evidence and proposals; the project owner makes final product, design, scope, and closure decisions.

## Proportional Workflow

Use the lightest process appropriate to the risk:

| Work type | Default path |
| --- | --- |
| Maintenance | Current task or Issue -> change -> verification |
| Experiment | Issue -> reviewable implementation -> findings -> decision |
| Product or architecture commitment | Issue -> pull request -> verification -> owner decision -> carry-forward |

Small maintenance may run alongside a milestone when it does not change product scope. Other out-of-milestone product work requires an explicit revision or reopen.

## Milestone Lifecycle

### Initialize

1. Review `docs/project.md` and the previous Closure Summary, if any.
2. Identify unresolved questions and carry-forward decisions.
3. Create the milestone README and draft a stable Contract.
4. Initialize concise Tracking.
5. Activate the milestone through `docs/current-milestone.md`.
6. Create only work items whose outcome and boundary are ready.

Do not begin milestone feature work before the Contract can guide it.

### Execute

- Keep focused work items within the Contract.
- Prefer Issues when available; use the current task when an Issue adds no coordination value.
- Keep exploratory material separate from binding requirements.
- Update Tracking only at the material-change threshold above.
- Keep evidence in the Issue, pull request, checks, or review artifact closest to the work.

### Revise or Reopen

Changing the Contract requires a work item that explicitly authorizes the change, explains why it cannot wait, records the consequences in the pull request, and updates Tracking.

### Close

1. Review completed work and evidence.
2. For product or UI work, complete an agent-led live review in which the agent presents the running result, explains key code and tradeoffs, answers owner questions, and verifies agreed revisions.
3. Obtain explicit owner acceptance, then resolve or record open questions.
4. Complete the Closure Summary without duplicating delivery history.
5. Record carry-forward decisions and change `docs/current-milestone.md` only when the next milestone becomes active.

A milestone must not drift silently into the next phase.

## Work Item and Pull Request Guidance

A work item is ready when it describes a bounded outcome that can be reviewed and closed. Early-stage research, design exploration, technical spikes, features, maintenance, and bugs can all be Issues.

A work item should contain:

- the intended outcome and why it matters now;
- only context not owned by required repository documents;
- acceptance criteria and relevant exclusions; and
- whether Contract revision is authorized.

A pull request should link the work item and record what changed, what remained out of scope, relevant evidence, milestone impact, and unresolved follow-up. Normal delivery pull requests must not change the Contract.

Create a supporting file only when its research, decision record, reference material, or review result should remain useful after the work item closes. Link to it rather than copying it.

## Documentation Discipline

- Do not document activity already preserved by Issues, pull requests, and Git.
- Do not copy a work item into a milestone task directory.
- Give each decision one authoritative home and link to it elsewhere.
- Prefer evidence links over repeated acceptance-criteria narratives.
- If deleting a proposed file after task closure would lose no durable knowledge, do not create it.

## Responsibilities

The project owner defines direction, activates and closes milestones, approves scope changes, selects ready work, makes product and design decisions, and chooses what carries forward.

AI agents follow repository instructions, work within the Contract, keep changes reviewable, preserve proportionate evidence, and explain tradeoffs. They may propose owner-level choices but must not silently make them.

## Guiding Principles

- Externalize durable context instead of relying on conversational memory.
- Keep project direction, milestone scope, and task requirements at their respective levels.
- Start early UI work from reviewable product slices, then extract only proven patterns.
- Keep exploration reversible and separate from production commitments.
- Match process weight to the risk and learning value of the work.
- Record decisions and evidence, not every action taken.
- Let agents execute and propose; let the owner decide direction, scope, and taste.
