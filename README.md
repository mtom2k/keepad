# ⌨️ KeePad

**Your own on-screen shortcut pad for Mac and Windows.**

KeePad gives your everyday actions a button: open a website, file, folder, or app, or copy a text snippet. It waits in your Mac's menu bar or Windows notification area until you need it.

> 🚧 **Development version:** native checks have passed on macOS Apple Silicon. Windows support is implemented, but its validation is tracked separately. Signed, ready-to-install releases are not available yet. See [development status](docs/progress.md).

## 👀 A look inside

Create pads, change their size, and choose which one opens by default.

![KeePad editor with ACTIVE badge, action buttons, and Columns and Rows controls](docs/screenshots/editor.png)

Open your compact pad from the menu bar, notification area, or keyboard shortcut.

![KeePad compact launcher in the Graphite theme](docs/screenshots/launcher.png)

<details>
<summary>See the button editor</summary>

![KeePad button editor with a sample text action, icons, and colors](docs/screenshots/button-editor.png)

</details>

<details>
<summary>KeePad in Dark mode</summary>

![KeePad Settings in Dark mode with the app-wide Theme selector](docs/screenshots/settings-dark.png)

</details>

Screenshots use sample data from the actual app. [How they are made](docs/screenshots/README.md).

## ✨ What you can do

- **Make several pads** for work, projects, or personal shortcuts.
- **Give each button an action:** website, file, folder, app, or text to copy.
- **Choose icons or your own images**, button colors, and six pad themes.
- **Choose Light, Dark, or System** in Settings → Theme. Each pad keeps its own **Pad Theme**, and its pad icon can be **None**.
- **Adjust Columns and Rows** with simple −/+ controls. KeePad prevents shrinking a pad if it would hide saved buttons.
- **Arrange buttons visually:** drag them around the editor, or choose a spot on the mini pad in the button dialog. Dropping onto another button swaps their positions.
- **Preview before activating.** The eye button shows a pad without changing your active choice.
- **Keep your setup locally**, with backup export and import. No account or cloud sync required.

## 🧭 Using KeePad

1. Click **New pad**, give it a name, and create it.
2. Click an empty **+** button. Choose an action, enter its destination, then save.
3. Adjust **Pad Theme**, **Columns**, and **Rows** as needed.
4. Click **Make Active**, or double-click the pad's name in the sidebar. Its **ACTIVE** badge tells you it is selected for everyday use.
5. Open the pad whenever you need it:

| Computer | Default shortcut | Mouse option |
| --- | --- | --- |
| Mac | **Command + Shift + Space** | Click KeePad in the menu bar |
| Windows | **Ctrl + Shift + Space** | Click KeePad in the notification area beside the clock |

The pad opens in the center of the screen containing your pointer. Click a button to run its action. **Esc** hides the pad. Closing a window keeps KeePad running; to exit, right-click its menu-bar/notification icon and choose **Quit KeePad**.

Single-clicking a pad selects it for editing. The **eye**, **pencil**, **copy**, and **trash** toolbar buttons preview, edit, duplicate, and delete it. Hover over an icon for help. Settings lets you change the shortcut, choose whether the pad hides after an action, and manage backups.

## 🚀 Try the development build

There is no one-click installer release yet. If you are comfortable running a few terminal commands:

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

To create an application bundle or installer locally, see [packaging instructions](docs/releasing.md). Developers can find all commands in the [generated reference](docs/reference.md).

## 🔒 Your data and permissions

Pads, images, and snippets are stored on your computer. Backups include your images, file paths, and copied text, so keep them somewhere private. Imported file paths may need updating on another computer.

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

Documentation changes belong in the same commit as the code they describe. Local checks verify links, generated reference freshness, and documentation impact; contributors still review the content for accuracy. GitHub hosts the private source repository; no CI/CD is configured.
