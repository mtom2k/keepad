# ⌨️ KeePad

**Your own on-screen shortcut pad for Mac and Windows.**

KeePad gives your everyday actions a button: open a website, file, folder, or app, copy a text snippet, or put your computer to sleep. It waits in your Mac's menu bar or Windows notification area until you need it.

> 🚧 **Development version:** Windows 11 x64 has native automated and installed-build checks. macOS Apple Silicon was last validated on September 24; the newer platform changes still need a Mac rerun. Signed releases are not available; Windows draft builds are unsigned. See [development status](docs/progress.md).

## 👀 A look inside

Create pads, change their size, and choose which one opens by default.

![KeePad editor with ACTIVE badge, action buttons, and Columns and Rows controls](docs/screenshots/editor.png)

Open your compact pad from the menu bar, notification area, or keyboard shortcut.

![KeePad compact launcher in the Graphite theme](docs/screenshots/launcher.png)

<details>
<summary>Find a button across all pads</summary>

![KeePad launcher searching button names and descriptions across all pads](docs/screenshots/launcher-search.png)

</details>

<details>
<summary>See the button editor</summary>

![KeePad button editor with a sample text action, icons, and colors](docs/screenshots/button-editor.png)

</details>

<details>
<summary>KeePad in Dark mode</summary>

![KeePad Settings in Dark mode with the app-wide Theme selector](docs/screenshots/settings-dark.png)

</details>

<details>
<summary>Right-click a button</summary>

![KeePad button menu with Edit, Duplicate, Move to another pad, and Delete](docs/screenshots/button-menu.png)

</details>

Screenshots use sample data from the actual app, captured on Windows 11; on a Mac, shortcuts read **⌘ ⇧ Space** instead of **Ctrl Shift Space**. [How they are made](docs/screenshots/README.md).

## ✨ What you can do

- **Find any button quickly:** summon KeePad and type. Search covers button names and descriptions across every pad, with name matches first.
- **Make several pads** for work, projects, or personal shortcuts.
- **Give each button an action:** website, file, folder, app, text to copy, or Sleep computer.
- **Choose icons or your own images**, button colors, and six pad themes.
- **Choose Light, Dark, or System** in Settings → Theme. Each pad keeps its own **Pad Theme**, and its pad icon can be **None**.
- **Adjust Columns and Rows** with simple −/+ controls. KeePad prevents shrinking a pad if it would hide saved buttons.
- **Arrange buttons visually:** drag them around the editor, or choose a spot on the mini pad in the button dialog. Dropping onto another button swaps their positions.
- **Right-click a button** to edit, duplicate, move it to another pad, or delete it. This works in the editor and the compact pad.
- **Drop a file onto the editor grid** to make an open-file button. Folders and applications work too. Drop one item at a time; replacing an existing action asks for confirmation.
- **Preview before activating.** The eye button shows a pad without changing your active choice.
- **Find broken destinations:** Settings → Destinations → Check destinations checks file, folder, and app buttons across all pads. Repair updates the button’s local destination.
- **Keep your setup locally**, with backup export and import.

## 🧭 Using KeePad

1. Click **New pad**, give it a name, and create it.
2. Click an empty **+** button. Choose an action, enter its destination if needed, then save. **Sleep computer** needs only a button name.
3. Adjust **Pad Theme**, **Columns**, and **Rows** as needed.
4. Click **Make Active**, or double-click the pad's name in the sidebar. Its **ACTIVE** badge tells you it is selected for everyday use.
5. Open the pad whenever you need it:

| Computer | Default shortcut | Mouse option |
| --- | --- | --- |
| Mac | **Command + Shift + Space** | Click KeePad in the menu bar |
| Windows | **Ctrl + Shift + Space** | Click KeePad in the notification area beside the clock |

💡 **Windows 11 tip:** new notification-area icons start out hidden behind the **^** arrow beside the clock. Drag KeePad from there onto the taskbar to keep it in view.

The pad opens in the center of the screen containing your pointer. Click a button to run its action, or type into the automatically focused search box. Use **↑/↓** and **Enter** to run a result; each result shows its pad. Searching and running a result leave your active pad unchanged. **Esc** clears a search first, then hides the pad. Closing a window keeps KeePad running; to exit, right-click its menu-bar/notification icon and choose **Quit KeePad**.

Search ignores case and accents and matches all the words you type in button names or descriptions (the **Hover hint** field). It does not inspect files, paths, URLs, or copied text. Each summon clears the previous search.

To bind a file quickly, drag it from Finder or File Explorer onto an empty **+** position in the editor. Dropping onto an existing button replaces only its action after confirmation; its name and image stay the same. Files stay in their original location.

Single-clicking a pad selects it for editing. The **eye**, **pencil**, **copy**, and **trash** toolbar buttons preview, edit, duplicate, and delete it. Hover over an icon for help. Settings lets you choose Light/Dark/System appearance, change the shortcut, choose whether the pad hides after an action, and manage backups.

## 🌙 Put your computer to sleep

Create a button with **Action → Sleep computer**, name it, and save. Click it in the launcher or run its search result to request sleep immediately, without another confirmation. Wake the computer normally to return. Creating, editing, or opening a pad preview does not run the action; clicking the Sleep button inside that preview does.

Sleep uses the current computer's OS operation on Windows and macOS. It does not change power settings, request hibernation, or guarantee that waking requires a password; your OS settings and hardware determine that behavior. **Lock is not included.** Windows uses its bundled Windows PowerShell and .NET; system policy can block the request. macOS uses its built-in `pmset` tool and needs no Accessibility permission. Actual sleep/wake on hardware remains a manual validation item for this development release.

![Sleep button editor with no destination field](docs/screenshots/sleep-button.png)

Sleep buttons and the moon icon require KeePad **0.3.0 or later**, including when importing backups. Before the first save introducing either, KeePad preserves the previous local file beside it as `keepad.json.before-system-actions-…`. Export a backup before downgrading and use the pre-feature copy with older versions; older versions cannot read these new values. [Compatibility details](docs/data-model.md#sleep-action-compatibility).

## 🔧 Repair a missing file or app

Open **Settings → Destinations → Check destinations**. KeePad lists paths that need attention and identifies missing items, access problems, and paths from another operating system. Click **Repair…** and select the replacement. Cancel leaves the button unchanged.

Repairs update the button’s saved destination on this computer. Checks never open files or run buttons. Network/cloud items may be temporarily unavailable; reconnect them and use **Check again**. An available path does not guarantee an app will launch or that a Windows shortcut's target exists.

<details>
<summary>See the destination checker</summary>

![KeePad checking sample destinations and offering local repairs](docs/screenshots/destination-check.png)

</details>

## 💾 Local storage and backups

KeePad keeps pads and preferences on this computer. To carry pads to another Mac or Windows device:

1. On Device 1, open **Settings → Backup → Export backup**.
2. Transfer the exported JSON file to Device 2.
3. On Device 2, open **Settings → Backup → Import pads** and choose that file.

Export includes **all pads**, button settings, images, and text snippets. Import adds copies without replacing existing pads or changing Device 2's preferences and active pad. Importing the same backup again creates more copies; it does not update previously imported pads. Actual files and applications are not included, so use **Check destinations → Repair…** for paths that differ. Later edits do not transfer automatically.

Upgrading from a build with synchronization? KeePad preserves the locally stored pads and their device-specific destinations, saves a recovery copy, and leaves former shared folders untouched. [Upgrade and recovery details](docs/synchronization.md).

## 🚀 Try the development build

Signed releases are not available yet. Repository collaborators can use the unsigned Windows draft builds described below. To run from source on Mac or Windows:

1. Install **Node.js 24**, which includes npm, and Git.
2. Open Terminal (Mac) or PowerShell (Windows).
3. Run these commands, one at a time. Your GitHub account needs access to this private repository:

```sh
git clone https://github.com/mtom2k/keepad.git
cd keepad
npm ci
npm run dev
```

The first two commands download KeePad and enter its folder. `npm ci` downloads the project's dependencies. `npm run dev` starts KeePad and opens its editor on first use. Keep the terminal open while using this development mode.

To create an application bundle or installer locally, see [packaging instructions](docs/releasing.md). On Windows, `npm run package:win` produces an installer (`KeePad-Setup-<version>.exe`) and a single-file portable app (`KeePad-Portable-<version>.exe`) in `release/`. Both are unsigned, so Windows SmartScreen may warn before running them. Repository collaborators can also download these Windows files from the latest **draft** [GitHub release](https://github.com/mtom2k/keepad/releases). Developers can find all commands in the [generated reference](docs/reference.md).

## 🔒 Your data and permissions

Pads, images, preferences, and snippets are stored on your computer. KeePad does not synchronize with other devices. Backups include images, file paths, and copied text, so keep them somewhere private. Imported paths may need updating on another computer.

macOS may ask before opening a protected folder. KeePad does not require Accessibility, screen-recording, or Full Disk Access for its current actions. Launch at login is available after installing the packaged app.

Need help? Read [troubleshooting](docs/troubleshooting.md).

## 🛠️ For developers and coding agents

Start with [the knowledge base](docs/README.md) and [contributor instructions](AGENTS.md).

| Looking for… | Read |
| --- | --- |
| Setup and contribution workflow | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Current progress and next work | [Development progress](docs/progress.md) |
| How the app is built | [Architecture](docs/architecture.md) |
| Why decisions were made | [Architecture decision records](docs/adr/README.md) |
| Data formats and safeguards | [Data model](docs/data-model.md) |
| Tests and screenshots | [Testing](docs/testing.md) |
| Keeping documentation current | [Documentation maintenance](docs/maintenance.md) |
| Taking over or handing off work | [Developer and AI handoff](docs/handoff.md) |

**Documentation is part of the feature:** work is complete when implementation, current guides, validation evidence, and handoff agree. Documentation changes belong in the same commit as the code they describe. Local checks verify relative file links, generated reference freshness, and documentation impact; contributors still review the content for accuracy. GitHub hosts the private source repository; no CI/CD is configured.
