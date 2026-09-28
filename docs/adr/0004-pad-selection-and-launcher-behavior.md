# 0004: Separate pad selection, activation, and preview

- Status: Accepted for selection, activation, preview, and centering; root-focus/show/focus reset superseded by [ADR 0009](0009-global-launcher-search.md)
- Recorded: 2026-09-22 (retrospective, following user feedback)
- Supersedes: None

## Context

Automatically activating a pad when selecting it made editing and previewing change the next summoned pad. Tray invocation originally appeared by the tray, while the shortcut centered it. Reused launcher windows could retain focus on Settings/X.

## Decision

Keep editor selection local, activation persistent, and preview transient. Make Active and sidebar double-click explicitly activate; single-click edits. Tray/launcher pad cycling also selects the active pad. Preview does not activate; normal invocation returns to active. All entry points share work-area centering on the pointer's display. Reopen/show/focus resets launcher focus to its root, retaining normal Tab focus styling.

## Alternatives

A single pad ID is simpler but mixes editing with activation. Persisting the preview changes shortcut behavior unexpectedly. A tray-anchored window follows some menu-bar conventions but conflicts with the user's requested consistent centered behavior. Removing all focus outlines would hide the symptom while harming keyboard access.

## Consequences

Multiple state concepts require clear contracts and regression tests. Deleting pads must handle active/preview fallback. Centering means multi-monitor, scaling, and work-area behavior deserve manual validation. Reopen focus must not break keyboard use.

## Evidence and documentation

See [architecture](../architecture.md), [UX](../ux.md), [renderer](../../src/main.tsx), and [main process](../../electron/main.ts). [Desktop tests](../../tests/desktop.mjs) exercise activation, independent preview, double-click, centering bounds, and visible Tab focus after reset.
