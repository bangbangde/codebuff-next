# Prototype the restrained Me surface

## Prototype Question

What is the minimum author context that helps technical readers understand the engineer behind the site without letting biography, self-promotion, or portfolio conventions dominate the product?

## Intended Outcome

Produce one sandbox experiment that tests a concise professional introduction, current technical focus, selected links, and a clear relationship back to Lab output.

## Experiment Shape and Placeholder Content

- Add a `me-context-surface` experiment to the existing `/sandbox` registry.
- Include a short professional summary, three current-focus themes, a compact set of representative external links, and two references to relevant Lab work.
- Use explicitly provisional placeholder details where real personal information is unavailable; do not invent claims, employers, achievements, or credentials.
- Compare one compact overview with one slightly more contextual presentation inside the same experiment rather than creating routes.
- Use sandbox-local or inert links where destinations have not been approved.

## Foundation and Sandbox Constraints

- Reuse global tokens and existing sandbox primitives when appropriate; colocate author-surface styles with the experiment.
- Prefer semantic sections and lists over decorative profile cards, timelines, skill meters, or résumé layouts.
- Preserve responsive behavior, visible focus states, and supported color schemes.
- Add no profile data model, production route, dependency, or speculative primitive.

## Review Evidence

- Wide and narrow viewport captures in light and dark modes.
- Keyboard review of link specimens.
- A short comparison note identifying what context improves trust and what feels promotional or redundant.

## Decisions This Prototype Should Enable

- The minimum author information that belongs on a future Me surface.
- How strongly Me should connect to Lab output and current focus.
- Which external-link categories are useful enough to carry forward.
- Whether Landing needs a short author summary or only a restrained path to Me.

## Exclusions

- A production `/me` route, complete résumé, employment history, testimonials, personal storytelling, contact form, live social data, analytics, or final copy.
- Invented personal facts or final decisions about public identity.

## Acceptance Criteria

- The prototype provides enough professional context to support credibility while keeping technical work primary.
- Compact and contextual alternatives can be compared without route changes.
- No unsupported personal claim is presented as fact.
- The experiment is readable and reviewable across target widths, color schemes, and keyboard interaction.
- Review notes identify what to retain, omit, or connect to Landing and Lab.
- No production-facing behavior, unnecessary dependency, or speculative shared component is introduced.

