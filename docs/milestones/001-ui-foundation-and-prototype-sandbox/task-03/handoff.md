# Prototype backlog sequence and milestone closure handoff

## Recommended Sequence

1. **Landing** tests the project's message, initial orientation, and provisional discovery paths before deeper surface decisions are made.
2. **Lab** tests realistic technical content, metadata, and destinations against the promises made by Landing, replacing provisional assumptions where needed.
3. **Me** tests the minimum author context and its relationship to technical work. It may run in parallel with Lab after Landing records its orientation language and author-context questions.
4. **Site-guide chat** runs last as a static interaction study because its prompts and responses require stable representative labels and destinations from Lab, Landing, and Me.

The handoff between prototypes is evidence, not code coupling. Each experiment stays independently removable and must not assume that an earlier visual composition is approved.

## Learning to Carry Forward

- Landing supplies the initial orientation language, discovery hierarchy, candidate navigation labels, and explicit content assumptions for later studies to test.
- Lab validates or replaces Landing's provisional content assumptions and supplies representative content types, metadata, destination names, and the distinction between papers and experiments.
- Me supplies the minimum author context and clarifies whether that context belongs directly on Landing.
- Site-guide chat evaluates those established labels and destinations against common visitor intents and conventional navigation.

## Provisional and Carry-forward Candidates

All sandbox styling and compositions remain provisional. The following may be proposed for later adoption only after prototype review:

- the global visual tokens and native-first component strategy established by Task 01;
- the isolated registry and colocated experiment conventions established by Task 02;
- semantic or behavioral primitives demonstrated by more than one experiment;
- content hierarchy, labels, and interaction patterns supported by review evidence.

`shadcn/ui` remains deferred. A later prototype may reconsider it only when repeated interactive behavior or accessibility requirements establish a concrete need; it should still be added component by component rather than initialized speculatively.

## Milestone 001 Acceptance Review

| Acceptance criterion | Evidence and status |
| --- | --- |
| A minimal shared UI foundation supports consistent prototype development without becoming a large component system. | Task 01 established global tokens and a native-first strategy; Task 02 added only three sandbox-local primitives demonstrated by the baseline experiment. Satisfied. |
| A basic styling direction is represented in the implementation and documented where future contributors need it. | Global styles encode typography, color, spacing, radius, borders, layout width, and light/dark behavior; sandbox documentation records the reuse boundary. Satisfied. |
| An isolated prototype sandbox exists and has clear conventions for adding, comparing, and removing experiments. | The unlinked, `noindex` `/sandbox` route, registry, private folders, and colocated README provide the implementation and conventions. Satisfied. |
| Focused follow-up prototype issues can be created for Landing, Lab, Me, and site-guide chat without first making additional foundation decisions. | The four Task 03 briefs define experiment shape, constraints, acceptance criteria, evidence, and downstream decisions. Satisfied. |
| The milestone remains lightweight: no production-ready product surface or functional chat capability is required for closure. | No product-surface route or real chat capability was added; the chat brief explicitly selects a deterministic static interaction study. Satisfied. |

## Closure Proposal

Milestone 001 is ready for project-owner closure review. Its objective and acceptance criteria are met through the implemented UI foundation, documented styling direction, isolated sandbox, sandbox conventions, and issue-ready prototype backlog.

There are no unresolved implementation questions inside the current Contract. The owner decisions are whether to accept this evidence and close Milestone 001, and whether to initialize a follow-up milestone centered on executing the prototype backlog in the recommended order.

Recommended follow-up milestone focus: evaluate the four sandbox prototypes as product-direction studies, beginning with Landing, while continuing to treat their styling, information architecture, and interactions as provisional. Lab should then test Landing's content promises; Me may proceed alongside Lab; site-guide chat remains last. Activating that milestone, creating GitHub Issues, and choosing which prototype findings become production commitments remain separate owner-led actions.
