# Data model and persistence

Canonical schema: [shared/model.ts](../shared/model.ts). Store implementation: [electron/store.ts](../electron/store.ts). See [ADR 0002](adr/0002-local-state-and-backups.md).

## Persisted state

`State` contains `schemaVersion` (currently 1), an integer `revision`, an existing `activePadId`, `pads`, and settings. The selected editor pad, temporary preview, launcher search query, and highlighted search result are not persisted. Search reads only existing button labels/descriptions and adds no fields or migration.

| Record | Fields and constraints |
| --- | --- |
| State | 1–30 pads; unique pad IDs; active ID must refer to a stored pad |
| Pad | ID, name (1–32 characters), description (≤100), icon, theme, columns, rows, buttons |
| Layout | 3–5 columns; 2–4 rows; at most 20 buttons |
| Button | ID, label (1–40), description/tooltip (≤180), action type, target (1–20,000), icon, color, optional image, zero-based slot |
| Slot | Integer 0–19, unique within the pad, less than columns × rows |
| IDs | Nonempty, ≤80 characters; button IDs unique within each pad |
| Image | PNG/JPEG/WebP base64 data URL, ≤1,500,000 characters in persisted state |
| Settings | Theme (`light`, `dark`, `system`), shortcut string (1–100), hide-after-action boolean, launch-at-login boolean |

On packaged Windows builds, `launchAtLogin` mirrors what Windows will launch. KeePad compares it with the OS state at startup and when the editor gains focus, and saves any difference as a normal revisioned write. It is not only the last value the user chose. See [ADR 0014](adr/0014-windows-startup-setting-follows-os.md).

Shortcuts are Electron accelerators. The recorder stores the platform's primary modifier as `CommandOrControl` (Command on macOS, Ctrl on Windows) and the other one as `Control` (macOS) or `Super` (Windows key), so a stored shortcut keeps its meaning on the platform that recorded it.

Labels/names are trimmed by validation. Allowed choices and startup defaults are listed in [generated reference](reference.md).

Pad icons additionally accept `none`; button icons do not. Version-1 data missing `settings.theme` parses with `system` without resetting existing data. For files without legacy device metadata, loading does not rewrite the file; the default is persisted by the next ordinary save. Imports retain the receiving device's theme. Builds predating icon-free pads cannot read `none`; retain a pre-change backup for downgrades. See [ADR 0007](adr/0007-application-appearance-and-optional-pad-icons.md) for compatibility and recovery.

Website targets require a full HTTP(S) URL with a hostname. File/folder/app targets require an absolute Unix, Windows drive, or UNC path and cannot contain a NUL character. Existence and access are checked at execution time. Shortcuts are validated by native registration as well as basic string constraints.

The editor's steppers stop at schema limits and disable shrinking if a button would fall outside the new capacity. Changing column count reflows linear slot indices; it does not maintain fixed row/column coordinates. Moving a button onto an occupied position swaps the two slots.

Drag-and-drop and the dialog's visual position picker share `src/pad-layout.ts`. When a new button targets an occupied slot, the existing occupant moves to the empty origin where creation started. Moves preserve IDs, images, and action data. The dialog previews its draft without saving until confirmed; a canceled drag or dialog leaves persisted slots unchanged.

Button duplication copies all action/appearance fields with a fresh ID into the first empty slot. Cross-pad moves preserve the ID unless it collides with a destination button, then allocate a fresh one. A full destination rejects insertion; neither operation changes the active pad. File drops use existing button fields, so schema version remains 1 with no migration. Empty drops generate a filename label (up to 40 characters) and generic file/folder/app icon; confirmed replacements change only `type` and `target`. Files are referenced by absolute path, never copied into KeePad or embedded in backups. Main checks existence/type when describing the drop and checks access again when the action runs. See [ADR 0008](adr/0008-button-menus-and-native-file-drops.md).

## Storage and recovery

The file is `keepad.json` under Electron's `app.getPath('userData')`, normally `~/Library/Application Support/KeePad/` on macOS and `%APPDATA%/KeePad/` on Windows. Do not assume paths for tests; use a temporary profile.

A save validates first, writes `keepad.json.tmp`, then renames it over the destination. On Windows the rename can fail briefly with `EPERM`/`EACCES`/`EBUSY` while antivirus, indexing, or backup software holds `keepad.json` open without delete sharing. KeePad retries only those errors, with bounded backoff (about 1.3 s in total), then reports the failure as before. The in-memory state changes only after the write succeeds. Files request owner-only permissions where supported. There is no encryption, database, or fsync-based power-loss guarantee. Keep this live file local; use exported backups for manual transfer. Concurrent access through a provider folder is unsupported.

Missing state creates starter pads. Unreadable/invalid existing state is copied to a timestamped recovery file before defaults are written. If the recovery copy fails, startup fails instead of overwriting the original. The missing-appearance default described above is supported within version 1; there is no general schema migration framework. Introducing schema version 2 requires an explicit migration/recovery design, not a blind reset.

## Upgrade from legacy device metadata

Current saves contain only `State`, still at schema version 1. If an old local file contains a `device` envelope, startup first saves its complete original bytes to `keepad.json.before-local-<timestamp>-<UUID>`. This includes any old outgoing records and conflict metadata for manual recovery. A small read-only compatibility schema requires version 1 and valid destination entries; it does not revive the sync protocol.

For each current button, conversion uses the first override matching pad ID, button ID, action type, and original target, exactly as prior execution did. Outdated or deleted-action overrides do not apply. The resulting state is fully validated, its revision incremented, and its device envelope removed by atomic replacement. Local settings, active selection, cached edits, IDs, slots, and images remain intact. Paths are not translated or checked for existence during conversion, so unavailable files retain their saved destination. Both Mac and Windows absolute paths are supported.

A failed backup, invalid/unsupported destination metadata, invalid resulting target, or failed write aborts startup; the original file remains intact. These errors stay outside corrupt-state recovery and cannot reset valid pads. Subsequent starts of successfully converted files do not repeat conversion. External folders and remote-only conflict versions are never accessed. See [ADR 0012](adr/0012-local-only-storage.md) and [recovery](synchronization.md).

Destination repair now updates the ordinary button target. It is included in exports, duplication, moves, and subsequent edits. No separate device destinations are stored.

## Concurrency

Main-process save/import mutations use a promise queue. Saves must match the current revision, which increments after a successful commit. Stale writers receive an error and a refresh; unsaved drafts are not merged. Shortcut changes reserve the replacement before removing the old shortcut, and roll back that registration on write failure.

## Images and backups

The native picker accepts PNG/JPEG/WebP files up to 10 MiB. Electron normalizes selected images to a 256×256 PNG data URL. This currently resizes to a square rather than preserving the source aspect ratio. Images travel with the state and backup; no remote image URL is loaded.

Export writes the full state, including paths and copied text, to the chosen JSON file. Import rejects files over 40 MiB, validates the complete state, appends pads with fresh pad/button IDs and imported names, preserves current device settings and active selection, then validates the combined pad limit. It never executes imported actions automatically. Imported absolute paths may need editing on another computer.

Treat snippets and backups as plaintext personal data. Tests/screenshots must use harmless fixtures, never a contributor's real settings file.
