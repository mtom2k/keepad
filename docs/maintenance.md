# Keeping documentation current

Documentation is maintained in the same change as implementation, not in a later cleanup phase. The author owns the update; the reviewer checks it. [AGENTS.md](../AGENTS.md) carries this rule for coding agents, [CONTRIBUTING.md](../CONTRIBUTING.md) for humans, and the PR template asks for concrete documentation impact.

## Change map

| When this changes | Review/update |
| --- | --- |
| User-visible interactions or visual design | README as relevant, UX, progress; refresh screenshots if pictured |
| Main process, preload, IPC, lifecycle, privileged actions | Architecture, relevant ADR/data model/testing, progress |
| Persisted models, constraints, imports, defaults | Data model, architecture as relevant, generated reference, tests, progress |
| Package scripts, dependencies, app version/identity | Generated reference, setup/release guides as relevant, progress |
| Tests or CI | Testing/releasing guides as relevant, progress |
| Security, storage, platform, or architectural decision | New/superseding ADR, affected guides, progress |
| New limitation or completed milestone | Progress and troubleshooting; README if availability changes |

## Automated safeguards

- `docs:generate` renders [reference.md](reference.md) from `package.json`, `package-lock.json`, and shared model exports. Do not edit generated content manually.
- Reference choices distinguish application themes, pad themes, pad icons (including `none`), and required action-button icons. Keep these distinctions when extending shared choices.
- `docs:check` checks required knowledge-base files, Markdown-relative file/image links, screenshot PNGs, and generated-reference freshness.
- `docs:check -- --base <Git ref>` adds source-impact gates from [documentation-impact.json](documentation-impact.json). Relevant source changes must include progress plus the mapped documentation. UI implementation changes must include UX or README updates. This gate intentionally checks participation, not semantic completeness.
- Run these checks locally before committing/pushing. GitHub is private source storage; there is no CI/CD workflow. Follow [ADR 0006](adr/0006-private-source-hosting-with-local-checks.md) and do not introduce hosted automation without an owner request.

These checks cannot guarantee that prose never becomes stale. They cannot infer design intent, check every statement, or decide whether a screenshot accurately represents a changed workflow. Human/agent review is required. Do not game the gate with date-only changes, irrelevant sentences, or rule removal.

## Progress and ADR policy

Add dated, outcome-focused entries to [progress](progress.md). Record evidence and what was not tested. Keep the current-status section accurate; historical entries are history, not perpetual claims about the current build.

For a durable decision, copy [the ADR template](adr/template.md), assign the next number, link sources, and add it to the index. Accepted ADRs are historical records: amend factual errors transparently, but record a changed decision in a new ADR that supersedes the old one. The initial ADRs explicitly record the already implemented design retrospectively.

## Screenshot policy

Regenerate from sample data with `docs:screenshots`, inspect the resulting images, and commit them with the UI change when they are affected. See [provenance](screenshots/README.md). Never use a screenshot of private user data or silently manipulate a screenshot to hide an app failure.

At releases, perform a full documentation read-through: installation availability, commands, screenshots, platform claims, known limitations, and ADR status. Ongoing task/PR discipline is the maintenance mechanism; no background automation is assumed.
