# CLAUDE.md

Claude Code: the authoritative instructions for this repository live in `AGENTS.md`. They are imported below so that there is only one source of truth.

@AGENTS.md

## Claude-specific notes

- Work from the repo root so that `pnpm` and `turbo` resolve the workspaces. If your task is scoped to one app, also read that app's `CLAUDE.md`, which imports its `AGENTS.md`.
- Use plan mode for any task labelled `contract-change` or touching `packages/db`, `packages/payments` or `packages/auth`. Post the plan in the issue before editing.
- Prefer the smallest change that satisfies the issue's acceptance criteria. Do not scaffold apps other than the one named in the issue.
- Before you finish, run `pnpm lint && pnpm typecheck && pnpm test`. If any of them fails, fix it. Never disable the check.
