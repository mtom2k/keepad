# Contributing to KeePad

Start with [AGENTS.md](AGENTS.md) and [current development status](docs/progress.md).

Documentation is part of the definition of done. Every contributor, human or AI, owns the relevant updates in the same change as implementation. Use [the handoff procedure](docs/handoff.md) so another developer can continue without access to the original conversation.

## Local setup

Use Node.js 24 and npm. On macOS or Windows, clone the repository, open a terminal in its folder, then run:

```sh
npm ci
npm run dev
```

The app appears in the menu bar / notification area. A browser preview (`npm run dev:web`) is for layout work only: it cannot validate tray behavior, global shortcuts, native dialogs, or file actions.

## Change workflow

1. Inspect the working tree and record the starting revision. Use a descriptive branch for isolated work, or the owner's agreed direct-commit workflow; do not discard someone else's changes.
2. Read the relevant source, guide, and ADR before editing.
3. Make the smallest coherent change. Preserve local data and the selection / active / preview distinction.
4. Run checks appropriate to the change:

| Change | Validation |
| --- | --- |
| Any source change | `npm run build`, `npm run format:check` |
| Models, storage, import, validation | `npm test` |
| Renderer, IPC, windows, shortcuts, actions | `npm run test:desktop` on a real desktop |
| Visible interface | Review screenshots; refresh `npm run docs:screenshots` |
| Documentation only | `npm run docs:check`; verify changed claims against source and recorded evidence |
| Commands/defaults/shared choices | `npm run docs:generate`, review the result, then `npm run docs:check` |
| Packaging or release | Follow [release instructions](docs/releasing.md) on the target OS |

5. Use [the change map](docs/maintenance.md) to update all affected guides and add a dated progress entry in the same commit. Update the current-status table when appropriate. Record consequential design changes in an ADR; record operational lessons in troubleshooting. Explain why affected screenshots/reference need no regeneration when unchanged.
6. Inspect `git diff --check` and the staged diff. Exclude user data, logs, credentials, builds, and generated test artifacts.
7. Commit and push after the relevant local checks pass. When using a pull request, complete the documentation impact checklist and obtain review before merging. GitHub is private source storage; CI/CD is not configured or required.

## Documentation checks

`npm run docs:check` checks required files, relative Markdown links, screenshot presence, and generated-reference freshness. With `--base <ref>`, it also compares source changes against [documentation-impact.json](docs/documentation-impact.json). Run this locally before pushing or submitting a pull request.

Stage newly added files before the base comparison: the checker does not include untracked files. Compare against the pre-change revision or the correct branch base; comparing against HEAD after committing the work misses that work. For a branch that started from an up-to-date `origin/main`, for example:

```sh
git fetch origin
npm run docs:check -- --base origin/main
```

A check can identify missing updates, not determine whether an explanation is correct. Read the changed behavior and its documentation together. Do not refresh images or write tests solely to silence a gate when the change has no relevant effect; document that distinction.

Direct pushes follow the same documentation and local-validation rules. Before yielding unfinished work, record the remaining steps and exact verification status using [handoff](docs/handoff.md); do not call it complete.

## Testing safely

The desktop suite creates a temporary data profile, restores the clipboard, and stubs file/URL opening. It does not test real external applications, signing, OS permission prompts, or mouse clicks on the native tray menu. Screen-centering geometry and the shared launcher path are covered. See [testing](docs/testing.md) for coverage and limitations.

For exploratory work with real profiles, export a backup first. Never overwrite a developer's installed app as a test fixture. Reversible local work does not require ceremonial approvals; publishing, distribution, and credential changes need the relevant authorization.

## Decisions and licensing

Use [the ADR template](docs/adr/template.md) for consequential decisions. This private project has not selected a distribution license. Do not add a license, public release, or auto-update provider without the owner's decision.
