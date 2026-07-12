# AI-native Workflow

## Purpose

This document defines the AI-native development process used in this repository. Product direction belongs in `docs/project.md`; phase scope belongs in the description of an owner-approved open GitHub Milestone.

The workflow should make work stable, reviewable, and easy to continue across human and AI sessions without allowing process or documentation to become the main product output.

## Source Responsibilities

| Source | Responsibility |
| --- | --- |
| `AGENTS.md` | Context-loading and change-boundary instructions for agents |
| `docs/project.md` | Stable product and technical direction |
| `docs/ai-native-workflow.md` | Milestone lifecycle and collaboration process |
| GitHub Milestone | Phase objective, scope, non-goals, constraints, acceptance criteria, consequential decision links, and closure |
| GitHub Issue or current task | Focused outcome, requirements, and acceptance criteria |
| Pull request | Delivery record, evidence, review context, and milestone impact |

A work item is normally a GitHub Issue. A current task may be used for small, ad hoc, offline, or maintenance work that does not change product scope. Repository task files must not duplicate an Issue or conversation.

The repository does not maintain milestone pointers, Contracts, Tracking, Closure Summaries, or milestone archives. When instructions conflict, use the work item for the deliverable, its GitHub Milestone for the phase boundary, and `docs/project.md` for long-term direction. Changing the phase boundary requires explicit owner approval through the process below.

## Delivery Model

```text
Project direction
  -> GitHub Milestone
     -> GitHub Issue
        -> Change
           -> Review, evidence, and decision
```

A milestone is a phase boundary, not a single task. Work items may proceed in parallel when they fit the same milestone and do not depend on unresolved owner decisions.

Attach normal milestone work to the Milestone through its Issue. A pull request should close or link that Issue but should not also be assigned to the Milestone, because assigning both would count the same work twice in GitHub's milestone progress. A pull request without an Issue may be assigned directly only as an explicit exception.

## Product-slice-first UI Work

Do not establish a UI foundation, design system, component catalog, or prototype infrastructure in isolation. Start with a concrete, reviewable product surface and create only the styles, components, and supporting structure that surface needs.

Promote a pattern into shared UI only after current product work demonstrates repeated use or a meaningful shared semantic or behavioral need. Early UI milestones should optimize for product learning before infrastructure completeness.

## Starting Local Agent Work

Creating or labeling an Issue does not start a local AI agent. The default trigger is an explicit owner instruction such as `Implement Issue #12`; the agent then reads the Issue, its associated GitHub Milestone, and the required repository context. The owner should not copy the Issue body into the conversation.

New product, UI, or architecture implementation requires an owner-approved open GitHub Milestone and a work item associated with it. If an Issue has no Milestone, no Milestone is open, more than one open Milestone makes the intended phase ambiguous, or GitHub context cannot be read, the agent must stop milestone-dependent implementation and report the missing context.

Small maintenance may proceed from a sufficiently bounded current task or standalone Issue when it does not change product scope. Polling or automatic execution remains outside the baseline workflow.

## GitHub Milestone Model

An owner-approved open GitHub Milestone is the only active phase Contract. Keep at most one product Milestone open at a time. A proposed phase is discussed in an unassigned Issue and becomes active only when the owner approves its boundary and the Milestone is created or opened.

Use this compact structure in the Milestone description:

```md
## Objective

## Scope

## Non-goals

## Constraints

## Acceptance criteria

## Decisions

## Closure
```

The first five sections define the phase boundary. `Decisions` links only consequential Issue or pull-request decisions that affect later work. `Closure` remains empty until owner-led closure.

### Progress and decisions

GitHub's open and closed Issue counts provide routine progress. Do not reproduce task lists, implementation steps, commit lists, or activity logs in the Milestone description.

Keep task-level discussion and evidence in the nearest Issue or pull request. When a decision affects the whole milestone or later phases, record it in an Issue labeled `decision` and link the result from `Decisions`.

### Scope changes

Normal delivery must not change the phase boundary. A revision requires an Issue labeled `milestone-change` that:

- states what changes and why it cannot wait;
- describes the consequence for current and later work;
- records explicit owner approval; and
- links to the revised Milestone description.

## Proportional Workflow

Use the lightest process appropriate to the risk:

| Work type | Default path |
| --- | --- |
| Maintenance | Current task or standalone Issue -> change -> verification |
| Experiment | Milestone Issue -> reviewable implementation -> findings -> decision |
| Product or architecture commitment | Milestone Issue -> pull request -> verification -> owner decision -> carry-forward |

Small maintenance may run alongside a milestone when it does not change product scope. Other out-of-milestone product work requires a proposed Milestone or an approved `milestone-change` Issue.

## Milestone Lifecycle

### Propose and activate

1. Review `docs/project.md` and the most recent closed GitHub Milestone.
2. Create an unassigned proposal Issue with the intended phase boundary and unresolved owner choices.
3. Obtain explicit owner approval.
4. Create or open the GitHub Milestone with the approved description. Open means active; closed means inactive.
5. Create only the first ready work items and assign them to the Milestone.

Do not begin milestone feature work before the Milestone can guide it.

### Execute

- Keep focused Issues within the Milestone boundary.
- Keep exploratory material separate from binding requirements.
- Keep evidence in the Issue, pull request, checks, or review artifact closest to the work.
- Add only consequential, milestone-wide decision links to the Milestone description.
- Create later work items in response to findings rather than preparing a complete speculative backlog.

### Revise

Use the `milestone-change` process above. An edited description without a linked, owner-approved change Issue is not an authorized phase revision.

### Close

1. Review completed work and evidence; zero open Issues is necessary but not sufficient for acceptance.
2. For product or UI work, complete an agent-led live review in which the agent presents the running result, explains key code and tradeoffs, answers owner questions, and verifies agreed revisions.
3. Obtain explicit owner acceptance, then resolve, move, or explicitly defer every open Issue.
4. Fill `Closure` with the outcome, selected or rejected directions, unresolved questions, carry-forward decisions, and links to evidence without duplicating delivery history.
5. Close the GitHub Milestone.
6. Propose the next phase separately; do not silently drift into it.

## Work Item and Pull Request Guidance

A work item is ready when it describes a bounded outcome that can be reviewed and closed. Research, design exploration, technical spikes, features, maintenance, and bugs can all be Issues.

A Milestone Issue should contain:

- the intended outcome and why it matters now;
- only context not owned by required sources;
- acceptance criteria and relevant exclusions; and
- whether a phase-boundary revision is authorized.

A pull request should link the work item and record what changed, what remained out of scope, relevant evidence, milestone impact, and unresolved follow-up. Normal delivery pull requests must not change the Milestone boundary.

Create a repository supporting file only when its research, decision record, reference material, or review result remains useful independently of a Milestone. Link to it rather than copying it.

## Labels

Keep workflow labels small:

- `decision`: an owner-level product or architecture decision;
- `milestone-change`: an explicit request to revise an active phase boundary; and
- `experiment`: reversible work whose primary output is learning.

Open and closed state, Milestone assignment, and pull-request linkage should express routine status without additional labels.

## Documentation Discipline

- Do not create or maintain milestone documents in the repository.
- Do not document activity already preserved by Issues, pull requests, GitHub Milestones, and Git.
- Give each decision one authoritative home and link to it elsewhere.
- Prefer evidence links over repeated acceptance-criteria narratives.
- If deleting a proposed file after task closure would lose no durable knowledge, do not create it.

## Responsibilities

The project owner defines direction, approves and closes GitHub Milestones, approves scope changes, selects ready work, makes product and design decisions, and chooses what carries forward.

AI agents follow repository instructions, work within the associated GitHub Milestone, keep changes reviewable, preserve proportionate evidence, and explain tradeoffs. They may propose owner-level choices but must not silently make them.

## Guiding Principles

- Externalize durable context instead of relying on conversational memory.
- Keep project direction, milestone scope, and task requirements at their respective sources.
- Start early UI work from reviewable product slices, then extract only proven patterns.
- Keep exploration reversible and separate from production commitments.
- Match process weight to the risk and learning value of the work.
- Record decisions and evidence, not every action taken.
- Let agents execute and propose; let the owner decide direction, scope, and taste.
