# 0002: Local validated state and additive backups

- Status: Accepted
- Recorded: 2026-09-22 (retrospective)
- Supersedes: None

## Context

Pads must persist without an account, survive routine write failures, and support multiple windows and portable backups. Imported data can contain invalid destinations or conflicting IDs.

## Decision

Store a versioned, Zod-validated JSON state under Electron user data. Serialize mutations, reject stale revisions, replace files through a temporary write/rename, and copy corrupt data before resetting. Embed normalized raster thumbnails. Export the full state; import validated pads with fresh IDs while retaining local preferences and active selection. Reject imports that exceed limits.

## Alternatives

Renderer localStorage is simpler but weakens the native validation/concurrency boundary. SQLite supports more complex queries and transactional workloads but is unnecessary for the current bounded pad model. Cloud storage adds authentication, synchronization conflicts, and privacy scope that were not requested.

## Consequences

State and backups are inspectable and portable; an account is unnecessary. Plaintext snippets and paths are sensitive user data. Images increase JSON size. Writes are not an fsync-backed database guarantee, and future schema evolution needs an explicit migration plan. Paths remain machine-specific.

## Evidence and documentation

See [data model](../data-model.md), [store](../../electron/store.ts), [schema/import code](../../shared/model.ts), and [model tests](../../tests/model.test.ts). Tests cover validation, import isolation, persistence, and corrupt-data recovery; they do not prove every power-loss scenario.
