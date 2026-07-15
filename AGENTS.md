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

Milestone-dependent product, UI, or architecture implementation requires an owner-approved open GitHub Milestone and an associated work item. A bounded standalone Issue may proceed in parallel when it explicitly states that it is independent, does not change or rely on the active Milestone boundary, and has sufficient requirements and acceptance criteria of its own. If GitHub context required by either path is unavailable, stop the affected implementation and report the missing context.

## Change Boundaries

- Do not change a GitHub Milestone's objective, scope, non-goals, constraints, or acceptance criteria unless an explicit `milestone-change` work item authorizes it and records owner approval.
- Do not assign an independent Issue or its pull request to the active Milestone merely because it runs concurrently. If standalone work reveals a required Milestone boundary change, stop that part and use the `milestone-change` process.
- Keep routine progress in Issues and pull requests. Update the GitHub Milestone description only for approved boundary changes, links to consequential decisions, or closure.
- Keep milestone scope, progress, and temporary decisions out of `docs/project.md`.
