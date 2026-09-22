# 0003: Traditional utility interface

- Status: Accepted
- Recorded: 2026-09-22 (retrospective, following user feedback)
- Supersedes: None

## Context

The original editor used promotional headings, repeated explanations, and decorative cards. The user requested fewer words and an interface that resembles a conventional application.

## Decision

Use a native editor frame, neutral surfaces, system fonts, a compact pad sidebar, familiar eye/pencil/copy/trash controls, and concise functional labels. Keep theme choice as a dropdown and dimensions as separate labeled steppers. Put detailed guidance in custom tooltips and collapsible settings help. Preserve six pad themes without making the editor a promotional page.

## Alternatives

A dashboard-style editor explains every feature inline but adds visual and reading overhead. Hiding every action in overflow menus is compact but makes routine actions less discoverable. The chosen interface exposes common actions while keeping secondary guidance on demand.

## Consequences

The main workspace is simpler and common actions need fewer clicks. Icon-only controls require accessible names and tooltips. Changes must preserve keyboard focus, dialog focus containment, and tooltip placement. README emojis and explanatory screenshots are appropriate for onboarding and do not change the app's visual direction.

## Evidence and documentation

See [UX rules](../ux.md), [renderer](../../src/main.tsx), [components](../../src/components.tsx), and [screenshots](../screenshots/README.md). The High contrast theme does not replace an accessibility audit.
