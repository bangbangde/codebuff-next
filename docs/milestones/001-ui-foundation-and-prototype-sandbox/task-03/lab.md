# Prototype the Lab content surface

## Prototype Question

What is the smallest reading and discovery structure that makes the Lab feel like a credible place for both technical papers and interactive experiments, without turning it into a conventional blog or committing to a final content model?

## Intended Outcome

Produce one sandbox experiment that compares a compact Lab index with representative paper and experiment entries. The result should clarify the hierarchy, metadata, summaries, and calls to action, and validate or replace the provisional Lab promises introduced by the Landing prototype.

## Experiment Shape and Placeholder Content

- Add a `lab-content-surface` experiment to the existing `/sandbox` registry.
- Start from the Landing prototype's provisional Lab labels and destinations, but change them freely when realistic technical content exposes a better structure.
- Show a short Lab introduction followed by a mixed collection containing at least two paper entries and two experiment entries.
- Use fictional but realistic frontend and AI-native engineering topics. Include title, type, concise summary, status or date, and one small topic label where useful.
- Include one representative expanded reading preview or detail panel so reviewers can compare index-level and article-level hierarchy without adding a route.
- Use inert or sandbox-local controls for filtering or opening entries; do not imply that production navigation or data loading exists.

## Foundation and Sandbox Constraints

- Reuse existing global tokens, `PrototypeSection`, `PrototypeGrid`, and `PrototypePanel` where their semantics fit.
- Keep Lab-specific markup and CSS colocated in `_experiments`; do not expand the shared primitive layer unless a second experiment demonstrates the same need.
- Use semantic headings, lists, articles, links or buttons, visible focus states, responsive layouts, and both supported color schemes.
- Keep content local and typed inside the experiment. Add no content pipeline, dependency, or new route.

## Review Evidence

- Wide and narrow viewport captures in light and dark modes.
- Keyboard review of every interactive specimen.
- A short comparison note identifying which metadata earns its space and whether papers and experiments should share one collection or remain visibly distinct.

## Decisions This Prototype Should Enable

- The minimum Lab index hierarchy and entry metadata worth carrying into later work.
- Whether paper and experiment entries need distinct visual treatment.
- Which representative Lab destinations should refine the Landing study and later site-guide chat.
- Whether any repeated pattern creates a concrete shared-primitive or accessibility dependency need.

## Exclusions

- Production `/lab` routes, final taxonomy, search, pagination, MDX, CMS, real content, persistence, analytics, or launch-quality article layout.
- Final information architecture or permanent visual identity decisions.

## Acceptance Criteria

- The experiment makes papers and experiments understandable as related but distinguishable Lab output.
- Index and representative detail hierarchy can be reviewed together at narrow and wide widths.
- Placeholder content is credible enough to expose metadata and reading-layout needs without being presented as published work.
- Applicable keyboard, focus, light-mode, and dark-mode behavior is reviewable.
- No production route, real data layer, unnecessary dependency, or speculative shared component is introduced.
- Review notes record the content hierarchy and representative destinations that downstream prototypes may assume.
