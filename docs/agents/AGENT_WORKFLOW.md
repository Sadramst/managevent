# Agent workflow

How a backlog item becomes merged code. The rules every agent follows are in the root [`AGENTS.md`](../../AGENTS.md); this page covers only the hand-offs.

## From backlog row to pull request

1. **Issue.** The founder (or a planning agent) turns one row of [`ROADMAP.md`](../../ROADMAP.md) into a GitHub issue with the **Agent task** template (`.github/ISSUE_TEMPLATE/agent-task.yml`, which adds `agent:ready`). Put the id in the title, for example `[MKT-05] apps/marketing: packages catalogue`. The issue names:
   - the **paths** the agent may touch;
   - the **contracts** it depends on (`packages/validators`, `packages/db/DATA_MODEL.md`, `packages/i18n`, `docs/design/DESIGN_SYSTEM.md`, `WEBSITE.md`);
   - the **acceptance criterion**, copied from the ROADMAP row.

   Changes to a shared contract use the **Contract change** template instead.

2. **Pick-up.** Any agent can take it: Claude Code (`CLAUDE.md` imports `AGENTS.md`), Cursor (`.cursor/rules` summarise `AGENTS.md`), Gemini CLI, Copilot or a GitHub issue agent. Set `agent:in-progress`.
3. **Read, in order:** root `AGENTS.md` → the folder's `AGENTS.md` → the issue → the contracts.
4. **Pull request** from `feat/<app>-<short>` (or `fix/`, `chore/`, `docs/`) using `.github/PULL_REQUEST_TEMPLATE.md`. The gate must pass locally and in CI:

   ```bash
   pnpm lint && pnpm typecheck && pnpm test && pnpm build
   ```

5. **Review.** A human reviews. `contract-change` pull requests need two reviewers, or the founder plus a review agent. Delete the ROADMAP row in the same pull request that finishes it.

Labels are listed in `.github/labels.md`.

## Parallel work

- Two agents never edit the same package at the same time unless their issues say the paths do not overlap.
- If a contract an agent needs is missing, it **stops** and opens a `contract-change` issue instead of defining the shape locally.
- Anything that touches an open decision (`docs/architecture/OPEN_DECISIONS.md`) or a ⛔ ROADMAP row waits for the decision.

## Prompts that work well

- "Read AGENTS.md, apps/invitation/AGENTS.md and issue #42. Plan first and list the files you will create, then implement. Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` before finishing."
- "You are implementing ROADMAP item MKT-05. The acceptance criterion is in its row and the page spec is WEBSITE.md §A6.3. Do not modify `packages/validators`; if its schemas are not enough, open a contract-change issue."

## Gemini CLI

Gemini CLI reads `GEMINI.md` by default. Point it at `AGENTS.md` with `contextFileName` in `.gemini/settings.json` (not committed today). Generative AI in the product goes through `packages/ai`, never `@google/genai` directly (ADR-0009).
