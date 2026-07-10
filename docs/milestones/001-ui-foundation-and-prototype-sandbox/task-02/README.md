# Create prototype sandbox with reusable primitives

## Goal

Create a lightweight, isolated prototype sandbox and the smallest set of reusable UI primitives needed to explore later product-surface ideas consistently.

The sandbox should make experiments easy to add, compare, and remove without presenting them as production-ready Landing, Lab, Me, or chat experiences.

## Requirements

- Review the current Next.js app structure and the relevant repository-local Next.js guides before implementation.
- Add a clearly identified sandbox entry point that remains separate from production-facing product surfaces and navigation.
- Define a simple convention for organizing, naming, discovering, and removing sandbox experiments.
- Build only the reusable primitives demonstrated by the sandbox, using the existing global tokens and native-first component strategy.
- Include a small placeholder experiment that verifies the sandbox structure and primitives without becoming a product-surface prototype.
- Keep the sandbox usable across supported viewport sizes, color schemes, and keyboard interaction where applicable.
- Document the sandbox conventions close to the implementation so later prototype tasks can follow them.
- Avoid new dependencies unless the implementation exposes a concrete need that cannot be met cleanly with the current stack.
- Re-evaluate and document whether the demonstrated primitives create a concrete need for `shadcn/ui`; keep the native-first strategy unless that need is established.
- Update the milestone Tracking section with the implemented sandbox shape, conventions, and any reusable-primitives decisions.

## Boundaries

Do not implement:

- a production-ready Landing, Lab, or Me surface
- a site-guide chat prototype or real chat capability
- a comprehensive design system or broad component catalog
- production navigation or information architecture changes solely to expose the sandbox
- AI integration, CMS, database, analytics, or deployment work
- speculative primitives that are not exercised by the sandbox

Do not revise the active Milestone Contract as part of this task.

## Acceptance Criteria

- An isolated prototype sandbox is available through a clear development entry point.
- Contributors can understand how to add, find, compare, and remove experiments from colocated documentation.
- The sandbox demonstrates a minimal set of reusable primitives built on the existing UI foundation.
- The example content is visibly provisional and does not read as a production product surface.
- Existing production-facing behavior remains unchanged except where the sandbox requires strictly isolated supporting code.
- The implementation is responsive, respects the existing light and dark modes, and supports applicable keyboard interaction.
- No unnecessary dependency or speculative component layer is introduced.
- The `shadcn/ui` decision is explicitly re-evaluated against the demonstrated interaction and accessibility needs.
- Milestone Tracking reflects the resulting sandbox and reusable-primitives decisions.
