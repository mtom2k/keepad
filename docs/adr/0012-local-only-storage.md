# ADR 0012: Remove synchronization and keep ordinary local destinations

- Date: 2026-09-24
- Status: Accepted
- Supersedes: [0010](0010-optional-folder-synchronization.md); the device-override and synchronization-conflict portions of [0011](0011-device-destination-checks.md)

## Context

The owner explicitly requested complete removal of synchronization and local-machine storage only. Cross-device absolute paths add complexity that is no longer wanted. Existing local pads and their effective destinations must survive removal.

## Decision

Delete the engine, shared protocol contracts, sync IPC/preload methods, UI, polling, conflict handling, and runtime device overrides. Preserve destination checking and revision-guarded repair, with repairs replacing the ordinary local button target. Keep schema version 1, local atomic writes, stale-save rejection, additive imports, and backups.

Retain only a read-only startup conversion in the store. Before converting a legacy device envelope, save a unique full recovery copy. Validate its version and destination entries, apply only overrides matching the current pad/button/type/original target, validate the resulting state, increment its revision, and atomically persist it without the envelope. Match the old first-applicable-override semantics. A backup, metadata, validation, or write failure must stop conversion without overwriting valid pads or invoking corrupt-state defaults. Subsequent ordinary loads need no conversion.

Keep current cached pads and pending local edits already represented in that state. Never access the old shared folder; remote-only versions are not automatically recovered. Preserve historical queue/conflict metadata in the full backup and leave remote history untouched. Recovery guidance explains these limits and that older installations may still synchronize until upgraded.

Clean the generated Electron directory before builds, so deleting source modules actually removes them from packaged output.

## Consequences

The app has one destination per button. Effective paths participate naturally in duplication, moves, editing, exports, and imports. Manually transferred file actions may still require repair on a different computer; file contents and apps are not copied. There is no ongoing cloud dependency or synchronization state to diagnose.

The narrowly scoped compatibility reader is intentionally retained to avoid data loss. It does not implement the retired protocol or enable reconnection. Unsupported legacy destination metadata fails safely and may require manual recovery. The existing atomic rename has no fsync-based power-loss guarantee. Native Windows validation remains necessary.

## Validation

Temporary-profile tests cover Mac/Windows path preservation, stale overrides, exact recovery copies, untouched former folders, repeated startup, and backup/validation/write failures. Native checks exercise local repair, stale-picker rejection, plain persisted state, and absence of sync bridge methods. Actual outcomes are recorded in [progress](../progress.md).
