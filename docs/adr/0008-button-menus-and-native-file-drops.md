# ADR 0008: Button menus and native file drops

- Status: Accepted
- Date: 2026-09-23
- Related: [0001](0001-electron-and-process-boundaries.md), [0002](0002-local-state-and-backups.md), [0003](0003-traditional-utility-interface.md), [0004](0004-pad-selection-and-launcher-behavior.md)

## Context

The owner requested right-click button management and dragging a file onto a pad position to bind it. These interactions should fit the compact desktop utility and preserve existing actions. File paths require a privileged boundary; a renderer-created filename is not a native file path.

## Decision

Expose Edit, Duplicate, Move to another pad, and confirmed Delete in a keyboard-accessible, viewport-constrained renderer menu in both windows. Edit from the launcher validates stored IDs in main and opens the appropriate editor dialog. Duplicate/move use the first free destination slot without changing activation; full pads reject insertion. Escape dismisses the menu/dialog before hiding the launcher.

Accept one filesystem item per drop onto editor cells. Preload resolves the actual File through Electron webUtils, then a sender-validated main handler checks an absolute host-native path, length, NUL exclusion, existence, and regular-file/directory metadata. Files without a native path and unsupported filesystem objects are rejected. Main never reads contents or executes the dropped destination. macOS .app directories and Windows .exe/.lnk files become application actions; other directories become folder actions and other regular files become file actions.

An empty slot gets a filename label and generic type icon. An occupied slot requires confirmation and preserves name, image, hint, color, ID, and position while replacing type/target. Multiple files are rejected rather than distributed implicitly. Save remains an ordinary validated, atomic, revision-checked state mutation. Pending replacement and move/delete confirmations reject newer revisions.

## Consequences

No dependency, extra OS permission category, arbitrary command execution, cloud service, or persisted-schema change is introduced. Files stay where they are; moving/removing them later can break the saved action. Actual execution still uses the existing user-invoked path opener and its access checks.

Drops are intentionally editor-only and desktop-only. Browser URLs, remote content, batch assignment, embedded file copies, and custom application-icon extraction are outside this decision. Native Finder/File Explorer dragging and platform permissions require manual release verification; automated tests exercise actual native File paths using synthetic drop events.

## Alternatives considered

Binding immediately over an occupied slot could destroy a useful action accidentally. Batch drops would require additional placement/conflict rules. Accepting path text from arbitrary drag payloads would lose the native File boundary. Native OS menus were considered; the renderer menu shares app appearance and supplies explicit keyboard/bounds behavior within both windows.
