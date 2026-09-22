# Data model and persistence

Canonical schema: [shared/model.ts](../shared/model.ts). Store implementation: [electron/store.ts](../electron/store.ts). See [ADR 0002](adr/0002-local-state-and-backups.md).

## Persisted state

`State` contains `schemaVersion` (currently 1), an integer `revision`, an existing `activePadId`, `pads`, and settings. The selected editor pad and temporary preview are not persisted.

| Record | Fields and constraints |
| --- | --- |
| State | 1–30 pads; unique pad IDs; active ID must refer to a stored pad |
| Pad | ID, name (1–32 characters), description (≤100), icon, theme, columns, rows, buttons |
| Layout | 3–5 columns; 2–4 rows; at most 20 buttons |
| Button | ID, label (1–40), description/tooltip (≤180), action type, target (1–20,000), icon, color, optional image, zero-based slot |
| Slot | Integer 0–19, unique within the pad, less than columns × rows |
| IDs | Nonempty, ≤80 characters; button IDs unique within each pad |
| Image | PNG/JPEG/WebP base64 data URL, ≤1,500,000 characters in persisted state |
| Settings | Shortcut string (1–100), hide-after-action boolean, launch-at-login boolean |

Labels/names are trimmed by validation. Allowed choices and startup defaults are listed in [generated reference](reference.md).

Website targets require a full HTTP(S) URL with a hostname. File/folder/app targets require an absolute Unix, Windows drive, or UNC path and cannot contain a NUL character. Existence and access are checked at execution time. Shortcuts are validated by native registration as well as basic string constraints.

The editor's steppers stop at schema limits and disable shrinking if a button would fall outside the new capacity. Changing column count reflows linear slot indices; it does not maintain fixed row/column coordinates. Moving a button onto an occupied position swaps the two slots.

## Storage and recovery

The file is `keepad.json` under Electron's `app.getPath('userData')`, normally `~/Library/Application Support/KeePad/` on macOS and `%APPDATA%/KeePad/` on Windows. Do not assume paths for tests; use a temporary profile.

A save validates first, writes `keepad.json.tmp`, then renames it over the destination. The in-memory state changes only after the write succeeds. Files request owner-only permissions where supported. There is no encryption, database, fsync-based power-loss guarantee, or cloud replication.

Missing state creates starter pads. Unreadable/invalid existing state is copied to a timestamped recovery file before defaults are written. If the recovery copy fails, startup fails instead of overwriting the original. There is currently no schema migration framework; introducing schema version 2 requires an explicit migration/recovery design, not a blind reset.

## Concurrency

Main-process save/import mutations use a promise queue. Saves must match the current revision, which increments after a successful commit. Stale writers receive an error and a refresh; unsaved drafts are not merged. Shortcut changes reserve the replacement before removing the old shortcut, and roll back that registration on write failure.

## Images and backups

The native picker accepts PNG/JPEG/WebP files up to 10 MiB. Electron normalizes selected images to a 256×256 PNG data URL. This currently resizes to a square rather than preserving the source aspect ratio. Images travel with the state and backup; no remote image URL is loaded.

Export writes the full state, including paths and copied text, to the chosen JSON file. Import rejects files over 40 MiB, validates the complete state, appends pads with fresh pad/button IDs and imported names, preserves current device settings and active selection, then validates the combined pad limit. It never executes imported actions automatically. Imported absolute paths may need editing on another computer.

Treat snippets and backups as plaintext personal data. Tests/screenshots must use harmless fixtures, never a contributor's real settings file.
