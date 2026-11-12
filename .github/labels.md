# Labels to create in GitHub

The issue templates in `.github/ISSUE_TEMPLATE` apply `agent:ready`, `bug`, `contract-change`, `needs-decision` and `epic`; create at least those.

- **Apps:** `app:marketing` (www and the `/admin` staff console), `app:invitation`, `app:api`, `app:worker`, `app:admin` (staff helpers), `app:portal`, `app:vendors`, `app:mobile`, `app:desktop`
- **Packages:** `pkg:db`, `pkg:validators`, `pkg:ui`, `pkg:i18n`, `pkg:auth`, `pkg:payments`, `pkg:pricing`, `pkg:logistics`, `pkg:ai`, `pkg:other`
- **Area:** `ops` (infra, CI, deployment: ROADMAP OPS), `compliance` (ROADMAP PRV), `memorial-mode`, `i18n`
- **Workflow:** `contract-change`, `agent:ready`, `agent:in-progress`, `needs-decision`, `epic`, `bug`, `good-first-task`

To create them: `gh label create <name>` for each, or a label-sync action later.
