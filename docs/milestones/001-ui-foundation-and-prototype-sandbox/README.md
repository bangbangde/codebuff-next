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

Active, pending owner closure review. The UI foundation, isolated prototype sandbox, conventions, and sequenced product-surface prototype backlog are complete. Task 03 maps the delivered work to the milestone acceptance criteria and proposes closure without changing the owner-led closure decision.

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
- Created Task 03 to produce issue-ready Landing, Lab, Me, and site-guide chat prototype briefs, resolve their sequencing and chat-prototype approach, and prepare the milestone closure handoff.
- Prepared separately reviewable prototype briefs for Lab, Landing, Me, and site-guide chat with concrete sandbox shapes, constraints, acceptance criteria, review evidence, and intended downstream decisions.
- Sequenced the backlog as Landing, Lab, Me, then site-guide chat; Lab and Me may proceed in parallel after Landing records its provisional orientation and destination assumptions.
- Chose a deterministic static interaction study for the first site-guide chat prototype, with preset prompts, fixed responses, and conventional navigation fallback.
- Prepared a closure handoff that maps the implemented foundation, styling direction, sandbox, conventions, and prototype backlog to every milestone acceptance criterion.

### Next

- Review the Task 03 closure proposal and decide whether to close Milestone 001 and initialize the recommended follow-up prototype milestone.

### Open Questions

- Should the project owner accept the closure proposal and close Milestone 001?
- Should the next milestone execute the prototype backlog beginning with the owner-requested Landing-first exploration, with Lab and Me eligible to proceed in parallel afterward?

### Milestone-local Decisions

- Product-surface prototypes follow the foundation and sandbox work rather than being bundled into it.
- Global CSS owns design tokens, resets, and document-level defaults; component-specific styling stays colocated through Tailwind utilities or CSS Modules.
- Do not initialize `shadcn/ui` yet. Reconsider it only when repeated interactive primitives or accessibility requirements make its value concrete, and then add components individually.
- Keep the sandbox at the unlinked `/sandbox` route with `noindex` metadata. Render its registry entries together for comparison and colocate non-route code in private `_components` and `_experiments` folders.
- Keep sandbox primitives provisional and sandbox-local. Promote only demonstrated shared semantics, layout, or behavior; remove primitives when their experiments no longer exercise them.
- Explore Landing first, then Lab and Me, and site-guide chat last. Allow Lab and Me to proceed in parallel after Landing records its provisional orientation, content promises, and destination labels.
- Keep the first site-guide chat prototype static and deterministic. It supplements visible conventional navigation and does not include free-form input, AI behavior, retrieval, persistence, or backend capability.

## Closure Summary

Not yet closed.
