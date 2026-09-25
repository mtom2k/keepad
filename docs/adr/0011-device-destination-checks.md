# ADR 0011: Explicit destination checks and device-local repair

- Status: Accepted for explicit checking; device-override and sync-conflict portions superseded by [0012](0012-local-only-storage.md).
- Date: 2026-09-24
- Extends: [0010](0010-optional-folder-synchronization.md)

## Context

Files and applications can move, disappear, lose access, or use different paths on Mac and Windows. The owner requested a way to find and repair broken destinations without running buttons or damaging another device's setup.

## Decision

Add Settings → Destinations → Check destinations. Inspect saved file/folder/app buttons across all pads only on explicit request. Resolve the applicable device override first, using the same original-action binding as execution. Skip websites and copied text entirely. Main derives paths from stored state; the renderer cannot submit arbitrary scan paths.

Use filesystem metadata and read-access checks, never file contents, directory traversal, URL requests, or action execution. Distinguish missing paths, denied access, foreign platform syntax, wrong type, unavailable/timeouts, and unchecked entries. A Mac application is an `.app` directory; a Windows application is an `.exe` or `.lnk` file. These checks do not certify a working app or resolve Windows shortcut targets. Follow filesystem symlinks for ordinary destination availability.

Limit outstanding filesystem probes to four across requests. Each probe waits at most 2.5 seconds; a scan stops starting new probes after ten seconds. Timeouts do not cancel native filesystem calls; keep them counted until settlement so repeated checks cannot accumulate unbounded work. Additional destinations are reported as unchecked. Share concurrent scan requests, and run scanning outside the mutation queue so a slow mounted drive does not block ordinary editing.

Repair uses stored button identity, an expected state revision, and a native picker. Inspect the chosen replacement and revalidate the revision and unresolved-conflict guard inside the serialized commit, after the picker and filesystem await. Cancel, invalid replacement, stale state, and conflicted pads do not save changes. Commit through the existing atomic store as a **This device** destination, even when synchronization is off. Preserve shared paths, action types, button appearance/position, local preferences, and activation. No schema change or migration is needed.

## Consequences and limits

Results are a point-in-time check. Incoming edits make a report stale and disable repair until rechecked. A successful repair removes that issue and advances the report revision; other results retain their original observation time. No automatic background scanning, relocation guesses, startup warnings, or filesystem watcher is added.

A metadata/access check may contact a mounted filesystem or trigger a provider/OS permission prompt. It cannot prove future availability, actual cloud hydration, application launch, file-handler configuration, or target existence behind a `.lnk`. Permission changes stay in the OS; KeePad neither grants itself access nor requests broader entitlements.

The local override is intentionally excluded from portable exports/synchronization. Users who want a shared destination changed use the existing button editor. Browser preview cannot check native paths. Native Windows permissions, network mounts, provider hydration, and application launching still need target-platform validation.

## Alternatives

Running buttons to test them would produce unwanted side effects. Automatic searches for moved files would read unrelated directories and could choose the wrong item. Changing the shared destination during repair could break other devices. Per-device overrides and explicit native selection already provide a compatible, reviewable solution.
