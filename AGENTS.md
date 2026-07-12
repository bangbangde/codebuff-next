<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Repository Context

Before product, UI, or architecture work, read:

1. `docs/project.md`
2. `docs/ai-native-workflow.md`
3. the current GitHub Issue and its associated open GitHub Milestone

GitHub Milestones are the source of truth for phase objectives, scope, constraints, and acceptance criteria. Creating or editing a milestone, changing its phase boundary, and closing it require explicit project-owner authorization.

The current task or GitHub Issue defines the requested deliverable, its GitHub Milestone defines the phase boundary, and `docs/project.md` defines stable long-term direction. Use `docs/ai-native-workflow.md` for the complete source-ownership and conflict-resolution rules.

Do not begin new product, UI, or architecture implementation without an owner-approved open GitHub Milestone and a work item associated with it. If GitHub context is unavailable, stop milestone-dependent implementation and report the missing context. Small maintenance work may proceed from a sufficiently bounded current task or standalone Issue when it does not change product scope.

## Change Boundaries

- Do not change a GitHub Milestone's objective, scope, non-goals, constraints, or acceptance criteria unless an explicit `milestone-change` work item authorizes it and records owner approval.
- Keep routine progress in Issues and pull requests. Update the GitHub Milestone description only for approved boundary changes, links to consequential decisions, or closure.
- Keep milestone scope, progress, and temporary decisions out of `docs/project.md`.
