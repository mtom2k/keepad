# Testing and verification

See [generated commands](reference.md), [CONTRIBUTING.md](../CONTRIBUTING.md), and [progress](progress.md) for the latest recorded evidence.

Run validation locally. GitHub hosts the private source repository and does not run CI/CD; historical runner results in progress are evidence from initial onboarding only.

## Automated checks

| Command | Purpose | Limits |
| --- | --- | --- |
| `npm run build` | Strict TypeScript checks and production renderer/main builds | Does not prove native behavior |
| `npm test` | Shared models, legacy appearance defaults, imports, persistence/recovery, immutable placement/copy/move, native destination metadata, cross-pad search ranking, and folder-sync consistency/recovery | Does not exercise OS permissions |
| `npm run test:desktop` | Playwright driving actual Electron with temporary data | Requires a graphical macOS/Windows session |
| `npm run format:check` | Source/test formatting | Not a semantic test |
| `npm run docs:check` | Local docs, links, generated reference, screenshots | Does not prove prose correctness |
| `npm run docs:check -- --base <ref>` | Source-to-documentation impact checks | Requires a valid Git base and human review |
| `npm run docs:screenshots` | Rebuild and capture curated native UI with sample data | Review images; not a substitute for interaction tests |

## Synchronization coverage

[Sync engine tests](../tests/sync.test.ts) use independent temporary stores with Mac/Windows platform fixtures and replicated directories. They verify independent-pad convergence, preferences/active selection staying local, concurrent-version preservation, keep-both resolution, edit/delete tombstones, out-of-order delivery, offline outbox restart, invalid/future/provider-duplicate files, changed-record integrity and missing known heads, device destinations/foreign paths, join/disconnect recovery, and malformed local sync metadata preserving pads. These fixtures test the common protocol and path rules on the host filesystem, not a native Windows installation or cloud provider.

[Native sync checks](../tests/sync-desktop.mjs) run within the desktop suite with a simulated Windows engine peer. They cover folder-picker confirmation/cancel, token validation, incoming UI updates, device-only destination execution with a stubbed opener, stale-draft rejection, conflict review/keep-both, blocked execution of unresolved pads, and disconnect. The conflict controls and review dialog are captured at the minimum editor size for visual inspection. Providers do not receive test data; filesystem profiles are disposable.

## Native suite coverage

[Launcher hover checks](../tests/launcher-hover.mjs) reproduce cached mouse hover on an already-visible summon, assert that Settings/Hide backgrounds and the Settings tooltip clear, and exercise mouse-click → hide/close editor → reopen. Fresh pointer movement must restore hover/tooltips; search must accept immediate typing and Tab must retain a visible focus indicator. The regression fails against the pre-fix build; it checks native Electron input state separately from existing keyboard-focus assertions. Actual tray mouse gestures and Windows native input remain manual checks.

[Launcher search checks](../tests/launcher-search.mjs) exercise immediate typing on summon, description/diacritic matches across pads, duplicate labels, keyboard selection and execution of the correct stored source, unchanged activation, no-result Enter, reset on resummon, Escape clear/hide order, result-menu routing, synthetic IME-key suppression, mouse execution in keep-open mode, native-refocus query retention, and dismissal of stale confirmations on resummon. The existing reopen tests now expect the search input instead of the launcher root and retain visible Tab focus checks. Pure tests verify ranking, all-term matching across fields, accent/case/whitespace normalization, exclusion of targets/pad names, stable duplicate results, and immutable source state.

[Button interaction checks](../tests/button-interactions.mjs) run within the desktop suite: right-click and Shift+F10, menu keyboard focus/bounds, duplicate/move/delete and cancellation, launcher-to-editor routing, Escape keeping the launcher visible when dismissing a menu, and absence of action execution. Real filesystem-backed `File` objects pass through Electron's preload path bridge via synthetic drag events. Tests cover single/multiple files, empty/occupied destinations, confirmation/cancel, persistence, forged files without a native path, and stale replacement rejection. Pure tests cover full-pad rejection, ID collisions, immutability, file/folder/application classification, and invalid/missing paths. Actual Finder/File Explorer dragging, permission prompts, and Windows native behavior still require manual checks.

Appearance checks cover Light/Dark selection, simulated live System color-scheme changes, native theme preference, independent pad colors, icon-free creation/editing, and restart persistence. Model/store tests load legacy settings without resetting data, round-trip `none` pad icons, retain local theme during import, and reject invalid appearance or button-icon values. Windows native title bars and actual OS appearance switching still need manual validation.

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
- No persistent Dock/taskbar entry; close keeps the process alive; Quit unregisters the shortcut.
- Drag real files, folders, and apps from Finder/File Explorer into empty and occupied editor cells; cancel/confirm replacements and reject multiple files. Check minimum-size menus and both appearance modes.
- Missing/denied files, macOS `.app` selection, Windows `.exe`/`.lnk`, default browser, clipboard, and protected-folder prompts.
- Shortcut collision and restoration; native startup registration from the installed app, then a real login/reboot.
- Search with duplicate labels, long descriptions, large result lists, screen readers, and real IME composition; verify search focus on actual tray/shortcut summon.
- All themes and layout bounds; dialog keyboard navigation; tooltips near each window edge; text scaling and minimum editor size.
- Backup round-trip between operating systems and clear path-repair guidance.
- On a real Mac and Windows pair: select corresponding Dropbox/OneDrive folders, keep them downloaded, edit independently/simultaneously/offline, restart, resolve conflicts, test provider-renamed files and device destinations, disconnect, and inspect recovery copies. Confirm platform preferences never transfer. Exercise permissions, UNC paths, file-provider hydration, and provider delays.
- Installer/uninstaller behavior, signatures, and a clean machine without developer dependencies.

Record the OS, architecture, commands, date, and result in progress/release notes. “Build configured” and “tested” are different claims.

## Screenshots

Run `npm run docs:screenshots` on a graphical desktop. It creates a temporary profile with starter pads, captures the editor, button context menu, launcher, launcher search, button editor, Dark Settings (including local-default synchronization), and a device-destination example using fictional Mac/Windows Sample paths, and removes the profile. App appearance is explicitly Light for the first five views and Dark for Settings and the destination example; captures wait for transient toasts/tooltips to disappear. It does not execute macro actions or read the real settings file. Quit other copies using the default shortcut if the script reports a conflict. Do not silently hide errors to obtain a clean screenshot.

Review all generated files in [screenshots](screenshots/README.md) before committing. UI changes require refreshed relevant images; documentation-only changes do not.

For a documentation-only audit, run documentation/reference checks and review assertions against source and prior test evidence. Do not report old native results as a fresh run. For impact comparisons, follow [base-selection and staging guidance](maintenance.md); the current checker excludes untracked files and does not validate heading anchors or external URLs.
