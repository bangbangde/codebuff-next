<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Repository Rules

Use the current conversation for discussion, local analysis, and small maintenance that does not change product scope.

Before implementing a GitHub Issue or Milestone-dependent product, UI, or architecture change, read `docs/project.md`, `docs/ai-native-workflow.md`, and the live relevant Issue and Milestone. Live GitHub context is otherwise required only to report project status, select work, operate on a GitHub object, or check standalone work against the active Milestone. Do not access GitHub when local context is sufficient.

The current task or Issue owns the deliverable, its assigned Milestone owns the phase boundary, and `docs/project.md` owns stable direction. If required context is unavailable or ambiguous, stop only the affected implementation.

Creating, opening, editing, or closing a product Milestone requires explicit project-owner authorization. Boundary changes also require an owner-approved `milestone-change` Issue. Do not attach independent work to the active Milestone or put Milestone scope and progress in `docs/project.md`.
