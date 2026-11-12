# CLAUDE.md

Claude Code: the authoritative instructions for this repository live in `AGENTS.md`. They are imported below so that there is only one source of truth.

@AGENTS.md

## Claude-specific notes

- Work from the repo root so that `pnpm` and `turbo` resolve the workspaces. If your task is scoped to one app or package, also read its `CLAUDE.md`, which imports its `AGENTS.md`.
- Use plan mode for any task labelled `contract-change` or touching `packages/db`, `packages/payments` or `packages/auth`. Post the plan in the issue before editing.
- Prefer the smallest change that satisfies the ROADMAP item's acceptance criterion. Do not scaffold the placeholder apps (`portal`, `vendors`, `mobile`, `desktop-win`) unless the issue names them.
- Commands that need environment variables go through `pnpm with-env <command>`; nothing reads `.env` by itself.
- Before you finish, start PostgreSQL (`pnpm db:local:detach`) and run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. If any of them fails, fix it. Never disable the check. Run Prettier only on the files you changed, never repo-wide.
