# Architecture decision records

Accepted records describe the current implementation. Initial records were written retrospectively on 2026-09-22 to preserve rationale and constraints for handoff; they do not imply a formal comparative benchmark took place.

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-electron-and-process-boundaries.md) | Electron, React, and a narrow privileged boundary | OS-operation scope extended by 0015; boundary remains accepted |
| [0002](0002-local-state-and-backups.md) | Validated local JSON, revisions, and additive backups | Accepted |
| [0003](0003-traditional-utility-interface.md) | Traditional utility UI with progressive guidance | Accepted |
| [0004](0004-pad-selection-and-launcher-behavior.md) | Separate selection/activation/preview; shared centering and focus reset | Focus portion superseded by 0009 |
| [0005](0005-documentation-as-part-of-delivery.md) | Documentation is part of delivery with automated backstops | CI portion superseded by 0006 |
| [0006](0006-private-source-hosting-with-local-checks.md) | Private GitHub source hosting; local checks, no CI/CD | Accepted |
| [0007](0007-application-appearance-and-optional-pad-icons.md) | App appearance independent of pad themes; optional pad icons and additive defaults | Accepted |
| [0008](0008-button-menus-and-native-file-drops.md) | Button context menus and explicit native file binding without execution | Accepted |
| [0009](0009-global-launcher-search.md) | Global launcher search with automatic focus and unchanged activation | Accepted |
| [0010](0010-optional-folder-synchronization.md) | Optional Mac/Windows folder synchronization with immutable pad history and local destinations | Superseded by 0012 |
| [0011](0011-device-destination-checks.md) | Explicit metadata checks and revision-guarded device-local repairs | Destination storage/conflict portions superseded by 0012 |
| [0012](0012-local-only-storage.md) | Local-only storage with safe legacy destination conversion | Accepted |
| [0013](0013-windows-platform-integration.md) | Windows sender validation, tray toggle, menu/taskbar, shortcut recording, portable packaging, and locked-file saves | Accepted |
| [0014](0014-windows-startup-setting-follows-os.md) | Windows "Start with your computer" reconciles with Task Manager/Run state | Accepted |
| [0015](0015-sleep-action.md) | Fixed Sleep operation, no destination, and pre-feature recovery copies | Accepted |

Use [the template](template.md) for the next consequential decision. Update this index and the affected guides. Supersede an accepted decision with a new record rather than erasing its rationale.
