# Contributing to KeePad

Start with [AGENTS.md](AGENTS.md) and [current development status](docs/progress.md).

## Local setup

Use Node.js 24 and npm. On macOS or Windows, clone the repository, open a terminal in its folder, then run:

```sh
npm ci
npm run dev
```

The app appears in the menu bar / notification area. A browser preview (`npm run dev:web`) is for layout work only: it cannot validate tray behavior, global shortcuts, native dialogs, or file actions.

## Change workflow

1. Create a branch with a descriptive name.
2. Read the relevant source, guide, and ADR before editing.
3. Make the smallest coherent change. Preserve local data and the selection / active / preview distinction.
4. Run checks appropriate to the change:

| Change | Validation |
| --- | --- |
| Any source change | `npm run build`, `npm run format:check` |
| Models, storage, import, validation | `npm test` |
| Renderer, IPC, windows, shortcuts, actions | `npm run test:desktop` on a real desktop |
| Visible interface | Review screenshots; refresh `npm run docs:screenshots` |
| Documentation, commands, workflow | `npm run docs:generate`, `npm run docs:check` |
| Packaging or release | Follow [release instructions](docs/releasing.md) on the target OS |

5. Update the relevant docs and add a dated progress entry in the same commit. Record design changes in an ADR.
6. Inspect `git diff --check` and the staged diff. Exclude user data, logs, credentials, builds, and generated test artifacts.
7. Commit and push after the relevant local checks pass. When using a pull request, complete the documentation impact checklist and obtain review before merging. GitHub is private source storage; CI/CD is not configured or required.

## Documentation checks

`npm run docs:check` checks required files, relative Markdown links, screenshot presence, and generated-reference freshness. With `--base <ref>`, it also compares source changes against [documentation-impact.json](docs/documentation-impact.json). Run this locally before pushing or submitting a pull request.

For example:

```sh
git fetch origin
npm run docs:check -- --base origin/main
```

A check can identify missing updates, not determine whether an explanation is correct. Read the changed behavior and its documentation together. Do not refresh images or write tests solely to silence a gate when the change has no relevant effect; document that distinction.

## Testing safely

The desktop suite creates a temporary data profile, restores the clipboard, and stubs file/URL opening. It does not test real external applications, signing, OS permission prompts, or mouse clicks on the native tray menu. Screen-centering geometry and the shared launcher path are covered. See [testing](docs/testing.md) for coverage and limitations.

For exploratory work with real profiles, export a backup first. Never overwrite a developer's installed app as a test fixture. Reversible local work does not require ceremonial approvals; publishing, distribution, and credential changes need the relevant authorization.

## Decisions and licensing

Use [the ADR template](docs/adr/template.md) for consequential decisions. This private project has not selected a distribution license. Do not add a license, public release, or auto-update provider without the owner's decision.
