# 0001: Electron and explicit process boundaries

- Status: Accepted; OS-operation scope extended by [0015](0015-sleep-action.md), with the narrow privileged boundary retained
- Recorded: 2026-09-22 (retrospective)
- Supersedes: None

## Context

KeePad needs native tray/menu-bar behavior, global shortcuts, local file/application opening, images, and one UI across macOS and Windows. The initial workspace was empty.

## Decision

Use Electron with React/TypeScript for the UI and Vite for renderer builds. Keep OS capabilities in the main process. Expose a small typed preload bridge; sandbox renderers with context isolation, no Node integration, sender validation, restricted navigation, and a local-content CSP. Use native OS dialogs and shell/clipboard APIs rather than arbitrary commands or keyboard injection.

## Alternatives

Separate native applications offer closer platform integration but duplicate UI work. Tauri could reduce runtime size but adds a different native/toolchain boundary. A website/PWA alone cannot satisfy the required system tray and native action behavior. These are qualitative tradeoffs; no footprint or performance benchmark was conducted.

## Consequences

One renderer supports both targets and native integration can be tested with Playwright Electron. The bundled Chromium/Electron runtime increases package size and requires dependency/security maintenance. Windows behavior still needs Windows evidence, even when macOS works. Permission-heavy automation requires a new explicit product decision.

## Evidence and documentation

See [architecture](../architecture.md), [main process](../../electron/main.ts), [preload](../../electron/preload.cts), [CSP](../../index.html), and [desktop tests](../../tests/desktop.mjs). The browser-only preview is intentionally limited and is not native validation.
