# 0016: Session Undo and saved-destination utilities

- Status: Accepted
- Recorded: 2026-09-30
- Related: [0002](0002-local-state-and-backups.md), [0008](0008-button-menus-and-native-file-drops.md), [0012](0012-local-only-storage.md)

## Context

The owner requested Show in Finder/Explorer, Copy destination, and Undo editing changes. The two windows share revisioned local state; renderer-only history or whole-state restoration could undo a newer edit or change OS-related preferences unexpectedly.

## Decision

Main owns a single session history of successful pad-array changes, including pad/button creation, deletion, duplication, movement, layout/theme changes, native destination repairs, and imports. Retain up to 20 entries within a 32 MiB serialized UTF-8 pad-data budget. Evict oldest entries first. If the latest prior library exceeds the budget, clear history rather than allowing Undo to skip that edit. Snapshots are serialized to isolate them from subsequent mutation. History is transient: hiding windows retains it; quitting loses it; it is not exported or persisted.

Settings-only changes, activation, preview, failed saves, and no-op pad saves do not create history. Undo takes an expected revision, runs in the existing main-process mutation queue, and writes through the same validated atomic commit path with a new monotonically increasing revision. Preserve current preferences and current active pad if it still exists in the restored library; otherwise use the recorded prior active pad. Consume the entry only after a successful write, and never record Undo as a new edit. Failed writes retain retry history. There is no Redo or reversal of executed actions in this scope.

Snapshots expose `canUndo`. Both windows provide a small Undo control with a tooltip. Cmd+Z / Ctrl+Z outside editable fields and open dialogs/menus invokes pad Undo. Native text Undo remains intact in inputs; dialogs remain drafts until Save. The browser preview explicitly does not implement native history.

Destination requests contain saved pad/button IDs, the initiating revision, and one allowlisted operation. Main validates the sender and request, resolves the stored target, and rejects stale identities. Copy destination awaits the clipboard operation for website/file/folder/app buttons; it also supports missing or foreign paths so they can be inspected manually. Reveal is only for file/folder/app buttons, uses the bounded metadata/access inspector, rechecks the revision after awaiting it, and calls Electron's `showItemInFolder`. It reveals the saved item in its containing folder, including folders/app bundles, without running it. Native shell reveal has no completion result; feedback reports dispatch, not proof that Finder/Explorer displayed the item.

Text and Sleep buttons have no destination utilities; website buttons only have Copy destination. Menus are available in the editor, launcher, and search results and retain existing viewport/focus handling. These commands do not write state, add history, or execute the macro. Revealing may cause ordinary OS window-focus/blur behavior; no additional global permission is requested.

## Compatibility and alternatives

No persisted schema/default/action type changes. Existing exports and recovery copies remain compatible with the current format. Whole-state Undo was rejected because it could roll back shortcut/startup preferences or later activation. Per-window history was rejected because edits may originate from either window. Persistent history/Redo require separate scope and retention decisions. A byte budget prevents twenty image-heavy library snapshots from growing without bound, but it is a serialized-payload budget, not an exact JavaScript heap limit.

## Evidence

See [history](../../electron/edit-history.ts), [main IPC](../../electron/main.ts), [unit checks](../../tests/edit-history.test.ts), and [native editing checks](../../tests/edit-tools-desktop.mjs). Current platform results, screenshot review, and remaining limits are recorded in [progress](../progress.md).
