# 0007: Application appearance and optional pad icons

- Status: Accepted
- Recorded: 2026-09-23
- Supersedes: None; extends ADRs 0002 and 0003

## Context

The owner requested icon-free pads and Light, Dark, and System appearance for KeePad separately from individual pad themes.

## Decision

Persist `settings.theme` as `light`, `dark`, or `system`. Default missing values to `system` when validating existing version-1 data. Electron applies the preference through `nativeTheme` after successful saves and before creating startup windows. The renderer uses document-level appearance tokens, including portaled dialogs/tooltips; System listens for color-scheme changes. Pad themes remain independent.

Allow the explicit `none` value only for pad icons. Render no glyph or heading placeholder for that value; action-button icons retain their existing requirements.

## Compatibility and recovery

This is an additive version-1 schema extension: existing files and backups parse without rewriting or resetting pads, IDs, revisions, or other preferences. The new preference is written on the next ordinary save. Backup import still preserves local settings. Existing corrupt-data recovery and atomic writes remain in force.

Older builds do not understand `none`, so downgrades are not guaranteed: use a backup made before this change if returning to an older build. No destructive migration or silent fallback for invalid appearance values is introduced. Tests cover old-file loading without recovery, new-state reload, import preservation, and rejection of invalid values.

## Alternatives and consequences

Using each pad's theme for the editor would make global settings change appearance while browsing pads. Separate settings keep that behavior predictable. Appearance tokens require visual checks across settings, editors, dialogs, and tooltips. System behavior is tested with simulated color-scheme changes; Windows native appearance still needs local Windows validation.
