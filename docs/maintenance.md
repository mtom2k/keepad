# Keeping documentation current

Documentation is maintained in the same change as implementation, not in a later cleanup phase. The author owns the update; the reviewer checks it. [AGENTS.md](../AGENTS.md) carries this rule for coding agents, [CONTRIBUTING.md](../CONTRIBUTING.md) for humans, and the PR template asks for concrete documentation impact.

**Definition of done:** implemented behavior, current guides, validation evidence, and handoff must agree before work is declared complete. This applies to fixes, refactors, dependency/configuration changes, and discoveries that change our knowledge—not just new features. The rule applies equally to direct commits and pull requests.

## During each change

1. Identify affected documents while planning the work, using the map below. Read the implementation before editing factual claims.
2. Update behavior and documentation together as the design settles. Explain compatibility, failure behavior, and relevant limitations; keep user instructions separate from developer internals.
3. Reconcile all related guides before handoff. Current guides describe what exists; progress records dated outcomes; ADRs preserve decisions; generated reference owns commands/defaults/dependency versions. Link those canonical sources instead of copying facts into another checklist.
4. Run the relevant local checks, review changed screenshots, and record evidence in progress. If work is incomplete, use the explicit in-progress handoff format instead of making a completion claim.
5. Complete [handoff](handoff.md). Never leave essential rationale or a known limitation only in conversation history.

## Change map

| When this changes | Review/update |
| --- | --- |
| User-visible interactions or visual design | README as relevant, UX, progress; refresh screenshots if pictured |
| Main process, preload, IPC, lifecycle, privileged actions | Architecture, relevant ADR/data model/testing, progress |
| Local storage, legacy conversion, destination repair | Local conversion/recovery guide, ADR, architecture/data model, testing, progress |
| Persisted models, constraints, imports, defaults | Data model, architecture as relevant, generated reference, tests, progress |
| Package scripts, dependencies, app version/identity | Generated reference, setup/release guides as relevant, progress |
| Tests, screenshot tooling, or local build configuration | Testing/releasing guides as relevant, progress |
| Contributor instructions or documentation process | AGENTS, contributing, handoff, maintenance, PR template as relevant, progress |
| Security, storage, platform, or architectural decision | New/superseding ADR, affected guides, progress |
| New limitation or completed milestone | Progress and troubleshooting; README if availability changes |

## Automated safeguards

- `docs:generate` renders [reference.md](reference.md) from `package.json`, `package-lock.json`, and shared model exports. Do not edit generated content manually.
- Reference choices distinguish application themes, pad themes, pad icons (including `none`), and required action-button icons. Keep these distinctions when extending shared choices.
- `docs:check` checks required knowledge-base files, Markdown-relative file/image links, screenshot PNGs, and generated-reference freshness.
- `docs:check -- --base <Git ref>` adds source-impact gates from [documentation-impact.json](documentation-impact.json). Relevant source changes must include progress plus the mapped documentation. UI implementation changes must include UX or README updates. This gate intentionally checks participation, not semantic completeness.
- Run these checks locally before committing/pushing. GitHub is private source storage; there is no CI/CD workflow. Follow [ADR 0006](adr/0006-private-source-hosting-with-local-checks.md) and do not introduce hosted automation without an owner request.

These checks cannot guarantee that prose never becomes stale. They cannot infer design intent, check every statement, or decide whether a screenshot accurately represents a changed workflow. Human/agent review is required. Do not game the gate with date-only changes, irrelevant sentences, or rule removal.

### Choosing the comparison base

Record the starting commit before work. Before committing, compare against that revision; on an uncommitted direct change, `--base HEAD` compares tracked/staged edits. Before pushing committed work, compare against the pre-change revision or the appropriate branch base (often an up-to-date `origin/main`). After a push, `origin/main` may already equal HEAD, so that comparison no longer audits the delivered change.

Stage new files before the comparison: `git diff` does not include untracked files. The impact map covers its listed paths, not every possible future file; review the map when adding a new source/configuration category. It checks file participation, not whether a particular paragraph changed correctly. Link checks cover inline relative file/image destinations, not heading anchors, reference-style Markdown, external URL availability, or factual accuracy. No hook or server-side gate enforces these local commands.

## Whole-documentation audits

At a milestone, release, handoff after a long gap, or owner request, read the entire current knowledge base against source and available evidence. Check feature status, names, defaults, limits, permissions, persistence/import compatibility, command availability, screenshots, platform claims, and open issues. Review ADR status and links without rewriting historical decisions to make them look current.

Record the audited source revision, discrepancies corrected, checks actually run, and unverified areas in progress. A correct document need not receive a cosmetic edit, and a documentation-only audit does not require recapturing unchanged UI or rerunning unrelated native tests. Do not refresh a “last reviewed” date without performing the review.

## Progress and ADR policy

Add dated, outcome-focused entries to [progress](progress.md). Record evidence and what was not tested. Keep the current-status section accurate; historical entries are history, not perpetual claims about the current build.

For a durable decision, copy [the ADR template](adr/template.md), assign the next number, link sources, and add it to the index. Accepted ADRs are historical records: amend factual errors transparently, but record a changed decision in a new ADR that supersedes the old one. The initial ADRs explicitly record the already implemented design retrospectively.

## Screenshot policy

Regenerate from sample data with `docs:screenshots`, inspect the resulting images, and commit them with the UI change when they are affected. See [provenance](screenshots/README.md). Never use a screenshot of private user data or silently manipulate a screenshot to hide an app failure.

At releases, perform a full documentation read-through: installation availability, commands, screenshots, platform claims, known limitations, and ADR status. Ongoing task/PR discipline is the maintenance mechanism; no background automation is assumed.
