# Retired synchronization: local-only upgrade and recovery

Synchronization was removed at the owner's request in commit `8474c36` on 2026-09-24. KeePad stores pads and preferences only on this computer. There is no folder selection, polling, conflict review, or automatic cross-device transfer. Manual export/import remains available. [ADR 0012](adr/0012-local-only-storage.md) supersedes the earlier design.

## What happens on upgrade

For a local profile from a sync-enabled build, KeePad:

1. Copies the complete original `keepad.json` to a unique `keepad.json.before-local-<timestamp>-<UUID>` beside it.
2. Keeps the current locally cached pads and preferences, including locally saved edits that had not been uploaded.
3. Converts applicable **This device** destinations to ordinary button destinations, so the buttons keep using the same paths.
4. Atomically saves plain local state, without the former sync configuration, history pointers, outgoing queue, or override list.

After conversion, the informational notice beginning **“KeePad now stores everything locally”** identifies the recovery copy. It is not an error and requires no action. It remains for that running session; choose **Quit KeePad** and reopen to clear it. Closing a window only hides it. Fresh profiles do not show this notice. An upgrade can show it even if syncing was never enabled, because those older builds stored device metadata by default.

The app does not read, write, reconnect, or delete the former shared folder. No cloud delivery is attempted. Each computer must be upgraded separately; older installations can continue their old behavior until stopped or upgraded.

Only pads already present in the local cache are retained automatically. Remote-only edits and competing versions are not imported. Historical outgoing/conflict metadata remains in the full recovery copy; former shared history remains wherever the user kept it. Do not delete these copies until satisfied with the local library.

## If conversion fails

Failed backup creation, unsupported or malformed destination metadata, invalid replacement paths, or a failed save stops startup without overwriting valid local pads. Keep the original and any recovery copy. Correct disk space or permissions and retry for filesystem failures. For invalid metadata, ask a developer to inspect a copy and recover the pads and effective destinations; do not erase the profile to bypass the error.

Profiles normally live in `~/Library/Application Support/KeePad/` on macOS or `%APPDATA%/KeePad/` on Windows. Verify the actual profile before making manual changes. Quit KeePad before any manual restoration. Retain the current file as well as the recovery copy. A recovery copy includes sensitive paths, images, and text.

Do not run an older sync-enabled build against restored legacy metadata unless intentionally recovering that old setup: it may reconnect to the recorded folder. The current build never does so. Old shared history is not a normal backup-import file; manual recovery requires inspecting its format and selecting the intended pad versions.

## Backups and moving computers

Use Settings → Backup → Export backup to save a portable snapshot. Import pads adds copies with fresh IDs and retains the receiving computer's preferences and active selection. Exports now include all saved destinations, including converted and repaired paths. Actual files and applications are not bundled. After transferring pads, use Check destinations and Repair… to select paths on the new computer.

Do not put the live profile under concurrent folder synchronization. An exported backup may be stored wherever the user chooses, but KeePad neither watches it nor merges changes automatically. See [data model](data-model.md) for storage guarantees and [historical ADR 0010](adr/0010-optional-folder-synchronization.md) for the retired protocol.
