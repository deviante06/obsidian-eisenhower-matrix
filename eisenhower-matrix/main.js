const {
  Plugin,
  ItemView,
  Notice,
  PluginSettingTab,
  Setting,
  TFile,
  MarkdownRenderer
} = require("obsidian");

const VIEW_TYPE = "eisenhower-matrix-view";

// ===== Settings =====
const DEFAULT_SETTINGS = {
  taskFile: "EisenhowerTasks.md",
  showCompleted: true,
  colorizeQuadrants: true,

  enableCounters: true,
  enableHideCompletedToggle: true,
  enableSearch: true
};

// ===== Helpers =====
function stripServiceTags(s) {
  return s.replace(/\s*#important\b/gi, "").replace(/\s*#urgent\b/gi, "").trim();
}
function quadrantOf(task) {
  if (task.important && task.urgent) return "IU";
  if (task.important && !task.urgent) return "InU";
  if (!task.important && task.urgent) return "nIU";
  return "nInU";
}
function tagsFromFlags(important, urgent) {
  const tags = [];
  if (important) tags.push("#important");
  if (urgent) tags.push("#urgent");
  return tags;
}

module.exports = class EisenhowerMatrixPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    this.registerView(VIEW_TYPE, (leaf) => new MatrixView(leaf, this));

    this.addCommand({
      id: "open-eisenhower-matrix",
      name: "Open Eisenhower Matrix",
      callback: () => this.activateView()
    });
    this.addRibbonIcon("layout-grid", "Eisenhower Matrix", () => this.activateView());

    this.addSettingTab(new MatrixSettingTab(this.app, this));

    this.registerEvent(this.app.vault.on("modify", (file) => {
      if (file instanceof TFile && file.extension === "md") this.refreshViews();
    }));
    this.registerEvent(this.app.metadataCache.on("changed", (file) => {
      if (file instanceof TFile) this.refreshViews();
    }));
  }

  async activateView() {
    const leaf =
      this.app.workspace.getLeavesOfType(VIEW_TYPE)[0] ??
      this.app.workspace.getRightLeaf(false);
    if (!leaf) return;
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  refreshViews() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => {
      const v = leaf.view;
      if (v && typeof v.renderMatrix === "function") v.renderMatrix();
    });
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.refreshViews();
  }

  // ===== File ops =====
  async getTaskFile() {
    let file = this.app.vault.getAbstractFileByPath(this.settings.taskFile);
    if (!file) {
      file = await this.app.vault.create(this.settings.taskFile, "# Eisenhower Tasks\n");
    }
    return file;
  }

  // Возвращает {tasks, lines}
  async readTasksFresh() {
    const file = await this.getTaskFile();
    const content = await this.app.vault.read(file);
    const lines = content.split(/\r?\n/);

    const tasks = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^\s*-\s*\[( |x)\]\s+(.*)$/i);
      if (!m) continue;
      const checked = m[1].toLowerCase() === "x";
      if (checked && !this.settings.showCompleted) continue;

      const body = m[2];
      const tags = (body.match(/#[\p{L}\p{N}_-]+/gu) || []).map(t => t.toLowerCase());

      tasks.push({
        id: String(i),
        line: i,
        text: body,
        checked,
        important: tags.includes("#important"),
        urgent: tags.includes("#urgent")
      });
    }
    return { tasks, lines };
  }

  async writeLines(lines) {
    const file = await this.getTaskFile();
    await this.app.vault.modify(file, lines.join("\n"));
  }

  // ===== Task actions =====
  async addTask(text, important, urgent) {
    const file = await this.getTaskFile();
    let content = await this.app.vault.read(file);
    const tags = tagsFromFlags(important, urgent);
    const line = `- [ ] ${text} ${tags.join(" ")}`.trim();

    if (!content.endsWith("\n")) content += "\n";
    content += line + "\n";
    await this.app.vault.modify(file, content);
    new Notice("Task added");
  }

  async toggleTask(lineIndex) {
    const { lines } = await this.readTasksFresh();
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    let line = lines[lineIndex];

    if (/\- \[x\]/i.test(line)) line = line.replace(/\- \[x\]/i, "- [ ]");
    else line = line.replace(/\- \[ \]/, "- [x]");

    lines[lineIndex] = line;
    await this.writeLines(lines);
  }

  async deleteTask(lineIndex) {
    const { lines } = await this.readTasksFresh();
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    lines.splice(lineIndex, 1);
    await this.writeLines(lines);
    new Notice("Task deleted");
  }

  async moveTaskToQuadrant(lineIndex, important, urgent) {
    const { lines } = await this.readTasksFresh();
    if (lineIndex < 0 || lineIndex >= lines.length) return;

    let line = lines[lineIndex];
    line = line.replace(/\s*#important\b/gi, "").replace(/\s*#urgent\b/gi, "");
    const tagText = tagsFromFlags(important, urgent).join(" ");
    if (tagText) line = line.trimEnd() + " " + tagText;
    lines[lineIndex] = line;

    await this.writeLines(lines);
    new Notice("Task moved");
  }

  async reorderByLineIndex(from, to) {
    if (from === to) return;
    const { lines } = await this.readTasksFresh();
    if (from < 0 || from >= lines.length || to < 0 || to > lines.length) return;
    const newLines = [...lines];
    const [moved] = newLines.splice(from, 1);
    const insertAt = to > from ? to - 1 : to;
    newLines.splice(insertAt, 0, moved);
    await this.writeLines(newLines);
  }
};

// ===== View =====
class MatrixView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;

    // Переменные UI состояния (не сохраняем в settings)
    this.filterQuery = "";
  }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "Eisenhower Matrix"; }
  getIcon() { return "layout-grid"; }

  async onOpen() { await this.renderMatrix(); }

  applyFilters(tasks) {
    // Фильтруем по тексту
    const q = (this.filterQuery || "").toLowerCase();
    if (!q) return tasks;
    return tasks.filter(t => stripServiceTags(t.text).toLowerCase().includes(q));
  }

  // Подсчёт задач для заголовка (после фильтров и учёта showCompleted)
  countByQuadrant(tasks, code) {
    return tasks.filter(t => {
      return quadrantOf(t) === code;
    }).length;
  }

  async renderMatrix() {
    const root = this.containerEl;
    root.empty();
    root.addClass("eisenhower-view");
    root.toggleClass("colorized", !!this.plugin.settings.colorizeQuadrants);

    // ===== Верхняя панель (поиск и переключатель "Hide completed")
    const topbar = root.createDiv({ cls: "eisenhower-topbar" });

    if (this.plugin.settings.enableSearch) {
      const searchWrap = topbar.createDiv({ cls: "em-search" });
      const input = searchWrap.createEl("input", {
        type: "search",
        placeholder: "Search tasks…"
      });
      input.value = this.filterQuery;
      input.oninput = async () => {
        this.filterQuery = input.value || "";
        await this.renderMatrix();
      };
      const clearBtn = searchWrap.createEl("button", { text: "✕" });
      clearBtn.onclick = async () => {
        this.filterQuery = "";
        input.value = "";
        await this.renderMatrix();
      };
    }

    if (this.plugin.settings.enableHideCompletedToggle) {
      const btnWrap = topbar.createDiv({ cls: "em-controls" });
      const toggle = btnWrap.createEl("button", {
        text: this.plugin.settings.showCompleted ? "Hide completed" : "Show completed",
        cls: "em-toggle"
      });
      toggle.onclick = async () => {
        this.plugin.settings.showCompleted = !this.plugin.settings.showCompleted;
        await this.plugin.saveSettings(); // перерендерит вьюху
      };
    }

    // Скролл-контейнер
    const content = root.createDiv({ cls: "eisenhower-content" });
    const wrap = content.createDiv({ cls: "eisenhower-wrap" });

    const quadrants = [
      { code: "IU",   title: "Do First (Important + Urgent)", important: true,  urgent: true  },
      { code: "InU",  title: "Schedule (Important, not Urgent)", important: true,  urgent: false },
      { code: "nIU",  title: "Delegate (Urgent, not Important)", important: false, urgent: true  },
      { code: "nInU", title: "Eliminate (Neither Important nor Urgent)", important: false, urgent: false }
    ];

    // Считываем задачи, применяем поиск
    const { tasks } = await this.plugin.readTasksFresh();
    const visibleTasks = this.applyFilters(tasks);

    for (const q of quadrants) {
      const col = wrap.createDiv({ cls: `eisenhower-quadrant q-${q.code}` });

      // Заголовок (+ счётчик)
      const title = col.createDiv({ cls: "eisenhower-title" });
      if (this.plugin.settings.enableCounters) {
        const count = this.countByQuadrant(visibleTasks, q.code);
        title.createSpan({ text: `${q.title} (${count})` });
      } else {
        title.createSpan({ text: q.title });
      }

      // Drop на пустую область квадранта (ретегирование)
      col.ondragover = (e) => { e.preventDefault(); col.addClass("drag-over"); };
      col.ondragleave = () => col.removeClass("drag-over");
      col.ondrop = async (e) => {
        e.preventDefault();
        col.removeClass("drag-over");
        const payload = e.dataTransfer?.getData("text/plain");
        if (!payload) return;
        const fromLine = Number(payload);
        if (Number.isNaN(fromLine)) return;
        await this.plugin.moveTaskToQuadrant(fromLine, q.important, q.urgent);
        await this.renderMatrix();
      };

      // Форма добавления
      const form = col.createDiv({ cls: "add-task-form" });
      const input = form.createEl("input", {
        type: "text",
        placeholder: "New task... (supports [[Page]] and [text](https://url))"
      });
      const btn = form.createEl("button", { text: "Add" });
      btn.onclick = async () => {
        const val = input.value.trim();
        if (!val) return;
        await this.plugin.addTask(val, q.important, q.urgent);
        input.value = "";
        await this.renderMatrix();
      };

      // Прокручиваемый список
      const list = col.createDiv({ cls: "tasks-list" });

      // Рендер карточек с учётом фильтров
      const qTasks = visibleTasks.filter((t) => quadrantOf(t) === q.code);
      for (const t of qTasks) {
        const card = list.createDiv({ cls: "task-card" });

        // ---- Drag handle (только он draggable) ----
        const handle = card.createSpan({ cls: "drag-handle", text: "⋮⋮" });
        handle.setAttr("title", "Drag");
        handle.setAttr("draggable", "true");
        handle.ondragstart = (e) => { e.dataTransfer?.setData("text/plain", String(t.line)); };

        // Чекбокс
        const cb = card.createEl("input", { type: "checkbox" });
        cb.checked = t.checked;
        if (t.checked) card.addClass("done");
        cb.onchange = async () => {
          await this.plugin.toggleTask(t.line);
          await this.renderMatrix();
        };

        // Текст задачи как Markdown (ссылки кликабельны)
        const textHost = card.createDiv({ cls: "task-text" });
        const md = stripServiceTags(t.text);
        await MarkdownRenderer.renderMarkdown(
          md,
          textHost,
          this.plugin.settings.taskFile, // sourcePath для [[wikilinks]]
          this // компонент — сам view
        );

        // Внутренние ссылки открываем через API Obsidian (надёжно)
        const sourcePath = this.plugin.settings.taskFile;
        textHost.querySelectorAll("a").forEach((a) => {
          a.setAttribute("draggable", "false");
          a.addEventListener("mousedown", (ev) => ev.stopPropagation(), { passive: true });

          a.addEventListener("click", (ev) => {
            const isInternal = a.classList.contains("internal-link");
            if (isInternal) {
              ev.preventDefault();
              ev.stopPropagation();
              const target = a.getAttribute("data-href") || a.getAttribute("href") || "";
              if (target) {
                this.app.workspace.openLinkText(target, sourcePath, false);
              }
            }
          });
        });

        // Удаление
        const delBtn = card.createEl("button", { text: "🗑" });
        delBtn.style.marginLeft = "auto";
        delBtn.onclick = async () => {
          await this.plugin.deleteTask(t.line);
          await this.renderMatrix();
        };

        // ---- DnD внутри квадранта: бросаем НА карточку ----
        card.ondragover = (e) => { e.preventDefault(); card.addClass("drag-over"); };
        card.ondragleave = () => card.removeClass("drag-over");
        card.ondrop = async (e) => {
          e.preventDefault();
          card.removeClass("drag-over");
          const payload = e.dataTransfer?.getData("text/plain");
          if (!payload) return;
          const fromLine = Number(payload);
          if (Number.isNaN(fromLine)) return;

          if (quadrantOf(t) !== q.code) {
            await this.plugin.moveTaskToQuadrant(fromLine, q.important, q.urgent);
          }

          const { tasks: fresh } = await this.plugin.readTasksFresh();
          const targetTask = fresh.find(x =>
            quadrantOf(x) === q.code &&
            stripServiceTags(x.text) === stripServiceTags(t.text)
          );
          const sourceTask = fresh.find(x => x.line === fromLine);
          if (!targetTask || !sourceTask) { await this.renderMatrix(); return; }

          await this.plugin.reorderByLineIndex(sourceTask.line, targetTask.line);
          await this.renderMatrix();
        };
      }
    }
  }
}

// ===== Settings Tab =====
class MatrixSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Eisenhower Matrix — Settings" });

    new Setting(containerEl)
      .setName("Task file")
      .setDesc("Markdown file where tasks are stored.")
      .addText(t => {
        t.setPlaceholder("EisenhowerTasks.md")
          .setValue(this.plugin.settings.taskFile)
          .onChange(async (val) => {
            this.plugin.settings.taskFile = val.trim() || "EisenhowerTasks.md";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Show completed tasks")
      .setDesc("If disabled, completed tasks will be hidden.")
      .addToggle(t => {
        t.setValue(this.plugin.settings.showCompleted)
          .onChange(async (v) => {
            this.plugin.settings.showCompleted = v;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Colorize quadrants")
      .setDesc("Enable/disable quadrant color backgrounds.")
      .addToggle(t => {
        t.setValue(this.plugin.settings.colorizeQuadrants)
          .onChange(async (v) => {
            this.plugin.settings.colorizeQuadrants = v;
            await this.plugin.saveSettings();
          });
      });

    containerEl.createEl("h3", { text: "UI features" });

    new Setting(containerEl)
      .setName("Counters in headings")
      .setDesc("Show number of visible tasks in each quadrant title.")
      .addToggle(t => {
        t.setValue(this.plugin.settings.enableCounters)
          .onChange(async (v) => {
            this.plugin.settings.enableCounters = v;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Hide completed button")
      .setDesc("Show a top-bar button to quickly toggle completed tasks visibility.")
      .addToggle(t => {
        t.setValue(this.plugin.settings.enableHideCompletedToggle)
          .onChange(async (v) => {
            this.plugin.settings.enableHideCompletedToggle = v;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Search box")
      .setDesc("Show a top-bar search box to filter tasks by text.")
      .addToggle(t => {
        t.setValue(this.plugin.settings.enableSearch)
          .onChange(async (v) => {
            this.plugin.settings.enableSearch = v;
            await this.plugin.saveSettings();
          });
      });
  }
}
