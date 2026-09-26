# 0013: Windows platform integration and packaging

- Status: Accepted
- Recorded: 2026-09-25
- Supersedes: None; refines [0001](0001-electron-and-process-boundaries.md), [0003](0003-traditional-utility-interface.md), and [0004](0004-pad-selection-and-launcher-behavior.md) for Windows

## Context

Until 2026-09-25 KeePad had only been exercised on macOS; Windows was cross-packaged from a Mac. The first native Windows 11 x64 run (installed NSIS build, portable build, and the automated suites) found platform defects that the Mac-hosted checks could not reveal:

- Installing to a folder whose path contains characters such as `[` or `]` made every IPC request fail with "Request rejected.". The sender check compared URL strings, and Chromium and Node escape those characters differently.
- Clicking the notification-area icon while the launcher was open re-summoned it. On Windows, pressing the icon blurs (and hides) the launcher before the click event arrives.
- The macOS Edit menu template rendered as a visible "Edit" menu bar in the Windows editor.
- The editor skipped the taskbar, so once it was covered by another window it could only be recovered through the tray or launcher.
- The shortcut recorder mapped macOS Control to Command, and the Windows key to Ctrl. The display used macOS glyphs such as `⇧` on Windows.
- The portable build registered its temporary extraction folder for launch at login; that folder is deleted when the app exits.
- Atomic saves use rename-over-destination, which Windows refuses while antivirus/indexing software holds the file without delete sharing.

## Decision

- **Sender validation:** compare the sender's file path to the bundled `dist/index.html` instead of comparing URL strings. The comparison is case-insensitive on Windows and exact on POSIX. Any query or hash on that exact page is accepted; the development server rule is unchanged. Frame, window, and origin restrictions are otherwise unchanged.
- **Tray toggle:** a tray click within 600 ms of a blur-hide is treated as the dismissal. Other clicks toggle as before. macOS behavior is unchanged when blur does not precede the click.
- **Application menu:** keep the Edit role menu only on macOS, where it supplies Command-key clipboard shortcuts for an accessory app that never shows it. Use no application menu on Windows. Chromium's own Ctrl+A/C/X/V/Z handling in text fields was verified on the installed build.
- **Editor taskbar button:** the visible editor gets a normal taskbar button on Windows; the launcher still skips the taskbar. Hidden windows have no button, so closing the editor still leaves KeePad in the notification area only. The app sets AppUserModelID `app.keepad.desktop` to match the installer shortcut. macOS ignores the option, and the accessory policy still hides the Dock icon.
- **Shortcut recording:** `CommandOrControl` records the platform's primary modifier (Command on macOS, Ctrl on Windows). The other modifier is stored distinctly: `Control` on macOS, `Super` (Windows key) on Windows. Labels use native names: `⌘⌃⌥⇧` on macOS, `Ctrl`/`Win`/`Alt`/`Shift` on Windows. Existing stored shortcuts keep their meaning.
- **Launch at login:** when running from electron-builder's portable wrapper (`PORTABLE_EXECUTABLE_FILE`), register that stable executable. Always use the Run value name `electron.app.KeePad`, the name earlier builds wrote before the app set an AppUserModelID, so turning the setting off still removes them.
- **Atomic replacement:** retry the final rename on `EPERM`, `EACCES`, or `EBUSY` with bounded backoff (about 1.3 s in total), then fail as before. Validation, temp-file writing, in-memory commit order, and revision rules are unchanged.
- **Packaging:** Windows targets are an assisted per-user NSIS installer (`KeePad-Setup-<version>.exe`) and a portable executable (`KeePad-Portable-<version>.exe`). The portable build uses the same `%APPDATA%\KeePad` profile and single-instance lock as an installed copy. It is not a data-in-folder portable mode.

## Alternatives

- Normalizing URL strings with `pathToFileURL` on both sides still depends on escaping rules; comparing decoded paths removes that dependency.
- Using `mousedown` or tray `mouse-down` events to detect the toggle is Windows-specific and not uniformly available; the blur timestamp works with the existing hide-on-blur rule.
- Hiding the Windows menu per window (`autoHideMenuBar`/`removeMenu`) would still reveal it on Alt and keep an unused menu.
- A data-beside-the-exe portable profile would need a separate storage-location decision, migration rules, and conflict handling with the installed copy. It was not requested.
- Showing the editor in the taskbar at all times, or never, were rejected: the first loses the tray-utility model, the second loses windows.

## Consequences

Windows now behaves like a conventional notification-area utility. No persisted-schema or IPC-surface change is involved. Old settings files, backups, and shortcuts load unchanged. A user who had enabled launch at login with an older build keeps the same Run entry.

The 600 ms tray window is a heuristic: a deliberate tray click in that interval after clicking elsewhere does nothing, and the next click summons. The file lock retry cannot overcome a lock held for longer than about 1.3 s. The portable build shares data with an installed copy by design; they cannot run concurrently.

Remaining unverified: code signing and SmartScreen reputation, multiple monitors and mixed DPI, IME users for whom Ctrl+Shift+Space is already taken, real Explorer drag gestures, the tray right-click menu under automation, a real sign-out/sign-in for launch at login, and Windows on ARM.

## Evidence and documentation

Implementation: [main process](../../electron/main.ts), [paths](../../electron/paths.ts), [store](../../electron/store.ts), [renderer](../../src/main.tsx), [components](../../src/components.tsx), [package configuration](../../package.json). Tests: [path matching](../../tests/paths.test.ts), [replacement retry and a real Windows lock](../../tests/store-replace.test.ts), [desktop suite](../../tests/desktop.mjs). Results and manual evidence are in [progress](../progress.md). Guides: [architecture](../architecture.md), [UX](../ux.md), [data model](../data-model.md), [releasing](../releasing.md), [testing](../testing.md), and [troubleshooting](../troubleshooting.md).
