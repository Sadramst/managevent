# Contributing

1. Pick a row in [`ROADMAP.md`](ROADMAP.md) and open an issue for it with `.github/ISSUE_TEMPLATE/agent-task.yml`, with the ROADMAP id in the title (for example `[MKT-14] apps/marketing: analytics with consent`).
2. Branch: `feat/<app>-<short-name>` (see [`AGENTS.md`](AGENTS.md) §8).
3. Follow the root `AGENTS.md` and the `AGENTS.md` in the folder you work in. Set up your machine with [`infra/LOCAL_DEV.md`](infra/LOCAL_DEV.md).
4. Run the gate from the repo root with PostgreSQL running: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
5. Open a PR using the template, link the issue, delete the finished row from `ROADMAP.md`, and include screenshots of the standard and Memorial Mode layouts for UI work.
6. CI must be green. At least one review is required, and two for `contract-change` PRs.

See [`docs/agents/AGENT_WORKFLOW.md`](docs/agents/AGENT_WORKFLOW.md) for how human and AI agents split the work.
