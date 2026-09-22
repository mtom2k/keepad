# Troubleshooting and project knowledge

Use [progress](progress.md) for current validation gaps. The following notes capture implementation lessons and known boundaries.

| Symptom | Explanation / next step |
| --- | --- |
| Window disappeared, process still running | Expected. Close hides KeePad; tray/menu-bar Quit exits. |
| Shortcut does nothing | Open Settings from the tray. An occupied/invalid shortcut is rejected, and the previous shortcut is retained where available. Also check competing KeePad copies. |
| Clicking a sidebar pad does not change the active badge | Expected. Single-click edits; double-click or Make Active activates. |
| Previewed pad is gone on next summon | Expected. Preview is temporary; normal summon opens the active pad. |
| − control is disabled | The schema minimum was reached, or reducing capacity would hide a saved button. Move/remove those buttons first. |
| Button action fails after moving a file/importing a backup | Edit its destination with Browse. Absolute paths belong to a particular computer. Check access/default app. |
| A protected folder cannot be opened on macOS | Use the normal OS prompt and Files and Folders privacy settings for that folder. Broad Accessibility or Full Disk Access is not part of this app's design. |
| Last-used Settings/X appears focused on summon | Regressed launcher focus reset. Check `launcher:shown` events, root focus scheduling, and the desktop regression test. Keep Tab focus styling intact. |
| Changes rejected after another window saved | Optimistic revision conflict. The UI refreshes; reapply the edit. Do not bypass revision validation. |
| Settings reset with a recovery warning | Inspect the timestamped recovery copy next to `keepad.json`. Failed backup creation must stop startup rather than overwrite the original. |
| Browser preview cannot pick local files or summon globally | Expected. Use the desktop app; the preview adapter explicitly limits native operations. |
| Screenshots report shortcut conflict | Quit the competing copy, then rerun the screenshot command. Never capture a real user profile to work around fixture problems. |
| GitHub CLI reports invalid authentication only inside a restricted runner | Verify network/credential access with the appropriate authorized environment before concluding the account must sign in again. Never print a token. |

## Known boundaries to preserve in handoffs

- Windows support is implemented and has CI configuration; local development evidence initially comes from macOS Apple Silicon. Check the actual CI run and manual Windows checks before changing that claim.
- The native file-open error currently includes macOS privacy instructions even on Windows. Platform-specific error copy is a follow-up improvement, not a completed fix.
- Images are resized to square thumbnails; cropping/aspect-ratio controls are not implemented.
- Multiple monitors, unusual screen sizes, native blur behavior, reserved shortcuts, and non-QWERTY layouts require real device verification.
- Startup preferences are written via Electron but do not prove a successful next login; verify after installation.
- Corrupt state is backed up, but no schema migration system or crash-proof database exists.
- Electron `clipboard.writeText()` must be awaited. `clipboard.read()` items must be copied into new `ClipboardItem` objects before writing them back.

## Reporting a problem

Include app version, OS/architecture, launch method, relevant pad/action type, steps to reproduce, expected versus actual result, and any error text. Use sample data; remove private paths, snippets, and images from shared diagnostics. Attach a screenshot only if it helps reproduce the problem.
