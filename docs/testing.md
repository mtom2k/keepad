# Testing and verification

See [generated commands](reference.md), [CONTRIBUTING.md](../CONTRIBUTING.md), and [progress](progress.md) for the latest recorded evidence.

Run validation locally. GitHub hosts the private source repository and does not run CI/CD; historical runner results in progress are evidence from initial onboarding only.

## Automated checks

| Command | Purpose | Limits |
| --- | --- | --- |
| `npm run build` | Strict TypeScript checks and production renderer/main builds | Does not prove native behavior |
| `npm test` | Shared models, legacy appearance defaults, imports, persistence/recovery, immutable placement/copy/move, native destination metadata, cross-pad search ranking, legacy local conversion/recovery, packaged-page sender matching, and locked-file save retry | Does not exercise OS permissions |
| `npm run test:desktop` | Playwright driving actual Electron with temporary data | Requires a graphical macOS/Windows session |
| `npm run format:check` | Source/test formatting | Not a semantic test |
| `npm run docs:check` | Local docs, links, generated reference, screenshots | Does not prove prose correctness |
| `npm run docs:check -- --base <ref>` | Source-to-documentation impact checks | Requires a valid Git base and human review |
| `npm run docs:screenshots` | Rebuild and capture curated native UI with sample data | Review images; not a substitute for interaction tests |

## Windows coverage

All suites run natively on Windows. Host-specific cases:

- [Destination tests](../tests/destinations.test.ts) exercise macOS `.app` bundles on POSIX hosts and `.exe`/`.lnk` application files on Windows. Real probes need host-native paths; a Windows temporary path is correctly `foreign` to the darwin rules. Symlink and `chmod` denial cases remain POSIX-only.
- [Replacement tests](../tests/store-replace.test.ts) check bounded retry of `EPERM`/`EACCES`/`EBUSY`. On Windows they also hold `keepad.json` open through PowerShell (`FileShare.Read`, no delete sharing), first proving that a plain rename fails, then that a store save succeeds once the lock is released.
- [Path tests](../tests/paths.test.ts) check that the IPC sender matcher accepts the bundled page from folders containing spaces, accents, `[ ]`, `#` and `&` (Chromium leaves brackets unescaped). They also check that it rejects other pages, other schemes, and the file page while the dev server is configured.
- The desktop suite records shortcuts with the platform's modifiers: Ctrl/Win/Alt/Shift labels and `CommandOrControl`/`Super` on Windows, `⌘⌃⌥⇧` and `CommandOrControl`/`Control` on macOS. It also asserts that only macOS has an application menu.
- [Login-item check](../tests/login-item-windows.mjs) runs against a packaged build: `npm run package:dir`, then `node tests/login-item-windows.mjs [path\to\KeePad.exe]`. Development runs block launch at login. With a temporary profile, it turns startup on, simulates Task Manager's Disable by writing the `StartupApproved` flag, and focuses the editor. It then expects the setting to uncheck through a revisioned save, to re-approve when checked, and to reconcile removal and adoption of the Run entry at the next start. It refuses to run if a real `electron.app.KeePad` Run entry exists, and removes its own entries afterwards. It fails on builds without reconciliation.

Playwright's `waitForFunction` does not re-check an async predicate: a Promise is truthy, so it resolves after one evaluation. Wait for saved state with `waitForSaved(page, predicate, message)` from [saved-state.mjs](../tests/saved-state.mjs). It polls `keepad.load()` from Node every 50 ms and fails with the message after 10 s. Keep `waitForFunction` for synchronous DOM conditions only.

For packaged builds, drive `release/win-unpacked/KeePad.exe` (or an installed copy) with Playwright's `executablePath` and `--user-data-dir=<temporary folder>`. Packaged builds ignore `KEEPAD_TEST_DATA`. To check launch at login, simulate the portable wrapper by setting `PORTABLE_EXECUTABLE_FILE`.

Documentation screenshots contain host-dependent content: shortcut labels (`Ctrl Shift` versus `⌘ ⇧`), system font, scrollbars, and whether the fictional sample paths show as missing or foreign. The capture script fixes the editor content area at 980×700 so the image size matches across hosts. The committed set is from Windows 11 (see [provenance](screenshots/README.md)). Recapture on one platform for the whole set, and after version bumps, because the Settings footer shows the version.

## Local-only conversion coverage

[Migration tests](../tests/local-migration.test.ts) use temporary profiles to verify Mac/Windows destination preservation, cached edits/preferences/IDs, full recovery copies, unchanged external-folder sentinels, one-time restart behavior, ignored outdated overrides, unsupported metadata and invalid-path failures, backup failure, and write-failure retry. These tests have recorded runs on macOS and Windows 11 x64. Backup-denial coverage using Unix permissions is POSIX-only; real provider folders and Windows access-control failures remain manual checks.

The desktop suite checks that the preload exposes no synchronization API, repaired targets are saved in ordinary state, and saved JSON has no device envelope. The Electron build clears generated output before compiling so removed modules cannot leak into packages.

## Destination-check coverage

[Destination tests](../tests/destinations.test.ts) use temporary files/directories to cover available, missing, wrong-type, foreign paths, dangling symlinks, Unix access denial when not running as root, cross-pad coverage, URL/text exclusion, and scan immutability. A controlled slow-probe test verifies bounded waits, deduplication, retained concurrency slots after timeout, and resumed checks after settlement. Mac application-bundle structure is simulated; this does not launch an app.

[Native repair checks](../tests/destinations-desktop.mjs) run in the desktop suite with stubbed pickers and openers. They check reporting, picker cancel, rejected wrong-type replacements, local-only repair, unchanged activation and saved replacement targets, stale revisions before/during the native picker, refreshing reports, and repair-tooltip bounds at minimum window size. Native Windows permission behavior, network/provider timeouts/hydration, and real application/shortcut validity remain manual release checks.

## Native suite coverage

[Launcher hover checks](../tests/launcher-hover.mjs) reproduce cached mouse hover on an already-visible summon, assert that Settings/Hide backgrounds and the Settings tooltip clear, and exercise mouse-click → hide/close editor → reopen. Fresh pointer movement must restore hover/tooltips; search must accept immediate typing and Tab must retain a visible focus indicator. The regression fails against the pre-fix build; it checks native Electron input state separately from existing keyboard-focus assertions. The full suite has recorded native macOS and Windows runs. The installed Windows launcher was also summoned and dismissed by tray click on 2026-09-25; remaining tray-menu and platform input gaps are listed in progress.

[Launcher search checks](../tests/launcher-search.mjs) exercise immediate typing on summon, description/diacritic matches across pads, duplicate labels, keyboard selection and execution of the correct stored source, unchanged activation, no-result Enter, reset on resummon, Escape clear/hide order, result-menu routing, synthetic IME-key suppression, mouse execution in keep-open mode, native-refocus query retention, and dismissal of stale confirmations on resummon. The existing reopen tests now expect the search input instead of the launcher root and retain visible Tab focus checks. Pure tests verify ranking, all-term matching across fields, accent/case/whitespace normalization, exclusion of targets/pad names, stable duplicate results, and immutable source state.

[Button interaction checks](../tests/button-interactions.mjs) run within the desktop suite: right-click and Shift+F10, menu keyboard focus/bounds, duplicate/move/delete and cancellation, launcher-to-editor routing, Escape keeping the launcher visible when dismissing a menu, and absence of action execution. Real filesystem-backed `File` objects pass through Electron's preload path bridge via synthetic drag events. Tests cover single/multiple files, empty/occupied destinations, confirmation/cancel, persistence, forged files without a native path, and stale replacement rejection. Pure tests cover full-pad rejection, ID collisions, immutability, file/folder/application classification, and invalid/missing paths. The suite has recorded runs on macOS and Windows. Actual Finder/File Explorer file-drop gestures and permission prompts still require manual checks; installed Windows button menus and within-pad move/swap gestures have separate evidence in progress.

Appearance checks cover Light/Dark selection, simulated live System color-scheme changes, native theme preference, independent pad colors, icon-free creation/editing, and restart persistence. Model/store tests load legacy settings without resetting data, round-trip `none` pad icons, retain local theme during import, and reject invalid appearance or button-icon values. The Windows editor’s menu/taskbar behavior was checked on an installed build; live OS appearance switching and platform title-bar appearance still need manual validation.

Positioning coverage includes native mouse dragging into empty/occupied cells, canceled outside-grid drops, absence of accidental edit dialogs, click/arrow-key position selection, canceled position drafts, new-button placement, launcher non-draggability, and restart persistence of a dragged position. Pure placement tests also check action preservation, immutability, new-button displacement, and invalid slot bounds.

[tests/desktop.mjs](../tests/desktop.mjs) covers creation/editing, images, themes, layout steppers and bounds, preservation of buttons, single-click selection versus double-click activation, explicit activation, independent preview, centered launcher bounds, exposed pad controls, stale-focus reset, keyboard focus, tooltip bounds, native clipboard, backup merge, stale saves, unsafe URLs, missing-file recovery, and restart persistence.

It uses a temporary `KEEPAD_TEST_DATA` path, copies supported clipboard formats into new Electron `ClipboardItem` objects for restoration, and stubs file/URL shell handlers to avoid opening unrelated applications. The main process accepts the test profile override only in development, not packaged builds.

Clipboard entries with no MIME types are omitted from the test's saved clipboard snapshot: Electron can return these on a fresh runner, but cannot construct a writable item from them. The repository uses `.gitattributes` to retain LF text on Windows checkouts so Prettier and generated-reference comparisons match macOS/Linux.

Run native suites and screenshot capture sequentially; concurrent Electron automation can steal native keyboard focus and produce misleading failures.

The reopen keyboard test waits for the launcher document to gain native focus and for animation-frame focus resets to settle before sending Tab. An already focused search input in a hidden window alone is not proof that the OS has finished showing it. Failure output includes the actual focused control, focus visibility, and document focus.

The suite does **not** click the native tray menu, verify real shell-launched apps, grant OS permissions, log in/out, certify multi-monitor arrangements, or validate signatures/notarization. Blur-hiding is suppressed in the test environment. Clipboard APIs in the pinned Electron version are asynchronous; restoration constructs writable clipboard items rather than reusing read-only items returned by `read()`.

## Manual checks before release

- Tray left-click and every right-click item, including version and Quit.
- Summon/hide while another application is focused; verify centering on each display, keyboard layout, display scale, and taskbar/menu-bar placement.
- No macOS Dock icon or launcher taskbar button. The visible Windows editor has a taskbar button, which disappears when hidden; close keeps the process alive and Quit unregisters the shortcut.
- Drag real files, folders, and apps from Finder/File Explorer into empty and occupied editor cells; cancel/confirm replacements and reject multiple files. Check minimum-size menus and both appearance modes.
- Missing/denied files, macOS `.app` selection, Windows `.exe`/`.lnk`, default browser, clipboard, and protected-folder prompts.
- Shortcut collision and restoration; native startup registration from the installed app, then a real login/reboot.
- Search with duplicate labels, long descriptions, large result lists, screen readers, and real IME composition; verify search focus on actual tray/shortcut summon.
- All themes and layout bounds; dialog keyboard navigation; tooltips near each window edge; text scaling and minimum editor size.
- Backup round-trip between operating systems and clear path-repair guidance.
- On both target platforms, upgrade a disposable legacy profile with local destinations and verify recovery copies, effective paths, unchanged old folders, and restart. Exercise native permissions, UNC paths, unavailable drives, and provider-backed file hydration for ordinary file actions.
- Installer/uninstaller behavior, signatures, and a clean machine without developer dependencies.

Record the OS, architecture, commands, date, and result in progress/release notes. “Build configured” and “tested” are different claims. The 2026-09-25 progress entry lists which Windows items above were exercised by hand on an installed build and which remain open.

## Screenshots

Run `npm run docs:screenshots` on a graphical desktop. It creates a temporary profile with starter pads, fixes the editor content area at 980×700, captures the editor, button context menu, launcher, launcher search, button editor, Dark Settings and the checker using fictional Mac/Windows Sample paths, and removes the profile. App appearance is explicitly Light for the first five views and Dark for Settings and destination checking; captures wait for transient toasts/tooltips to disappear. It does not execute macro actions or read the real settings file. Quit other copies using the default shortcut if the script reports a conflict. Do not silently hide errors to obtain a clean screenshot.

Review all generated files in [screenshots](screenshots/README.md) before committing. UI changes require refreshed relevant images; documentation-only changes do not.

For a documentation-only audit, run documentation/reference checks and review assertions against source and prior test evidence. Do not report old native results as a fresh run. For impact comparisons, follow [base-selection and staging guidance](maintenance.md); the current checker excludes untracked files and does not validate heading anchors or external URLs.
