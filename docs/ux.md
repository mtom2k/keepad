# UI and interaction rules

Current behavior is implemented in [main.tsx](../src/main.tsx), [components.tsx](../src/components.tsx), and [styles.css](../src/styles.css). Rationale: [ADR 0003](adr/0003-traditional-utility-interface.md) and [ADR 0004](adr/0004-pad-selection-and-launcher-behavior.md).

## Visual direction

KeePad should look like a traditional desktop utility. Use a native editor title bar, system typography, neutral surfaces, compact controls, and a clear sidebar. Avoid marketing headlines, repeated labels, decorative cards, bloom/glow effects, and explanatory paragraphs in the main workspace. Detailed guidance belongs in tooltips or the collapsible Settings help section.

The GitHub README is a separate audience: friendly emojis, screenshots, and plain-language instructions are explicitly desired there.

## Editor

- Single-click a sidebar pad to edit it. Double-click activates it, as does Make Active. An ACTIVE badge marks only the active pad.
- The toolbar exposes Make Active plus eye, pencil, copy, and trash controls. Use widely recognized icons. The eye tooltip is exactly “Preview pad on screen”.
- New and duplicated pads become selected, not active. Deleting an inactive pad preserves the active pad; deleting the active pad selects the first remaining pad. The final pad cannot be deleted.
- Theme is a dropdown. Columns and Rows have labeled −/count/+ steppers. Disabled controls explain limits or protected actions on hover.
- Clicking an occupied key edits it; clicking an empty key adds an action. Use the position selector inside the button dialog to move/swap keys.
- Macro keys show image/icon and label; action details stay in tooltips/dialogs.

## Launcher

- Tray/menu invocation and the global shortcut center the launcher on the pointer's display work area.
- Previewing another pad does not change the saved active pad. The next normal summon returns to the active pad.
- Launcher arrows/pad picker and tray radio items cycle the active pad.
- Escape or X hides the launcher. Hide-after-action also governs blur-hiding. A hidden window remains alive.
- Reopening resets the previous control's focus to the root. Do not hide outlines globally: Tab navigation must remain usable and visible.

## Accessibility and feedback

Provide accessible names for icon controls, visible keyboard focus, native modal focus containment, and clear error messages. Floating UI flips/shifts custom tooltips within the viewport; dialogs use a portal inside their top layer. Stepper counts use live outputs. Preserve existing values when a save or native operation fails.

Themes apply to the pad, not the entire editor. Current themes are Paper, Graphite, Sage, Sand, Midnight, and High contrast. The High contrast theme is not a claim of a completed accessibility audit.

Review [screenshots](screenshots/README.md) after visible changes, including edge tooltips, dialogs, and the editor's minimum size.
