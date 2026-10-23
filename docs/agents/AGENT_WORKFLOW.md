# Agent workflow

## How work is split

1. **The founder** (or the planning agent) turns a ROADMAP row into a GitHub Issue using the **Agent task** template. One issue maps to one PR. The issue names:
   - the **paths** the agent may touch
   - the **contracts** it depends on
   - the **acceptance criteria** (copied from WEBSITE.md or ROADMAP)
2. **An agent picks up the issue:**
   - Claude Code: `claude` in the repo root, with "Work on issue #N".
   - Gemini CLI.
   - Cursor (the `.cursor/rules` mirror AGENTS.md).
   - A GitHub Issue agent: assign or label `agent:ready`.
3. **The agent reads**, in order: root `AGENTS.md` → app or package `AGENTS.md` → issue → contracts.
4. **The agent opens a PR** from `feat/<app>-<short>` using the PR template. CI must be green.
5. **Review:** a human reviews. `contract-change` PRs need two reviewers, or the founder plus a review agent.

## Labels

`app:marketing` `app:invitation` `app:portal` `app:vendors` `app:admin` `app:api` `app:worker` `app:mobile` `app:desktop` `pkg:*` `contract-change` `agent:ready` `agent:in-progress` `needs-decision` `compliance` `memorial-mode` `i18n` `good-first-task`

## Parallelism rules

- Two agents never edit the same package in parallel unless the issues are explicitly marked as non-overlapping.
- Apps can be built in parallel once Phase 0 contracts are merged.
- If a needed contract is missing, the agent **stops** and opens a `contract-change` issue rather than inventing it locally.

## Prompts that work well

- "Read AGENTS.md, apps/invitation/AGENTS.md and issue #42. Plan first, list the files you will create, then implement. Run pnpm lint typecheck test before finishing."
- "You are implementing ROADMAP item MKT-06. The acceptance criteria are in WEBSITE.md §A6.4. Do not modify packages/pricing. If its API is insufficient, write a contract-change issue."

## Gemini CLI note

Configure Gemini CLI to use `AGENTS.md` as its context file name (`contextFileName` in `.gemini/settings.json`). AI features must go through `packages/ai`, never `@google/genai` directly.
