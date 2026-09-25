# Screenshot provenance

These images are generated from the actual Electron renderer using starter/sample data, not a live user profile. The destination-check view uses fictional `Sample` paths and never opens them.

| File | View |
| --- | --- |
| [editor.png](editor.png) | Pad list, ACTIVE badge, toolbar, theme, and Columns/Rows steppers |
| [button-menu.png](button-menu.png) | Right-click actions on a sample button |
| [launcher.png](launcher.png) | Centered compact pad in the Graphite theme |
| [launcher-search.png](launcher-search.png) | Cross-pad results for a sample description query |
| [button-editor.png](button-editor.png) | Editing a sample text-copy action |
| [settings-dark.png](settings-dark.png) | App-wide Theme control in Dark mode |
| [destination-check.png](destination-check.png) | Sample missing/foreign destinations with Repair controls |

The sample profile explicitly uses Light for the first five views and Dark for Settings and checking destinations, making capture independent of the host's current appearance.

Regenerate on a graphical desktop with `npm run docs:screenshots`. The script builds the current code, creates a temporary profile, captures these views, and cleans up. It does not execute macros or read/alter the real user's pads. Images show the application content, not OS window decorations; platform fonts and shortcuts can differ.

Review every image for readable labels, stale controls, clipping, unexpected warnings, and personal data before committing. Refresh affected screenshots in the same change as the interface they show. Avoid adding dates directly to image filenames, so README links remain stable.
