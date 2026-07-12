# Milestone 001 Retrospective

## Context

This retrospective was written after Milestone 001 closed. It records workflow and collaboration lessons from establishing the UI foundation, prototype sandbox, and follow-up prototype backlog. It does not revise the closed Milestone Contract or retroactively change its acceptance result.

## Overall Assessment

Milestone 001 succeeded at scope control, context preservation, and reversible implementation. It established a usable UI baseline and isolated sandbox without prematurely implementing production product surfaces or adding unnecessary dependencies.

Its main weakness was an imbalance between preparation and product learning. The milestone produced a complete foundation, sandbox, conventions, and four prototype briefs, but did not use a real product-surface experiment to validate the foundation or generate meaningful product feedback.

## What Worked

- The Contract prevented scope drift into production Landing, Lab, Me, or functional chat work.
- Long-term direction, milestone scope, task requirements, and closure decisions remained distinguishable.
- The sandbox stayed isolated, provisional, and removable.
- The native-first component strategy avoided speculative dependencies and component inventory.
- Foundation, sandbox, planning, and owner-led closure remained separately reviewable.
- Repository context made the work understandable without relying entirely on conversation history.

## What Did Not Work Well

### Too many objectives in one milestone

The milestone combined three kinds of work:

1. establishing the UI foundation;
2. building the prototype sandbox; and
3. preparing a complete four-surface prototype backlog.

The first two were engineering enablement; the third was product planning. Requiring issue-ready briefs for Landing, Lab, Me, and site-guide chat created substantial documentation without validating any of those product questions.

### Preparation was not tested by a real experiment

The foundation baseline verified the sandbox structure and primitives, but it did not show whether a realistic Landing composition would expose missing tokens, awkward primitive boundaries, organization problems, or new interaction needs.

The milestone built the laboratory and inspected its equipment, but did not yet run a representative product experiment.

### Acceptance emphasized artifacts over learning

The acceptance criteria mainly asked whether the foundation, styling direction, sandbox, conventions, and backlog existed. They did not require recorded findings from owner review or evidence that the sandbox reduced the cost of real prototype work.

Terms such as `minimal`, `lightweight`, and `clear` expressed the right intent but lacked practical stopping rules. This made it easy to add documentation in the name of completeness.

### Documentation repeated the same information

Task READMEs, prototype briefs, the handoff, Milestone Tracking, and the Closure Summary repeated requirements, exclusions, sequencing, and acceptance mappings. Each document was individually reasonable, but together they exceeded the needs of a single-owner project moving within one day.

### The GitHub-to-local-agent trigger was undefined

The original workflow treated GitHub Issues as the normal task layer without explaining how creating an Issue starts local Codex work. Because there was no automatic local trigger, milestone-local Task directories were used as both persistent prompts and work tracking.

This fallback worked, but duplicated responsibilities better handled by an Issue, pull request, Git history, and a short explicit owner instruction such as `Implement Issue #12`.

### Review focused more on process than UI

Closure relied mainly on implementation descriptions and acceptance mappings. A stronger UI collaboration loop would have included representative viewport and color-scheme captures, keyboard review, direct owner feedback, an iteration based on that feedback, and a concise record of accepted or rejected findings.

### Closure had an unnecessary handoff layer

Separating AI preparation from owner closure was correct, but the dedicated closure handoff, readiness update, and final Closure Summary created overlapping records. Human decision authority does not require a separate document when a pull request and compact evidence summary are sufficient.

## Collaboration Lessons

- Strictly following a Contract does not remove the responsibility to question the cost of work inside that Contract. An agent should surface a cheaper alternative when planning output begins to outweigh decision value.
- Optimizing for perfect future-agent handoff can impose excessive maintenance cost on the current owner. Preserve only the context needed to continue safely.
- The task description and the execution trigger are separate concerns. An Issue can own the complete task while the owner starts local work with a one-line instruction.
- Product and UI milestones need an explicit owner review loop centered on visible behavior, not only implementation completeness.
- Owner-led decisions should remain explicit, but the surrounding ceremony should be proportional to the risk of the decision.

## Workflow Changes Adopted After Closure

The repository workflow was revised based on these findings:

- A work item is the abstract task layer; a GitHub Issue is the default implementation when available, not a mandatory prerequisite.
- Creating or labeling an Issue does not automatically start local Codex. Explicit owner instruction is the baseline trigger.
- Repository Task directories are a fallback and must not duplicate an Issue or conversation.
- Tracking changes only when milestone-level truth materially changes; it is not an activity log.
- Closure should reference evidence rather than repeat delivery history.
- Supporting files require durable value after their work item closes.
- Process weight should vary between maintenance, experiments, and product or architecture commitments.
- The workflow must support product learning and delivery rather than become a product outcome itself.

The current source of truth for these rules is [`docs/ai-native-workflow.md`](../../ai-native-workflow.md).

## Recommendations for the Next Milestone

### Center the milestone on one real product question

Build a real Landing Page V0 at `/`. Let that concrete product surface test positioning, information hierarchy, visual direction, and the relationship between Landing, Lab, Me, and the site-guide concept.

### Shorten the feedback loop

Use this sequence:

```text
Issue
  -> reviewable product surface
  -> visual and interaction evidence
  -> owner review
  -> one revision if needed
  -> findings and decision
```

### Prepare only the next executable work item

Do not require complete briefs for every later surface. After Landing is reviewed, prepare the next Issue using its actual findings. Lab and Me may be considered for parallel work only when Landing has resolved the assumptions they depend on.

### Treat findings as the primary prototype output

For each prototype, record only:

- what was observed;
- what was accepted, rejected, or remains uncertain;
- confidence in the decision;
- impact on later work; and
- whether the experiment should be promoted, iterated, or removed.

### Keep evidence small and concrete

Prefer links to the pull request, automated verification, representative captures, keyboard review, and owner decision. Avoid a separate handoff document unless the result is too complex for the Issue, pull request, and Closure Summary.

## Suggested Milestone Objective Pattern

A stronger follow-up objective would be:

> Build the first reviewable version of the real landing page at `/`, using a concrete product surface to test the project's positioning, information hierarchy, visual direction, and discovery paths.

This produces direct product learning and leaves later Lab, Me, site-guide, and shared-UI decisions responsive to evidence rather than advance planning.
