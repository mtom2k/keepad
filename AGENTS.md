# KeePad contributor instructions

These instructions apply to the entire repository, including work performed by coding agents.

## Start here

1. Read [the documentation index](docs/README.md), [current progress](docs/progress.md), and [architecture](docs/architecture.md).
2. Read the relevant [ADRs](docs/adr/README.md) before changing a design decision.
3. Inspect the current source and tests. Documentation is guidance, not permission to ignore contradictory implementation evidence. Resolve discrepancies in the same change.

## Product rules

- Keep the interface a compact, traditional desktop utility. Use system fonts, familiar icons, brief labels, and useful tooltips. No promotional slogans, decorative cards, bloom, or unnecessary copy. README emojis are welcome; this does not prescribe app styling.
- KeePad lives in the macOS menu bar / Windows notification area. Closing a window hides it; Quit exits the process.
- Single-click selects a pad for editing. Double-click or Make Active activates it. Creating, duplicating, and previewing pads do not activate them.
- All launcher entry points center on the pointer's display work area. Preview selection is temporary.
- Preserve saved actions when resizing; do not silently truncate buttons. Keep keyboard focus visible, but do not restore stale launcher-button focus on reopen.
- Respect existing user data. Use temporary profiles for tests and documentation screenshots. Do not modify another installed KeePad copy just because its name matches; verify its bundle identity and path.

## Engineering rules

- GitHub is private source storage. Do not add CI/CD or GitHub Actions unless the owner requests it. Run relevant checks locally.
- Use the existing Electron / React / TypeScript stack and shared Zod contracts. Validate privileged requests in the main process.
- Do not add arbitrary commands, keyboard injection, broader permissions, cloud synchronization, telemetry, or remote content without an explicit product request and an ADR.
- Keep `sandbox`, `contextIsolation`, sender validation, navigation restrictions, and URL/image allowlists intact.
- Preserve atomic writes, optimistic revisions, additive imports, and recovery copies. A schema change needs a migration/recovery plan and tests.
- Await Electron clipboard operations. Use the pinned dependency's types when APIs differ from memory.
- Run appropriate checks from [CONTRIBUTING.md](CONTRIBUTING.md). Do not claim Windows, signing, installation, or manual tray behavior was verified when it was not.

## Documentation is part of every change

Before calling a task complete:

1. Update affected guides in the same commit as the behavior change; use [the change map](docs/maintenance.md).
2. Add a dated entry to [progress](docs/progress.md), stating what changed, evidence, and remaining limitations. Keep completed history accurate; distinguish planned work from shipped behavior.
3. Add an ADR for a consequential decision. Supersede accepted decisions with a new ADR rather than rewriting their history.
4. Regenerate [reference](docs/reference.md) with `npm run docs:generate` when package commands, defaults, or shared public choices change.
5. Regenerate screenshots with `npm run docs:screenshots` when their visible UI changes; review them before committing. Screenshots must contain sample data only.
6. Run `npm run docs:check`. Before a PR, also run `npm run docs:check -- --base origin/main` with an up-to-date base.

Do not satisfy documentation checks by changing only dates, adding empty prose, or suppressing a relevant rule. If a source change has no user-facing effect, explain its impact in the appropriate architecture, testing, or progress document.

No automated check proves that prose is semantically current. Review the affected documents; the scripts are a backstop, not a substitute. Do not promise unattended ongoing maintenance without an actual scheduled monitor.
