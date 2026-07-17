# Project

## Purpose

`CQ’s Lab` is CQ’s personal technical lab for notes, experiments, and work in progress around frontend engineering, software, product thinking, and AI-assisted development.

It should feel personal without becoming a portfolio or self-promotional brand site. Its value comes primarily from the work, ideas, and engineering judgment it makes visible. The main audience is technical readers, especially frontend engineers and software developers.

## Product Shape

- **Landing** provides a compact introduction, current context, and a small selection of work.
- **Notes** is the main space for technical and editorial output. It is not required to behave like a chronological blog.
- **Me** gives concise context about CQ without dominating the site.

Specific content, features, and delivery scope belong in the relevant GitHub Issue and owner-approved Milestone rather than this document.

## Experience Direction

### Character

The site should feel technical, human, calm, credible, thoughtful, and in progress. It should use content and interaction to reveal its point of view instead of explaining itself through large claims or marketing language.

### Visual language

- Use an editorial hierarchy with strong typography, clear structure, and restrained warm accents.
- Prefer warm off-white surfaces, deep neutral text, fine structural rules, and a small amount of orange for emphasis.
- Keep introductory areas compact so real content appears early in the first viewport.
- Favor text-forward layouts and purposeful imagery over decorative illustration.
- Let spacing feel calm but not empty; information density should remain useful on desktop and narrow screens.
- Give page endings a deliberate sense of closure and offer a next step only when it has a clear navigation purpose.
- Treat the accepted Landing direction as the visual reference for Notes and Me without copying its layout mechanically.

Avoid generic SaaS sections, portfolio templates, uniform card grids, exaggerated hero copy, decorative complexity, and interaction that exists mainly to demonstrate itself. Animation should be subtle, purposeful, and safe for reduced-motion preferences.

### Copy

Use natural, concise language. English carries the `CQ’s Lab` brand, product-surface names, and short positioning phrases; Simplified Chinese carries most explanation. Intentional Chinese-English mixing is welcome when it reads naturally.

Avoid over-explaining metaphors, internal brand language, and copy that sounds more important than the underlying content.

## Engineering Preferences

- Use the existing Next.js App Router, TypeScript, and Tailwind setup; read the repository’s version-specific Next.js documentation before changing framework code.
- Prefer semantic HTML and accessible native behavior. Keyboard navigation, visible focus, meaningful landmarks, and reduced motion are baseline requirements.
- Prefer Server Components, static rendering, and local data by default. Add client-side state or services only when the interaction requires them.
- Keep dependencies and architecture minimal. Inspect existing wiring before adding packages, providers, or parallel styling systems.
- Build page-specific UI first. Extract shared components or abstractions only after repeated use or a clear shared semantic need appears.
- Reuse established color, typography, spacing, and layout tokens rather than introducing isolated values without reason.
- Design responsively from the start and verify both desktop and a 375px-wide viewport without horizontal overflow.
- For meaningful UI changes, run lint and build checks and perform browser review of the affected routes.
- Prefer static, local, or honest placeholder content until an approved work item requires real data or backend capability.

Phase-specific architecture, dependencies, and delivery boundaries belong in the relevant owner-approved GitHub Milestone.
