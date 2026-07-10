# Prototype sandbox conventions

The sandbox lives at `/sandbox`. It is intentionally absent from production-facing navigation and carries `noindex` metadata. Its content is provisional and must not be treated as an approved product surface.

## Structure

- `page.tsx` renders every registered experiment on one comparison page.
- `_experiments/registry.ts` is the directory of available experiments and their review metadata.
- `_experiments/<name>.tsx` contains one focused experiment; keep experiment-only styles beside it in `<name>.module.css`.
- `_components/prototype-primitives.tsx` contains only the small layout and presentation primitives shared by sandbox experiments.

Private folders use the App Router `_folder` convention, so their files cannot become routes accidentally.

## Add an experiment

1. Create a focused component and optional CSS Module in `_experiments`.
2. Add one entry to `registry.ts` with a stable kebab-case `id`, sequential label, status, title, and concise description.
3. Reuse existing prototype primitives when they fit. Keep one-off presentation inside the experiment rather than expanding the shared layer.
4. Render meaningful placeholder content that makes the question being explored visible without resembling approved product UI.
5. Check narrow and wide viewports, light and dark color schemes, and keyboard behavior for interactive elements.

All registered experiments render together on `/sandbox`, making their structure and visual tradeoffs directly comparable.

## Remove an experiment

Delete its registry entry and its colocated experiment files. If that leaves a prototype primitive unused, remove the primitive too.

## Primitive and dependency threshold

Promote a pattern into `_components` only when it is reused by sandbox specimens or centralizes meaningful semantics or behavior. Prefer native HTML, the existing global tokens, Tailwind utilities, and CSS Modules before adding a dependency.

`shadcn/ui` remains deferred: the current specimens need no repeated interactive behavior beyond native HTML. Reconsider it only when a later experiment demonstrates a concrete repeated interaction or accessibility requirement, and document that decision in milestone Tracking.
