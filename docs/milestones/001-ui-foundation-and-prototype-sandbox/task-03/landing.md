# Prototype the Landing orientation surface

## Prototype Question

How can the Landing surface explain the site's technical point of view and guide visitors toward representative Lab, Me, and future site-guide experiences without resembling a generic SaaS hero or finalizing production navigation?

## Intended Outcome

Produce the first product-surface sandbox experiment, testing concise orientation, technical credibility, and content discovery with explicitly provisional Lab, Me, and site-guide destinations.

## Experiment Shape and Placeholder Content

- Add a `landing-orientation` experiment to the existing `/sandbox` registry as the first product-surface study.
- Include a restrained project statement, a short explanation of what visitors can explore, two or three representative Lab destinations, and a secondary author-context entry.
- Include a quiet site-guide affordance only as a preview of its role; it must not behave like a chatbot in this experiment.
- Use sandbox-local anchors or inert actions rather than production navigation.
- Avoid marketing metrics, testimonials, conversion language, oversized promotional claims, and decorative feature grids.

## Foundation and Sandbox Constraints

- Reuse the existing tokens and sandbox primitives; keep Landing-specific composition and styling colocated with the experiment.
- Preserve the calm typography, spacing, borders, and layout width already established by the foundation.
- Use semantic landmarks and heading order, visible focus states, responsive layout, and supported color schemes.
- Do not add a production route, navigation shell, dependency, or shared component based on this single composition.

## Review Evidence

- Wide and narrow viewport captures in light and dark modes.
- Keyboard review of all interactive specimens.
- A short content-hierarchy note explaining whether visitors can answer: what this site is, what is here, and where to start.

## Decisions This Prototype Should Enable

- The minimum message and content hierarchy for a future Landing surface.
- Which provisional Lab destinations and content promises the later Lab prototype should validate.
- The appropriate prominence of Me and site-guide entry points.
- Which navigation labels should be tested later without declaring final information architecture.

## Exclusions

- Replacing the production home page, adding production navigation, finalizing routes, real content feeds, animation systems, analytics, personalization, or SEO work.
- A functional site guide or chat interaction.

## Acceptance Criteria

- The prototype communicates the site's technical purpose without generic portfolio or SaaS framing.
- Representative Lab, Me, and site-guide paths are understandable without being production links.
- The composition remains credible and readable at narrow and wide widths and in both color schemes.
- Keyboard focus and semantic hierarchy are reviewable.
- Review notes identify the message hierarchy and downstream navigation labels worth testing.
- No production-facing behavior, unnecessary dependency, or premature shared component is introduced.
