# Prepare product-surface prototype backlog and milestone handoff

## Goal

Complete the remaining planning work in Milestone 001 by turning the implemented UI foundation and sandbox findings into a sequenced, issue-ready prototype backlog for Landing, Lab, Me, and site-guide chat.

This task closes the milestone's delivery scope; it does not implement those product-surface prototypes or make the owner's milestone-closure decision.

## Intended Outcome

Future prototype work can begin without another foundation decision. Each product surface has a focused task brief, shared assumptions are explicit, dependencies and learning order are clear, and the milestone has enough evidence for the project owner to close it.

## Requirements

- Review the active Milestone Contract, completed Task 01 and Task 02 outcomes, the sandbox conventions, and the current implementation before drafting follow-up work.
- Create four separately reviewable, issue-ready prototype briefs: Landing, Lab, Me, and site-guide chat.
- For every brief, define:
  - the prototype question and why it matters;
  - the intended outcome and concrete acceptance criteria;
  - the sandbox experiment shape and representative placeholder content;
  - relevant foundation tokens, sandbox primitives, and constraints to reuse;
  - explicit exclusions, especially production routing, final information architecture, real data, and launch-quality polish;
  - expected review evidence and the decisions the prototype should enable.
- Give the four briefs a recommended execution order. Explain dependencies, which questions can be explored in parallel, and what learning should carry from one prototype to the next.
- Resolve the current chat-planning question by recommending either a static interaction study or a limited functional prototype. Keep the recommendation within this milestone's non-goals: no AI backend, retrieval system, or production chat capability.
- Distinguish provisional sandbox findings from decisions that may be proposed for carry-forward. Do not silently promote sandbox primitives or styling into production commitments.
- Update Milestone Tracking with the prepared backlog, sequence, resolved planning questions, and any remaining owner decisions.
- Prepare a concise closure proposal covering delivered acceptance criteria, unresolved questions, carry-forward candidates, and the recommended focus of the next milestone. Leave final closure and activation of any next milestone to the project owner.

## Recommended Planning Baseline

Unless repository evidence discovered during this task points elsewhere, evaluate this order:

1. **Landing** — test the site's positioning, initial orientation, and provisional routes into its technical material first.
2. **Lab** — use the Landing study's provisional destinations to test the core technical-expression surface and establish realistic reading, metadata, and experiment-linking needs.
3. **Me** — test restrained author context after the site's primary value and orientation language are visible.
4. **Site-guide chat** — run a static interaction study against the preceding prototype content and navigation concepts, without implementing AI behavior.

After Landing records its orientation questions and provisional destination labels, Lab and Me may proceed in parallel. Lab should validate or replace Landing's placeholder content assumptions rather than treating them as approved information architecture. Site-guide chat should remain last because its usefulness depends on having representative destinations and language to guide visitors through.

## Deliverables

- [Lab prototype brief](./lab.md)
- [Landing prototype brief](./landing.md)
- [Me prototype brief](./me.md)
- [Site-guide chat prototype brief](./site-guide-chat.md)
- [Sequence and milestone closure handoff](./handoff.md)
- Updated Milestone Tracking in the active milestone README.

## Boundaries

Do not:

- implement Landing, Lab, Me, or site-guide chat prototypes;
- turn sandbox routes or components into production-facing product surfaces;
- add production navigation or finalize information architecture;
- implement AI, chat backend, retrieval, persistence, CMS, database, analytics, or deployment capabilities;
- introduce dependencies or a broader component system for hypothetical future needs;
- revise the active Milestone Contract;
- mark the milestone closed or activate the next milestone without the project owner's decision.

## Acceptance Criteria

- Landing, Lab, Me, and site-guide chat each have a focused, separately reviewable, issue-ready prototype brief.
- Each brief can be executed in the existing sandbox without first making additional UI-foundation, component-strategy, or sandbox-organization decisions.
- The backlog has a justified recommended order and identifies safe parallel work and dependencies.
- The site-guide chat brief makes an explicit, contract-compatible choice between a static interaction study and a limited functional prototype.
- Prototype scope remains provisional and does not imply production-ready surfaces, final navigation, or a functional AI chat.
- Milestone Tracking reflects the completed planning work and no stale planning question remains unaddressed.
- A closure proposal maps the implemented foundation, sandbox, conventions, and prepared backlog to every Milestone 001 acceptance criterion.
- The repository contains sufficient evidence for the project owner to decide whether to close Milestone 001.
