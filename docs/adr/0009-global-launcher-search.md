# ADR 0009: Global launcher search

- Status: Accepted
- Date: 2026-09-23
- Supersedes: The root-focus/show/focus reset portion of [0004](0004-pad-selection-and-launcher-behavior.md). Its activation, preview, and centering decisions remain accepted.

## Context

The owner requested search ready for typing when KeePad is invoked and asked whether to search button names/descriptions and all pads. KeePad should find an action without requiring the user to remember its pad, while preserving its traditional compact interface and deliberate activation model.

## Decision

Search both button labels and descriptions across all saved pads. Display source pad names to disambiguate results; use source IDs for execution and context menus. Search/run never activates another pad. Blank input shows the normal grid. Nonempty input shows a scrollable result list, with the field fixed above it.

Normalize case, Unicode accents, and whitespace; require every term to match label or description. Rank exact names, name prefixes, other all-name matches, then description/mixed matches. Preserve pad/slot order for ties. This is predictable substring search, not fuzzy matching. Do not index pad names, action targets, clipboard payloads, or file contents: those add noise and potentially expose details the user did not intend as search terms.

Every explicit summon, including preview, clears/focuses the field. Main emits launcher:shown from the shared invocation path after showing/focusing, including already-visible invocations. Native refocus alone does not clear typing. Dismiss stale launcher menus/confirmation dialogs on summon. Escape closes menus/dialogs first, then clears a search, then hides. Arrow keys and Enter operate results; composition keys do not trigger actions.

## Consequences

No schema, migration, dependency, new permission, privileged API, persistent search history, or network service is needed. At the current maximum of 600 buttons, scanning the live snapshot is bounded and avoids stale indexing. Existing main-process action validation and hide-after-action behavior remain intact. The launcher gains a search row and slightly more height within existing display bounds.

## Alternatives considered

Current-pad-only search requires knowing the pad first and can hide a useful action. A scope selector adds controls before a demonstrated need; all-pad search with explicit source labels is the initial choice. Searching targets/content would produce less predictable matches. Remembering the previous query would leave the next invocation unexpectedly filtered. Fuzzy search could be added later with deliberate ranking tests if substring search proves insufficient.

## Validation limits

Automated tests cover matching/ranking, focus, cross-pad execution, and menu routing. Real tray gestures, Windows native focus, screen-reader use, IME input, and unusual display configurations still need manual release validation.
