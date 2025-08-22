# Eisenhower Matrix for Obsidian
<img width="1919" height="1021" alt="image" src="https://github.com/user-attachments/assets/3a7b6f76-b9c1-4aae-8062-dbc2b0b06006" />
<img width="1919" height="1025" alt="image" src="https://github.com/user-attachments/assets/6a3b3494-6241-4849-89d4-cafb3a41ac88" />


A simple but powerful **Eisenhower Matrix** task board inside Obsidian.

- 4 quadrants: **Do First**, **Schedule**, **Delegate**, **Eliminate**
- Add tasks directly from each quadrant
- Mark complete / delete with one click
- **Drag & drop** between quadrants (retags automatically) and **reorder** inside a quadrant
- **Clickable** Obsidian wiki-links `[[Note]]` and Markdown links `[text](url)`
- Optional **task counters**, **quick search**, and **Hide completed** button
- Scrollable columns; unlimited tasks
- All data lives in a single Markdown file (default: `EisenhowerTasks.md`)
- Zero telemetry, zero network requests



## How it works

The plugin reads a Markdown task file (default `EisenhowerTasks.md`) and places tasks into quadrants based on tags:

| Tags on the task                      | Quadrant   |
|--------------------------------------|------------|
| `#important` **and** `#urgent`       | Do First   |
| `#important` **only**                | Schedule   |
| `#urgent` **only**                   | Delegate   |
| _(no tags)_                           | Eliminate  |

**Examples**
```markdown
- [ ] Finish report #important #urgent      # → Do First
- [ ] Go jogging #important                 # → Schedule
- [ ] Answer email #urgent                  # → Delegate
- [ ] Watch a movie                         # → Eliminate
You can:

type tasks manually in the file (as above), or

add tasks from the matrix UI (the plugin will apply the right tags automatically).

Dragging a task between quadrants updates its tags (#important / #urgent) in the file.
Dragging a task within the same quadrant reorders the lines in the file.

Clicking the checkbox turns - [ ] into - [x]. If “Show completed” is off, completed tasks are hidden.

Features
Add / Complete / Delete tasks directly in the matrix

Drag & drop:

Between quadrants → auto-retag

Within the same quadrant → reorder in the file

Clickable links:

[[WikiLinks]] open notes in Obsidian

[text](https://url) open external links

Counters (optional) — show the number of visible tasks in each quadrant title

Quick search (optional) — filters visible tasks as you type

Hide Completed button (optional) — one-click toggle in the top bar

Colors (optional) — subtle background color per quadrant

Scroll — long columns are scrollable

All-local — tasks are regular Markdown checkboxes stored in your vault

Installation
From Community plugins (once accepted)
In Obsidian, go to Settings → Community plugins.

Turn Restricted mode off.

Click Browse and search for Eisenhower Matrix.

Install and enable.

Manual install (now)
Download the latest release assets:

manifest.json

versions.json

main.js

styles.css

Create a folder in your vault:

perl
Копировать
Редактировать
<your-vault>/.obsidian/plugins/eisenhower-matrix/
Put all four files directly in that folder (no extra subfolders).

Restart Obsidian and enable the plugin in Settings → Community plugins.

Beta testing via BRAT (recommended for testers)
Install obsidian42-brat from Community plugins.

Command Palette → BRAT: Add a beta plugin for testing.

Paste: YOUR-USERNAME/YOUR-REPO.

BRAT will pull the plugin directly from your repo.

Quick start
Open the matrix: Command Palette → Open Eisenhower Matrix (you can add a ribbon icon too).

Add tasks in the input box under any quadrant title (links work: [[Note]], [text](url)).

Drag tasks between quadrants to change importance/urgency tags.

Check tasks off or delete with the 🗑 button.

Use the Search box (if enabled) to filter tasks quickly.

Click Hide completed (if enabled) to toggle visibility.

Settings
Settings → Eisenhower Matrix

Task file: Path to the Markdown file used to store tasks.
Default: EisenhowerTasks.md

Show completed tasks: Show/hide completed tasks (- [x]) globally.

Colorize quadrants: Enable/disable background colors for quadrants.

Counters in headings: Show the number of visible tasks in each quadrant.

Hide completed button: Show a top-bar button to toggle completed visibility.

Search box: Show a top-bar search box to filter tasks by text.

Tips
Assign a hotkey for “Open Eisenhower Matrix” in Settings → Hotkeys.

Use [[WikiLinks]] in task text to connect tasks to your notes.

Keep separate files if you prefer: e.g., Eisenhower-Work.md, Eisenhower-Personal.md.
Just switch the Task file setting when needed.

Compatibility
Requires Obsidian 1.5.0+ (see minAppVersion).

Desktop and mobile supported (mobile UI may be tighter with many tasks).

Troubleshooting
“I don’t see the plugin”
Make sure files are here:

perl
<vault>/.obsidian/plugins/eisenhower-matrix/
  ├─ manifest.json
  ├─ main.js
  ├─ styles.css
  └─ versions.json
And Restricted mode is off in Settings → Community plugins.

“Links don’t open when I click them”
Use the latest version. Only the drag handle ⋮⋮ is draggable; links should be clickable.
[[WikiLinks]] are opened via Obsidian API; external links use default behavior.

“Performance with very large lists”
The matrix can show hundreds of tasks, but rendering 1,000+ may feel slower.
Use Search, Hide completed, or split tasks across multiple files.

Privacy & Security
No telemetry, no external requests.

All data stays in your Obsidian vault as plain Markdown.

Contributing
PRs and feature ideas are welcome!

File bugs and requests via Issues.

Keep PRs focused and include a short description + screenshots if UI changes.

Dev notes
This plugin is plain JavaScript (main.js) using Obsidian’s API.

No build step required. Just open Obsidian in a dev vault and enable the plugin.

Roadmap (ideas)
Due dates / date parsing (@today, 📅 2025-09-01)

Tag/project filters

Export matrix (weekly report note, or image)

Optional “done/total” progress bars in headers

Open links in a specific split
