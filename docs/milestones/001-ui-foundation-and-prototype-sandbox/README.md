# Milestone 001: UI Foundation and Prototype Sandbox

## Metadata

- Status: Active
- Initialized: 2026-07-11

## Milestone Contract

### Objective

Establish the smallest practical UI foundation and an isolated prototype sandbox so later product-surface ideas can be explored quickly without prematurely committing the application to a final design system, information architecture, or production experience.

### Context

The project direction identifies Landing, Lab, Me, and a possible site-guide chat as long-term product surfaces. Before those surfaces are implemented, the project needs a calm, credible baseline for layout and styling plus a safe place to test ideas. This milestone creates that baseline and prepares focused follow-up prototype work.

### Scope

- Establish only the shared UI structure needed to support consistent prototype work.
- Define a basic styling direction for typography, color, spacing, layout, and interaction states, keeping choices small and easy to revise.
- Create a lightweight, clearly isolated prototype sandbox for testing UI ideas without treating them as production product surfaces.
- Document the sandbox conventions needed for focused follow-up issues.
- Prepare and sequence later prototype work for Landing, Lab, Me, and a site-guide chat.
- Preserve the existing product behavior except for changes explicitly required by the foundation or sandbox issues created under this milestone.

### Non-goals

- Deliver production-ready Landing, Lab, or Me surfaces.
- Deliver a functional AI chat experience, backend, retrieval system, or content pipeline.
- Finalize the site's visual identity, information architecture, navigation, or content strategy.
- Introduce a comprehensive design system or configure a component library in advance of demonstrated need.
- Add broad architecture, data, deployment, analytics, or content-management work.
- Optimize prototypes for launch-quality completeness.

### Constraints

- Continue using Next.js App Router and TypeScript.
- Keep implementation small, maintainable, and easy to remove or revise.
- Avoid new dependencies unless a focused follow-up issue establishes a concrete need.
- Prefer local or placeholder content while exploring the UI.
- Keep sandbox work visibly separate from production-facing product surfaces.
- Treat styling and prototype decisions as provisional unless this milestone's closure summary explicitly carries them forward.

### Acceptance Criteria

- A minimal shared UI foundation supports consistent prototype development without becoming a large component system.
- A basic styling direction is represented in the implementation and documented where future contributors need it.
- An isolated prototype sandbox exists and has clear conventions for adding, comparing, and removing experiments.
- Focused follow-up prototype issues can be created for Landing, Lab, Me, and site-guide chat without first making additional foundation decisions.
- The milestone remains lightweight: no production-ready product surface or functional chat capability is required for closure.

## Milestone Tracking

### Current Status

Active. The minimal UI foundation and isolated prototype sandbox are implemented; follow-up product-surface prototype tasks have not been prepared yet.

### Completed

- Created and activated the milestone.
- Defined the boundary between foundation and sandbox work and later product-surface prototypes.
- Replaced the default initializer presentation with a neutral, non-product placeholder and project metadata.
- Established global visual tokens for color, typography, spacing, radius, borders, and layout width, including system light and dark modes.
- Chose a native-first component strategy: keep the existing Tailwind setup, use CSS Modules for scoped custom styles, and extract shared React components only when repetition or behavior justifies them.
- Created Task 02 to implement the isolated prototype sandbox, its conventions, and only the reusable primitives demonstrated by it.
- Added an unlinked, `noindex` `/sandbox` route backed by a colocated experiment registry so provisional experiments can be inspected together without changing production-facing navigation.
- Documented conventions for adding, comparing, and removing experiments and for keeping one-off styling out of the shared primitive layer.
- Added the demonstrated `PrototypeSection`, `PrototypeGrid`, and `PrototypePanel` primitives plus a foundation baseline experiment covering reading and native interaction surfaces.
- Re-evaluated `shadcn/ui` against the sandbox implementation and kept it deferred: the current native disclosure and static layout do not establish a concrete dependency need.

### Next

- Use sandbox findings to prepare later, separately reviewable prototype issues for Landing, Lab, Me, and site-guide chat.

### Open Questions

- Which product surface should be explored first after the foundation and sandbox are ready?
- Should the first site-guide chat prototype be a static interaction study or a limited functional prototype?

### Milestone-local Decisions

- Product-surface prototypes follow the foundation and sandbox work rather than being bundled into it.
- Global CSS owns design tokens, resets, and document-level defaults; component-specific styling stays colocated through Tailwind utilities or CSS Modules.
- Do not initialize `shadcn/ui` yet. Reconsider it only when repeated interactive primitives or accessibility requirements make its value concrete, and then add components individually.
- Keep the sandbox at the unlinked `/sandbox` route with `noindex` metadata. Render its registry entries together for comparison and colocate non-route code in private `_components` and `_experiments` folders.
- Keep sandbox primitives provisional and sandbox-local. Promote only demonstrated shared semantics, layout, or behavior; remove primitives when their experiments no longer exercise them.

## Closure Summary

Not yet closed.
