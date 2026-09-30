# 0015: Fixed, destination-free Sleep action

- Status: Accepted
- Recorded: 2026-09-27
- Supersedes: The OS-shell/clipboard-only implementation scope in [ADR 0001](0001-electron-and-process-boundaries.md); its narrow privileged boundary remains accepted

## Context

The owner requested Sleep and Lock, then explicitly removed Lock from scope when macOS Lock would require keyboard injection and Accessibility/Automation permission. Sleep is the priority. KeePad should offer a named action without exposing a command field or broadening permissions.

## Decision

Add `sleep` to the shared action enum, require an exactly empty target, and add a `moon` icon. The editor replaces destination controls with a short description. The saved button runs immediately from the launcher or global search, including a previewed pad, without another confirmation. Opening a preview, editing, importing, and saving never execute it. Activation remains unchanged. Lock is not implemented on either platform.

Main resolves saved IDs as before, then invokes only the fixed operation in `electron/system-actions.ts`:

- Windows: start the system Windows PowerShell by absolute path, hidden, without profiles or interaction. Its constant script loads `System.Windows.Forms` and calls `Application.SetSuspendState(PowerState.Suspend, false, false)`. Check the Boolean result. This uses the framework's native sleep handling, retains wake events, and does not request hibernation. No elevation, execution-policy bypass, or user-supplied script is allowed.
- macOS: execute `/usr/bin/pmset` with the sole fixed argument `sleepnow`. No keyboard events, AppleScript, Accessibility, or Automation permissions.
- Other platforms: return an unsupported-operation error. Browser preview cannot execute Sleep.

Use `execFile` with argument arrays and bounded output; do not pass labels, targets, or renderer data to OS tools. Reject another Sleep request while one is pending. The Windows call may return after wake, so do not apply a wall-clock process timeout that could falsely report failure on resume. Native errors release the guard for retry and use ordinary UI feedback. A successful return means "Sleep requested"; it does not certify the physical power transition. Hide-after-action applies on return. Sleep is not Lock and does not alter password-on-wake, power settings, or managed-device policy.

## Compatibility and recovery

Extend schema version 1 additively. Old files still load without a rewrite; original actions retain their validation. Before an existing library without Sleep/moon is saved with either, copy its complete bytes to a unique `before-system-actions` sibling. Backup failure aborts the save; replacement failure retains the original and backup. The rule also covers imports and moon icons on ordinary buttons/pads. The first file needs no backup; repeated saves/restarts with new values do not duplicate it. Removing all new values and later reintroducing them starts a new transition.

Older binaries reject these enum values and may enter their corrupt-file recovery; downgrade requires a pre-feature copy, or removal of all new values using 0.3.0 first. Preserve a current export separately. This is not a general schema migration framework and does not change legacy local-only conversion or access former shared folders. See [data model](../data-model.md).

## Alternatives and consequences

- A generic shell/PowerShell action would expose a much broader execution surface and is outside the request.
- Windows `rundll32` sleep recipes do not provide the typed suspend call used here. A compiled native addon/helper would add an architecture/build/distribution dependency; the built-in Windows PowerShell/.NET route instead depends on those components being permitted by policy.
- Screen-off is not sleep or guaranteed lock. Do not substitute it on either platform.
- A version-2 state conversion would add unnecessary rewriting for this additive extension. Explicit downgrade documentation and pre-feature recovery copies address the actual incompatibility.

## Evidence and documentation

Implementation: [system actions](../../electron/system-actions.ts), [main](../../electron/main.ts), [model](../../shared/model.ts), [store](../../electron/store.ts), and [editor](../../src/main.tsx).

Validation: [dispatch/probe tests](../../tests/system-actions.test.ts), [compatibility/recovery tests](../../tests/system-actions-store.test.ts), and [stubbed desktop checks](../../tests/system-actions-desktop.mjs). Actual dated results and release limitations are in [progress](../progress.md). Unit dispatch checks for macOS on Windows do not constitute native Mac validation. No unattended test suspends the host; real sleep/wake remains a manual release check.

Platform references: [Microsoft SetSuspendState](https://learn.microsoft.com/en-us/dotnet/api/system.windows.forms.application.setsuspendstate), [Win32 suspend semantics](https://learn.microsoft.com/en-us/windows/win32/api/powrprof/nf-powrprof-setsuspendstate), and [Apple's pmset manual source](https://github.com/apple-oss-distributions/PowerManagement/blob/main/pmset/pmset.1).
