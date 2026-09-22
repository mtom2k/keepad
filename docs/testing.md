# Testing and verification

See [generated commands](reference.md), [CONTRIBUTING.md](../CONTRIBUTING.md), and [progress](progress.md) for the latest recorded evidence.

## Automated checks

| Command | Purpose | Limits |
| --- | --- | --- |
| `npm run build` | Strict TypeScript checks and production renderer/main builds | Does not prove native behavior |
| `npm test` | Shared models, allowed destinations, import IDs/settings, atomic reload, corrupt-file recovery | Does not exercise OS permissions |
| `npm run test:desktop` | Playwright driving actual Electron with temporary data | Requires a graphical macOS/Windows session |
| `npm run format:check` | Source/test formatting | Not a semantic test |
| `npm run docs:check` | Local docs, links, generated reference, screenshots | Does not prove prose correctness |
| `npm run docs:check -- --base <ref>` | Source-to-documentation impact checks | Requires a valid Git base and human review |
| `npm run docs:screenshots` | Rebuild and capture curated native UI with sample data | Review images; not a substitute for interaction tests |

## Native suite coverage

[tests/desktop.mjs](../tests/desktop.mjs) covers creation/editing, images, themes, layout steppers and bounds, preservation of buttons, single-click selection versus double-click activation, explicit activation, independent preview, centered launcher bounds, exposed pad controls, stale-focus reset, keyboard focus, tooltip bounds, native clipboard, backup merge, stale saves, unsafe URLs, missing-file recovery, and restart persistence.

It uses a temporary `KEEPAD_TEST_DATA` path, copies supported clipboard formats into new Electron `ClipboardItem` objects for restoration, and stubs file/URL shell handlers to avoid opening unrelated applications. The main process accepts the test profile override only in development, not packaged builds.

The suite does **not** click the native tray menu, verify real shell-launched apps, grant OS permissions, log in/out, certify multi-monitor arrangements, or validate signatures/notarization. Blur-hiding is suppressed in the test environment. Clipboard APIs in the pinned Electron version are asynchronous; restoration constructs writable clipboard items rather than reusing read-only items returned by `read()`.

## Manual checks before release

- Tray left-click and every right-click item, including version and Quit.
- Summon/hide while another application is focused; verify centering on each display, keyboard layout, display scale, and taskbar/menu-bar placement.
- No persistent Dock/taskbar entry; close keeps the process alive; Quit unregisters the shortcut.
- Missing/denied files, macOS `.app` selection, Windows `.exe`/`.lnk`, default browser, clipboard, and protected-folder prompts.
- Shortcut collision and restoration; native startup registration from the installed app, then a real login/reboot.
- All themes and layout bounds; dialog keyboard navigation; tooltips near each window edge; text scaling and minimum editor size.
- Backup round-trip between operating systems and clear path-repair guidance.
- Installer/uninstaller behavior, signatures, and a clean machine without developer dependencies.

Record the OS, architecture, commands, date, and result in progress/release notes. “Build configured” and “tested” are different claims.

## Screenshots

Run `npm run docs:screenshots` on a graphical desktop. It creates a temporary profile with starter pads, captures the editor, launcher, and button editor, and removes the profile. It does not execute macro actions or read the real settings file. Quit other copies using the default shortcut if the script reports a conflict. Do not silently hide errors to obtain a clean screenshot.

Review all generated files in [screenshots](screenshots/README.md) before committing. UI changes require refreshed relevant images; documentation-only changes do not.
