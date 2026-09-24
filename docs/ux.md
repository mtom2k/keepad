# UI and interaction rules

Current behavior is implemented in [main.tsx](../src/main.tsx), [components.tsx](../src/components.tsx), and [styles.css](../src/styles.css). Rationale: [ADR 0003](adr/0003-traditional-utility-interface.md) and [ADR 0004](adr/0004-pad-selection-and-launcher-behavior.md).

## Visual direction

KeePad should look like a traditional desktop utility. Use a native editor title bar, system typography, neutral surfaces, compact controls, and a clear sidebar. Avoid marketing headlines, repeated labels, decorative cards, bloom/glow effects, and explanatory paragraphs in the main workspace. Detailed guidance belongs in tooltips or the collapsible Settings help section.

The GitHub README is a separate audience: friendly emojis, screenshots, and plain-language instructions are explicitly desired there.

## Editor

- Single-click a sidebar pad to edit it. Double-click activates it, as does Make Active. An ACTIVE badge marks only the active pad.
- The toolbar exposes Make Active plus eye, pencil, copy, and trash controls. Use widely recognized icons. The eye tooltip is exactly “Preview pad on screen”.
- New and duplicated pads become selected, not active. Deleting an inactive pad preserves the active pad; deleting the active pad selects the first remaining pad. The final pad cannot be deleted.
- Pad Theme is a dropdown. Columns and Rows have labeled −/count/+ steppers. Disabled controls explain limits or protected actions on hover.
- New/Edit pad offers None under Pad icon. Icon-free pads show their name without a placeholder in the sidebar, editor heading, launcher, and pad picker.
- Clicking an occupied key edits it; clicking an empty key adds an action. Drag an occupied key onto an empty position to move it, or onto another key to swap. The destination has a clear outline. Releasing outside the grid or pressing Escape cancels the drag. Launcher keys are not draggable.
- The button dialog's Position control is a miniature pad with the actual columns/rows, icons/images, position numbers, and a highlighted selection. Click a position or use arrow keys (Home/End for first/last); hover for row/column and swap guidance. Changes apply only on Save. Cancel discards them. A newly created button targeting an occupied position moves that occupant to the empty position where creation began.
- Drop one local file, folder, or application from Finder/File Explorer onto an editor position. Empty positions become saved buttons with a filename and generic type icon. Occupied positions ask before replacing only the action type/destination; name, image, color, hint, and position remain unchanged. Cancel leaves the action untouched. Multiple files are rejected with a brief error; drops never execute actions. The compact launcher does not accept file bindings.
- Macro keys show image/icon and label; action details stay in tooltips/dialogs.

## Launcher

- Tray/menu invocation and the global shortcut center the launcher on the pointer's display work area.
- Previewing another pad does not change the saved active pad. The next normal summon returns to the active pad.
- Launcher arrows/pad picker and tray radio items cycle the active pad.
- Escape dismisses a button menu or dialog first, then clears a nonempty search, then hides the launcher. X hides immediately. Hide-after-action also governs blur-hiding. A hidden window remains alive.
- Each summon clears the search and focuses its field, discarding a pending launcher move/delete confirmation. Native refocus alone preserves the query. Do not hide outlines globally: Tab navigation must remain usable and visible.

## Launcher search

The launcher has one compact field, “Search all pads…”, focused on initial load and every invocation (including preview). Blank/whitespace queries show the usual pad grid. Nonempty queries replace it with a scrollable result list across **all pads**, including inactive pads. A result shows the button icon/image, name, originating pad, action type, and description when present; hover reveals the full name/pad/description if truncated. This does not select or activate the source pad.

Search matches the button label and description (the Hover hint field), ignoring case and accents. All whitespace-separated query terms must appear in those fields, in any order. Exact-name matches rank first, then name prefixes, then other all-name matches, then matches requiring descriptions. Ties retain pad order and slot order; duplicate names remain separate results with their pad names. Pad names, destinations, file contents, and clipboard text are not search fields. There is no fuzzy/typo matching or scope toggle.

The first result is selected. Up/Down changes selection and scrolls it into view while typing focus remains in the input. Enter runs the selected button through the existing action path; mouse clicks run their clicked result. Empty results show “No matching buttons”; Enter does nothing. IME composition keys must not run actions or dismiss the launcher. Clear search and Escape restore the grid and focus; a subsequent Escape hides. Hide-after-action still applies. Search is temporary, local, and never stored or exported.

Right-click results, or use Shift+F10/the context-menu key from the search field, for the existing button menu. The source pad/button IDs identify the action, even with duplicate labels. Menu dismissal preserves the query and returns focus to search. Visible Tab focus remains available for other controls.

## Button menu

Right-click an occupied button in the editor or launcher for Edit…, Duplicate, Move to another pad…, and Delete…. Edit from the launcher opens that button in the editor. Duplicate uses the first empty position in the same pad; Move lets the user choose another pad and uses its first empty position. Full destinations are unavailable; both operations preserve the action/image and active pad. Delete requires confirmation.

Shift+F10 or the context-menu key opens the menu for a focused key. Up/Down, Home/End, and Enter operate it; Escape or Tab dismisses it and restores focus to the originating key. Outside clicks, window blur/resize, or state changes dismiss it. Menus stay within the window and suppress underlying tooltips. Right-click does not run the action. A stale move/delete confirmation or file replacement is rejected instead of overwriting newer changes.

## Synchronization settings

Synchronization is off by default. Settings offers Choose sync folder, a confirmation with the existing/new library and pad count, local status, Check folder, and Disconnect. Existing-library confirmation explains replacement and the automatic local backup. Keep app appearance, shortcut/startup/hide preferences, active selection, and device destinations local. Label folder checks truthfully; do not claim cloud delivery.

Conflict versions show name, button count, source platform, and timestamp. Review displays saved actions without running them. Keep a version/deletion or keep each nondeleted version as a separate pad. A compact warning links to Settings when synchronization needs attention. Unresolved pads cannot be edited or run; unaffected pads/preferences remain usable. Disconnect confirms retention of local pads and remote-folder contents.

File/folder/app button dialogs add an optional This device destination selected through the native picker. It saves with the button, is canceled with the dialog, and never changes the shared target. Use shared destination clears it on Save. A library revision changing during a pad/button dialog blocks saving/removing from that stale draft. Removed pads close their editor dialogs. See [synchronization](synchronization.md).

## Accessibility and feedback

Provide accessible names for icon controls, visible keyboard focus, native modal focus containment, and clear error messages. Floating UI flips/shifts custom tooltips within the viewport; dialogs use a portal inside their top layer. Stepper counts use live outputs. Preserve existing values when a save or native operation fails.

Pad themes apply to the pad. Current pad themes are Paper, Graphite, Sage, Sand, Midnight, and High contrast. Settings → General → Theme controls KeePad's editor, dialogs, tooltips, and native appearance independently: Light, Dark, or System (default). System follows OS appearance changes without restarting. The High contrast pad theme is not a claim of a completed accessibility audit.

Review [screenshots](screenshots/README.md) after visible changes, including edge tooltips, dialogs, and the editor's minimum size. Update these behavior rules and the affected user instructions in the same change; record actual visual/test evidence and remaining gaps in progress. A theme or icon change should include both Light and Dark review without assuming pad colors follow the app appearance.
