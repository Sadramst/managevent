# scripts/

Repo-level scripts (no application code yet). Planned:

| Script                         | Issue  | Purpose                                                          |
| ------------------------------ | ------ | ---------------------------------------------------------------- |
| `validate-content.ts`          | MKT-02 | Validate `/content` against `content/schemas` (CI)               |
| `seo-thin-content-guard.ts`    | MKT-10 | Fail CI if an indexable city page is below the content threshold |
| `create-github-issues.ts`      | FND-15 | Create labels and issues from `ROADMAP.md` with the `gh` CLI     |
| `import-legacy-anniversary.ts` | INV-14 | Import the Appilico anniversary event and its `LegacySlug` rows  |
