# 0014: Windows startup setting follows the operating system

- Status: Accepted
- Recorded: 2026-09-25
- Supersedes: None; extends [0013](0013-windows-platform-integration.md)

## Context

"Start with your computer" was stored only in `settings.launchAtLogin` and applied to the OS when the user toggled it. Windows users can also change startup outside KeePad:

- Task Manager → Startup apps, or Settings → Apps → Startup (both set a `StartupApproved` flag);
- deleting the Run entry;
- enabling startup from the other KeePad copy (installed and portable builds share the Run value and the profile).

KeePad's checkbox then showed a state Windows would not honor. Before this change, a packaged regression check showed the checkbox staying on after a simulated Task Manager disable.

## Decision

On Windows packaged builds, treat what Windows will launch as the source of truth. Electron's `getLoginItemSettings().executableWillLaunchAtLogin` is true only when a Run entry for this executable exists and is not disabled. Portable builds query their stable portable path.

Reconcile the stored preference with that value:

- at startup, after loading the store and before windows open;
- whenever the editor window gains focus, which covers returning from Task Manager or Windows Settings.

A difference is saved through the serialized mutation queue as an ordinary validated write with an incremented revision, then broadcast. Toggling the checkbox still calls `setLoginItemSettings`, which also re-approves an entry disabled in Task Manager.

Development runs and macOS are unchanged. On macOS, Login Items approval states (`requires-approval`) have not been exercised, so mirroring them could uncheck a setting the user just enabled.

## Alternatives

- Showing the OS state only in the renderer, without saving it, leaves the stored value stale. The next toggle would then compare against the wrong previous value and could skip the OS change.
- Silently rewriting the stored value without a revision would let an older renderer snapshot overwrite it.
- Polling on a timer adds background work for a rare event. Focus and startup cover the realistic paths back into Settings.

## Consequences

The checkbox matches Windows after the user changes startup elsewhere. The first time drift is found, the revision advances. An editor dialog open at that moment reports that the library changed, like any other concurrent save; this only happens when startup state actually differs.

A disabled entry stays in the Run key until the user toggles the setting in KeePad (turning it off removes it). When both builds are used, only the copy the Run entry points to shows the setting as on. No schema, IPC, or permission change.

Unverified: macOS reconciliation (not implemented), per-machine (HKLM) entries created by administrators, and a real sign-out/sign-in.

## Evidence and documentation

Implementation: [main process](../../electron/main.ts). Packaged regression: [login-item check](../../tests/login-item-windows.mjs), which fails on the previous build and passes on this one. Results: [progress](../progress.md). Guides: [architecture](../architecture.md), [data model](../data-model.md), [UX](../ux.md), [testing](../testing.md), [troubleshooting](../troubleshooting.md).
