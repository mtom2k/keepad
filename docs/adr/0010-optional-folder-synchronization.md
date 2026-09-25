# ADR 0010: Optional folder synchronization with immutable pad history

- Status: Superseded by [0012](0012-local-only-storage.md). This record describes the retired implementation.
- Date: 2026-09-24
- Extends: [0002](0002-local-state-and-backups.md). Validated local storage, revisions, and additive backup import remain; optional synchronization is now explicitly requested by the owner.

## Context

The owner requires a shared pad library between macOS and Windows using a user-chosen Dropbox, OneDrive, or other directory. Local storage remains the default. A provider may deliver files late, out of order, duplicated under conflict-copy names, or after offline editing. Replacing one shared JSON document or applying last-writer-wins would risk silent lost updates. Shared absolute destinations can be unusable on another device.

## Decision

Keep `keepad.json` local and add an optional local `device` envelope for identity, folder, known heads, pending outgoing records, and action-bound local destination overrides. Persist state and outbox in the same temporary-write/rename operation. Settings and active selection never enter the shared protocol.

The selected folder contains `keepad-library/format.json` and `changes/<sha256>.json`. Each immutable, validated format-1 record contains a complete pad or a deletion, a nonce, source platform/device ID, informational timestamp, ordering hint, and parent record hashes for that pad. Canonical body hashing detects changed records and identifies duplicate provider copies. Filenames use lowercase hashes and portable directory names. Ordering/conflict decisions do not depend on wall-clock synchronization or OS locale. Polling and local-save checks use the same serialized mutation queue as other privileged writes.

Combine independent pads automatically. Multiple concurrent heads for one pad are an explicit conflict, including edit/delete. Display a surviving nondeleted variant while preserving every competing head for review. Block changes and action execution on unresolved pads until the user chooses a version. User resolution references all reviewed heads; keeping both adds separate pads. Delayed ancestors cannot resurrect deleted pads, and new concurrent edits can produce another conflict rather than being discarded.

A native directory picker grants a one-use confirmation token for connection. Inspect again before connecting; back up the current local file first. Existing libraries replace the visible local pads after confirmation. Empty new folders publish local pads. Disconnect retains the current cache and saves a recovery copy without deleting shared records.

File/folder/application actions support an optional per-device destination bound to pad ID, button ID, shared action type, and shared target. It never enters the shared records. Changing the shared action invalidates the override. Main validates native path syntax before using an override or shared target, then uses the existing access checks and shell opener.

## Compatibility and recovery

The pad/backup schema remains version 1 with no new button fields. The local `device.version` and shared `format.version` are separately validated. Older files without the envelope load as local-only. Invalid device metadata gets a recovery copy while preserving valid local pads. Unsupported remote versions or incomplete/invalid records pause sync without resetting the local library. Outgoing records survive restarts because they are committed with local state.

Older KeePad builds do not preserve the device envelope when saving. Do not run an older build against a sync-enabled profile; disconnect/export first. Ordinary backup import ignores device metadata, assigns fresh pad/button IDs, and does not reconnect a folder. Initial connect/disconnect recovery copies retain local metadata for investigation/manual recovery.

## Consequences and limits

No provider API, network request, new dependency, or account system is introduced. A selected directory must be transported by the user's provider/shared filesystem to reach another computer. Folder status cannot assert cloud delivery. Shared records contain plaintext action data and embedded images; only user-invoked actions execute.

Pad-level conflicts deliberately trade fine-grained automatic merging for easier preservation and review. History grows and remains available after resolution/deletion. Bound reads to 2,000 JSON files, 32 MiB per record and 512 MiB total; pause instead of discarding history at limits. No automatic compaction or distributed locking is implemented. Missing/invalid history, zero resulting pads, and capacity overflow retain local state with an actionable status.

The existing atomic store is not an fsync-backed database guarantee. Native Windows filesystem/UI behavior and actual provider delivery still require release validation even though the common engine and path rules have automated Mac/Windows fixtures.

## Alternatives

A single synchronized JSON file cannot safely coordinate offline writers. A shared SQLite database would introduce file-lock/WAL behavior inappropriate for asynchronous folder replication. A hosted sync server adds authentication, service ownership, and networking beyond the requested folder-based workflow. Per-field CRDT merging could reduce conflicts but makes grid placement and deletion semantics significantly more complex; it is not necessary for this initial conservative design.
