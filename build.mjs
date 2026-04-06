import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const SECTIONS_DIR = path.join(ROOT, "sections");
const DIST = path.join(ROOT, "dist");

function parseSectionFile(raw) {
  return YAML.parse(raw);
}

function trimSentenceStem(s) {
  let t = String(s ?? "").trimEnd();
  while (t.length && (t.endsWith(".") || t.endsWith("…"))) {
    t = t.slice(0, -1).trimEnd();
  }
  return t;
}

function normalizeSection(data, filename) {
  const id =
    data.id ??
    path.basename(filename, path.extname(filename)).replace(/[^a-zA-Z0-9_-]/g, "-");
  const title = data.title ?? data.heading ?? "Section";
  const question = data.question != null ? String(data.question).trim() : "";
  // If sentence_stem is explicitly present in YAML (even ""), use it as-is and
  // don't fall back to question — allows sections that output a bare list.
  const sentenceStem =
    data.sentence_stem != null ? String(data.sentence_stem).trim() : null;
  const stemSource = sentenceStem !== null ? sentenceStem : question;
  const stem = trimSentenceStem(stemSource);
  const prompt = question || sentenceStem;
  const staticText = data.static_text ?? data.staticText ?? "";
  const rawOptions = Array.isArray(data.options) ? data.options : [];
  const order = typeof data.order === "number" ? data.order : 0;

  const options = rawOptions.map((opt) => {
    if (!opt.id || opt.label == null || String(opt.label).trim() === "") {
      throw new Error(`Section "${id}": each option needs id and label (${filename})`);
    }
    return { id: String(opt.id), label: String(opt.label).trim() };
  });

  const categoryRaw = data.category != null ? String(data.category).trim() : "";
  const category = categoryRaw || "General";

  return { id, title, prompt, stem, static_text: staticText, options, order, category };
}

function buildPage(sections) {
  const payload = JSON.stringify(sections);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Generated page</title>
  <style>
    :root {
      --bg: #0f1419;
      --surface: #1a2332;
      --border: #2d3a4d;
      --text: #e7ecf3;
      --muted: #8b9cb3;
      --accent: #5b9fd4;
      --accent-dim: #3d7cae;
      --ok: #6bcf8e;
      font-family: "Segoe UI", system-ui, sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: radial-gradient(1200px 600px at 10% -10%, #1a2a3d 0%, transparent 55%),
        radial-gradient(900px 500px at 100% 0%, #152535 0%, transparent 50%),
        var(--bg);
      color: var(--text);
      line-height: 1.55;
    }
    header {
      padding: 2.5rem 1.5rem 1.5rem;
      max-width: 52rem;
      margin: 0 auto;
    }
    header h1 {
      margin: 0 0 0.35rem;
      font-size: 1.65rem;
      font-weight: 650;
      letter-spacing: -0.02em;
    }
    header p {
      margin: 0;
      color: var(--muted);
      font-size: 0.95rem;
    }
    .name-bar {
      margin-top: 1.25rem;
      max-width: 36rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .name-bar label {
      font-size: 0.85rem;
      color: var(--muted);
      white-space: nowrap;
    }
    .name-bar input {
      flex: 1;
      min-width: 12rem;
      padding: 0.5rem 0.65rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: rgba(0,0,0,0.25);
      color: var(--text);
      font: inherit;
      font-size: 0.95rem;
    }
    button.name-reset {
      flex-shrink: 0;
      appearance: none;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.06);
      color: var(--muted);
      padding: 0.45rem 0.85rem;
      border-radius: 8px;
      font: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
    }
    button.name-reset:hover {
      color: var(--text);
      background: rgba(255,255,255,0.1);
    }
    main {
      max-width: 52rem;
      margin: 0 auto;
      padding: 0 1.5rem 4rem;
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }
    .category-tabs {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.45rem;
      padding-bottom: 0.65rem;
      border-bottom: 1px solid var(--border);
    }
    .category-tab {
      appearance: none;
      border: 1px solid var(--border);
      background: rgba(0,0,0,0.2);
      color: var(--muted);
      padding: 0.4rem 0.85rem;
      border-radius: 999px;
      font: inherit;
      font-size: 0.88rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    }
    .category-tab:hover {
      color: var(--text);
      background: rgba(255,255,255,0.05);
    }
    .category-tab.category-tab-active {
      border-color: var(--accent-dim);
      background: rgba(91, 159, 212, 0.12);
      color: var(--text);
    }
    section.card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.35rem 1.35rem 1.25rem;
      box-shadow: 0 12px 40px rgba(0,0,0,0.25);
    }
    section.card h2 {
      margin: 0 0 0.75rem;
      font-size: 1.15rem;
      font-weight: 600;
    }
    .section-head {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }
    .section-head h2 {
      margin: 0;
      flex: 1;
      min-width: 0;
      font-size: 1.15rem;
      font-weight: 600;
    }
    button.add-option {
      flex-shrink: 0;
      width: 1.75rem;
      height: 1.75rem;
      padding: 0;
      line-height: 1;
      font-size: 1.35rem;
      font-weight: 500;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.06);
      color: var(--accent);
      cursor: pointer;
      transition: background 0.15s ease, transform 0.08s ease;
    }
    button.add-option:hover {
      background: rgba(91, 159, 212, 0.15);
    }
    button.add-option:active { transform: scale(0.95); }
    .question {
      margin: 0 0 1rem;
      color: var(--muted);
      font-size: 0.92rem;
    }
    fieldset.options {
      border: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }
    .opt {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      cursor: pointer;
      user-select: none;
      padding: 0.35rem 0.25rem;
      border-radius: 8px;
      transition: background 0.15s ease;
    }
    .opt:hover { background: rgba(255,255,255,0.04); }
    .opt input {
      margin-top: 0.2rem;
      accent-color: var(--accent);
      width: 1.05rem;
      height: 1.05rem;
    }
    .opt span { flex: 1; font-size: 0.95rem; }
    .output-block {
      margin-top: 1.15rem;
      padding-top: 1.1rem;
      border-top: 1px solid var(--border);
    }
    .output-block label {
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      margin-bottom: 0.45rem;
    }
    pre.output {
      margin: 0;
      padding: 0.85rem 1rem;
      background: rgba(0,0,0,0.35);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 0.88rem;
      white-space: pre-wrap;
      word-break: break-word;
      min-height: 3rem;
      font-family: ui-monospace, "Cascadia Code", "Consolas", monospace;
      color: #d4e3f5;
    }
    .actions {
      margin-top: 0.75rem;
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    button.copy {
      appearance: none;
      border: 1px solid var(--accent-dim);
      background: linear-gradient(180deg, #3d6f9a 0%, #2d5a82 100%);
      color: #fff;
      padding: 0.45rem 0.95rem;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.08s ease, filter 0.15s ease;
    }
    button.copy:hover { filter: brightness(1.08); }
    button.copy:active { transform: scale(0.98); }
    button.copy.copied {
      border-color: var(--ok);
      background: linear-gradient(180deg, #3d8a5c 0%, #2d6b45 100%);
    }
    button.danger {
      border-color: #8b4a4a;
      background: linear-gradient(180deg, #6a3d3d 0%, #4a2d2d 100%);
    }
    button.danger:hover { filter: brightness(1.1); }
    .add-panel .field {
      margin-bottom: 1rem;
    }
    .add-panel label {
      display: block;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      margin-bottom: 0.35rem;
    }
    .add-panel .hint { font-weight: 400; text-transform: none; letter-spacing: 0; }
    .add-panel input,
    .add-panel textarea {
      width: 100%;
      max-width: 100%;
      padding: 0.55rem 0.65rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: rgba(0,0,0,0.25);
      color: var(--text);
      font: inherit;
      font-size: 0.95rem;
    }
    .add-panel textarea {
      resize: vertical;
      min-height: 6rem;
      font-family: ui-monospace, "Cascadia Code", "Consolas", monospace;
      font-size: 0.88rem;
    }
    .form-actions { margin-top: 0.5rem; }
    footer {
      text-align: center;
      padding: 2rem 1rem;
      color: var(--muted);
      font-size: 0.8rem;
    }
    .email-dad-wrap {
      padding-top: 3rem;
      margin-top: 0.5rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: center;
      align-items: center;
    }
    button.email-dad-btn {
      min-width: 10rem;
      padding: 0.55rem 1.25rem;
      font-size: 0.95rem;
    }
  </style>
</head>
<body>
  <header>
    <h1 id="page-title">Static text builder</h1>
    <p id="page-subtitle">Use <code>$name$</code> in YAML or options to insert the name below. Each block has its own copy button; sections you add are saved in this browser only.</p>
    <div class="name-bar">
      <label for="person-name">Name</label>
      <input type="text" id="person-name" placeholder="e.g. Jamie Rivera" maxlength="200" autocomplete="name" />
      <button type="button" id="reset-all-btn" class="name-reset" title="Clear name and uncheck every option in every section" aria-label="Reset name and all checkboxes">Reset</button>
    </div>
  </header>
  <main>
    <div id="category-tabs" class="category-tabs" role="tablist" aria-label="Categories"></div>
    <div id="sections-root"></div>
    <div class="email-dad-wrap">
      <button type="button" id="email-dad-btn" class="copy email-dad-btn">Email Dad</button>
    </div>
    <section class="card add-panel" id="add-section-panel">
      <h2>Add a section</h2>
      <p class="question">Saved in local storage on this device — not synced to other browsers or machines.</p>
      <form id="add-section-form" autocomplete="off">
        <div class="field">
          <label for="as-category">Category</label>
          <input id="as-category" name="category" maxlength="80" placeholder="General" list="category-datalist" />
          <datalist id="category-datalist"></datalist>
        </div>
        <div class="field">
          <label for="as-title">Title</label>
          <input id="as-title" name="title" required maxlength="200" placeholder="e.g. Favorite foods" />
        </div>
        <div class="field">
          <label for="as-stem">Sentence stem</label>
          <input id="as-stem" name="stem" required maxlength="500" placeholder="e.g. My favorite foods are" />
        </div>
        <div class="field">
          <label for="as-prompt">Prompt above checkboxes <span class="hint">(optional — defaults to sentence stem)</span></label>
          <input id="as-prompt" name="prompt" maxlength="500" />
        </div>
        <div class="field">
          <label for="as-options">Options <span class="hint">(one per line)</span></label>
          <textarea id="as-options" name="options" required rows="5" placeholder="pizza&#10;mexican&#10;black licorice"></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="copy">Save section</button>
        </div>
      </form>
    </section>
  </main>
  <footer>Built-in blocks from <code>sections/*.yaml</code> — run <code>npm run build</code> to regenerate. Custom sections live in your browser.</footer>
  <script type="application/json" id="sections-data">${payload.replace(/</g, "\\u003c")}</script>
  <script>
(function () {
  var STORAGE_KEY = "static-site-maker-sections-v1";
  var ADDITIONS_KEY = "static-site-maker-option-additions-v1";
  var NAME_KEY = "static-site-maker-person-name-v1";
  var CATEGORY_KEY = "static-site-maker-active-category-v1";
  var embeddedSections = JSON.parse(document.getElementById("sections-data").textContent);
  var root = document.getElementById("sections-root");
  var nameInput = document.getElementById("person-name");
  var sections = [];
  var activeCategory = "";

  try {
    var savedName = localStorage.getItem(NAME_KEY);
    if (savedName !== null) nameInput.value = savedName;
  } catch (e) {}

  function getNameValue() {
    return nameInput ? nameInput.value : "";
  }

  /** Value substituted for $name$; use --- when the field is empty or only whitespace. */
  function nameSubstitution() {
    var v = getNameValue();
    return v.trim() ? v : "---";
  }

  function applyName(s) {
    return String(s || "").split("$name$").join(nameSubstitution());
  }

  function refreshAllNameDisplays() {
    root.querySelectorAll("[data-name-template]").forEach(function (el) {
      el.textContent = applyName(el.getAttribute("data-name-template"));
    });
    sections.forEach(function (sec) {
      updateSection(sec.id);
    });
  }

  function loadAdditions() {
    try {
      var raw = localStorage.getItem(ADDITIONS_KEY);
      if (!raw) return {};
      var o = JSON.parse(raw);
      return o && typeof o === "object" ? o : {};
    } catch (e) {
      return {};
    }
  }

  function saveAdditions(obj) {
    localStorage.setItem(ADDITIONS_KEY, JSON.stringify(obj));
  }

  function loadLocalSections() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocalSections(arr) {
    var toStore = arr.map(function (s) {
      return {
        id: s.id,
        title: s.title,
        prompt: s.prompt,
        stem: s.stem,
        static_text: s.static_text || "",
        options: s.options,
        order: s.order,
        category: s.category || "General"
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  }

  function getOrderedCategories(list) {
    var seen = {};
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i].category || "General";
      if (!seen[c]) {
        seen[c] = true;
        out.push(c);
      }
    }
    return out;
  }

  function setActiveCategory(cat) {
    if (!cat) return;
    activeCategory = cat;
    try {
      sessionStorage.setItem(CATEGORY_KEY, cat);
    } catch (e) {}
    document.querySelectorAll("#category-tabs .category-tab").forEach(function (btn) {
      var sel = btn.dataset.category === cat;
      btn.setAttribute("aria-selected", sel ? "true" : "false");
      btn.classList.toggle("category-tab-active", sel);
    });
    root.querySelectorAll("section.card").forEach(function (el) {
      var c = el.dataset.category || "General";
      el.hidden = c !== cat;
    });
  }

  function populateCategoryDatalist(cats) {
    var dl = document.getElementById("category-datalist");
    if (!dl) return;
    dl.innerHTML = "";
    for (var ci = 0; ci < cats.length; ci++) {
      var opt = document.createElement("option");
      opt.value = cats[ci];
      dl.appendChild(opt);
    }
  }

  function mergeSections() {
    var additions = loadAdditions();
    var local = loadLocalSections();
    var out = [];
    for (var e = 0; e < embeddedSections.length; e++) {
      var emb = embeddedSections[e];
      var extra = additions[emb.id] || [];
      var mergedOpts = emb.options.slice();
      for (var k = 0; k < extra.length; k++) {
        mergedOpts.push({ id: extra[k].id, label: extra[k].label });
      }
      out.push(
        Object.assign({}, emb, {
          options: mergedOpts,
          builtIn: true,
          category: emb.category || "General"
        })
      );
    }
    for (var i = 0; i < local.length; i++) {
      out.push(
        Object.assign({}, local[i], {
          builtIn: false,
          category: local[i].category || "General"
        })
      );
    }
    return out;
  }

  function addOptionToSection(sectionId, label) {
    label = String(label || "").trim();
    if (!label) return;
    var current = mergeSections().find(function (s) { return s.id === sectionId; });
    if (!current) return;
    var newOpt = {
      id: "opt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      label: label
    };
    if (current.builtIn) {
      var add = loadAdditions();
      if (!add[sectionId]) add[sectionId] = [];
      add[sectionId].push(newOpt);
      saveAdditions(add);
    } else {
      var loc = loadLocalSections();
      var idx = loc.findIndex(function (s) { return s.id === sectionId; });
      if (idx === -1) return;
      loc[idx].options = loc[idx].options.concat([newOpt]);
      saveLocalSections(loc);
    }
    render();
  }

  function trimStem(s) {
    var t = String(s || "").trimEnd();
    while (t.length && (t.endsWith(".") || t.endsWith("…"))) {
      t = t.slice(0, -1).trimEnd();
    }
    return t;
  }

  function removeLocalSection(id) {
    var local = loadLocalSections();
    saveLocalSections(local.filter(function (s) { return s.id !== id; }));
    render();
  }

  function selectedLabels(sec, selectedIds) {
    var set = {};
    for (var i = 0; i < selectedIds.length; i++) set[selectedIds[i]] = true;
    var out = [];
    for (var j = 0; j < sec.options.length; j++) {
      var o = sec.options[j];
      if (set[o.id]) out.push(o.label);
    }
    return out;
  }

  function formatList(labels) {
    var n = labels.length;
    if (n === 0) return "";
    if (n === 1) return labels[0];
    if (n === 2) return labels[0] + " and " + labels[1];
    var head = labels.slice(0, -1).join(", ");
    return head + ", and " + labels[n - 1];
  }

  function buildText(sec, selectedIds) {
    var labels = selectedLabels(sec, selectedIds);
    var list = formatList(labels);
    var stem = String(sec.stem || "").trimEnd();
    var sentence;
    if (!stem && !list) sentence = "";
    else if (!stem && list) sentence = list + ".";
    else if (stem && !list) sentence = stem + ".";
    else sentence = stem + " " + list + ".";

    var prefix = String(sec.static_text || "").trimEnd();
    var out;
    if (prefix && sentence) out = prefix + "\\n\\n" + sentence;
    else if (prefix) out = prefix;
    else out = sentence;
    return applyName(out);
  }

  function selectedIdsForSection(sectionId) {
    var ids = [];
    root.querySelectorAll('input[type="checkbox"][data-section-id="' + sectionId + '"]:checked').forEach(function (cb) {
      ids.push(cb.value);
    });
    return ids;
  }

  function updateSection(sectionId) {
    var sec = sections.find(function (x) { return x.id === sectionId; });
    if (!sec) return;
    var pre = document.getElementById("out-" + sectionId);
    if (!pre) return;
    pre.textContent = buildText(sec, selectedIdsForSection(sectionId));
  }

  function copyText(btn, text) {
    function ok() {
      btn.classList.add("copied");
      var prev = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(function () {
        btn.classList.remove("copied");
        btn.textContent = prev;
      }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(function () {
        fallbackCopy(text, ok);
      });
    } else {
      fallbackCopy(text, ok);
    }
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      done();
    } finally {
      document.body.removeChild(ta);
    }
  }

  function yamlDoubleQuoted(s) {
    var BS = String.fromCharCode(92);
    var t = String(s);
    var r = "";
    for (var yi = 0; yi < t.length; yi++) {
      var ch = t.charAt(yi);
      var code = t.charCodeAt(yi);
      if (ch === BS) r += BS + BS;
      else if (ch === '"') r += BS + '"';
      else if (code === 10) r += BS + "n";
      else if (code === 13) r += BS + "r";
      else r += ch;
    }
    return '"' + r + '"';
  }

  function sectionToYaml(sec) {
    var NL = String.fromCharCode(10);
    var lines = [];
    var ord = typeof sec.order === "number" ? sec.order : 0;
    lines.push("order: " + ord);
    lines.push("category: " + yamlDoubleQuoted(sec.category || "General"));
    lines.push("id: " + yamlDoubleQuoted(sec.id));
    lines.push("title: " + yamlDoubleQuoted(sec.title));
    var pr = sec.prompt || "";
    var stem = sec.stem || "";
    if (pr && stem && pr !== stem) {
      lines.push("question: " + yamlDoubleQuoted(pr));
      lines.push("sentence_stem: " + yamlDoubleQuoted(stem));
    } else if (pr) {
      lines.push("question: " + yamlDoubleQuoted(pr));
    } else if (stem) {
      lines.push("sentence_stem: " + yamlDoubleQuoted(stem));
    }
    var staticTxt = sec.static_text || "";
    if (String(staticTxt).trim()) {
      lines.push("static_text: |");
      var norm = String(staticTxt)
        .split(String.fromCharCode(13) + String.fromCharCode(10))
        .join(NL)
        .split(String.fromCharCode(13))
        .join(NL);
      norm.split(NL).forEach(function (line) {
        lines.push("  " + line);
      });
    }
    lines.push("options:");
    for (var oi = 0; oi < sec.options.length; oi++) {
      var o = sec.options[oi];
      lines.push("  - id: " + yamlDoubleQuoted(o.id));
      lines.push("    label: " + yamlDoubleQuoted(o.label));
    }
    return lines.join(NL);
  }

  function buildYamlExport() {
    sections = mergeSections();
    var NL = String.fromCharCode(10);
    var chunks = [];
    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];
      if (i > 0) chunks.push("");
      chunks.push("# --- " + sec.id + ".yaml ---");
      chunks.push(sectionToYaml(sec));
    }
    return chunks.join(NL);
  }

  function render() {
    sections = mergeSections();
    var cats = getOrderedCategories(sections);
    var tabsEl = document.getElementById("category-tabs");
    tabsEl.innerHTML = "";
    for (var ti = 0; ti < cats.length; ti++) {
      var tbtn = document.createElement("button");
      tbtn.type = "button";
      tbtn.setAttribute("role", "tab");
      tbtn.className = "category-tab";
      tbtn.dataset.category = cats[ti];
      tbtn.textContent = cats[ti];
      tbtn.id = "category-tab-" + ti;
      tabsEl.appendChild(tbtn);
    }
    populateCategoryDatalist(cats);

    var savedCat = null;
    try {
      savedCat = sessionStorage.getItem(CATEGORY_KEY);
    } catch (e) {}
    var pick =
      savedCat && cats.indexOf(savedCat) >= 0 ? savedCat : cats.length ? cats[0] : "";

    root.innerHTML = "";
    for (var s = 0; s < sections.length; s++) {
      var sec = sections[s];
      var sectionEl = document.createElement("section");
      sectionEl.className = "card";
      sectionEl.dataset.sectionId = sec.id;
      sectionEl.dataset.category = sec.category || "General";

      var head = document.createElement("div");
      head.className = "section-head";
      var h2 = document.createElement("h2");
      h2.setAttribute("data-name-template", sec.title);
      h2.textContent = applyName(sec.title);
      var addOpt = document.createElement("button");
      addOpt.type = "button";
      addOpt.className = "add-option";
      addOpt.textContent = "+";
      addOpt.title = "Add option";
      addOpt.setAttribute("aria-label", "Add option to this section");
      addOpt.dataset.addOptionFor = sec.id;
      head.appendChild(h2);
      head.appendChild(addOpt);
      sectionEl.appendChild(head);

      if (sec.prompt) {
        var q = document.createElement("p");
        q.className = "question";
        q.setAttribute("data-name-template", sec.prompt);
        q.textContent = applyName(sec.prompt);
        sectionEl.appendChild(q);
      }

      var fs = document.createElement("fieldset");
      fs.className = "options";
      fs.setAttribute("aria-label", applyName(sec.title) + " options");

      for (var o = 0; o < sec.options.length; o++) {
        var opt = sec.options[o];
        var label = document.createElement("label");
        label.className = "opt";
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = opt.id;
        cb.dataset.sectionId = sec.id;
        var span = document.createElement("span");
        span.setAttribute("data-name-template", opt.label);
        span.textContent = applyName(opt.label);
        label.appendChild(cb);
        label.appendChild(span);
        fs.appendChild(label);
      }
      sectionEl.appendChild(fs);

      var outWrap = document.createElement("div");
      outWrap.className = "output-block";
      var outLabel = document.createElement("label");
      outLabel.textContent = "Generated text";
      var pre = document.createElement("pre");
      pre.className = "output";
      pre.id = "out-" + sec.id;
      outWrap.appendChild(outLabel);
      outWrap.appendChild(pre);

      var actions = document.createElement("div");
      actions.className = "actions";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy";
      btn.textContent = "Copy section";
      btn.dataset.copyFor = sec.id;
      actions.appendChild(btn);
      if (!sec.builtIn) {
        var rm = document.createElement("button");
        rm.type = "button";
        rm.className = "danger remove-section";
        rm.textContent = "Remove section";
        rm.dataset.sectionId = sec.id;
        rm.title = "Remove from saved sections in this browser";
        actions.appendChild(rm);
      }
      outWrap.appendChild(actions);
      sectionEl.appendChild(outWrap);

      root.appendChild(sectionEl);
    }

    sections.forEach(function (sec) { updateSection(sec.id); });
    setActiveCategory(pick);
  }

  document.getElementById("category-tabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".category-tab");
    if (!btn || !btn.dataset.category) return;
    setActiveCategory(btn.dataset.category);
  });

  nameInput.addEventListener("input", function () {
    try {
      localStorage.setItem(NAME_KEY, nameInput.value);
    } catch (e) {}
    refreshAllNameDisplays();
  });

  document.getElementById("reset-all-btn").addEventListener("click", function () {
    nameInput.value = "";
    try {
      localStorage.removeItem(NAME_KEY);
    } catch (e) {}
    root.querySelectorAll('input[type="checkbox"][data-section-id]').forEach(function (cb) {
      cb.checked = false;
    });
    refreshAllNameDisplays();
  });

  root.addEventListener("change", function (e) {
    var t = e.target;
    if (t && t.matches && t.matches('input[type="checkbox"][data-section-id]')) {
      updateSection(t.dataset.sectionId);
    }
  });

  root.addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (!t) return;
    if (t.classList.contains("add-option") && t.dataset.addOptionFor) {
      var lab = window.prompt("Label for the new option:");
      if (lab !== null) addOptionToSection(t.dataset.addOptionFor, lab);
      return;
    }
    if (t.classList.contains("copy") && t.dataset.copyFor) {
      var id = t.dataset.copyFor;
      var pre = document.getElementById("out-" + id);
      var text = pre ? pre.textContent : "";
      copyText(t, text);
      return;
    }
    if (t.classList.contains("remove-section") && t.dataset.sectionId) {
      if (confirm("Remove this section from saved sections on this device?")) {
        removeLocalSection(t.dataset.sectionId);
      }
    }
  });

  document.getElementById("add-section-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var title = document.getElementById("as-title").value.trim();
    var stemRaw = document.getElementById("as-stem").value;
    var promptRaw = document.getElementById("as-prompt").value.trim();
    var optsText = document.getElementById("as-options").value;
    var stem = trimStem(stemRaw);
    if (!title || !stem) return;
    var lines = optsText.split(/\\r?\\n/).map(function (line) { return line.trim(); }).filter(Boolean);
    if (lines.length === 0) {
      alert("Add at least one option (one per line).");
      return;
    }
    var options = lines.map(function (label, i) {
      return { id: "opt-" + i, label: label };
    });
    var prompt = promptRaw || stemRaw.trim();
    var catRaw = document.getElementById("as-category").value.trim();
    var category = catRaw || "General";
    var newSec = {
      id: "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9),
      title: title,
      stem: stem,
      prompt: prompt,
      static_text: "",
      options: options,
      order: Date.now(),
      category: category
    };
    var local = loadLocalSections();
    local.push(newSec);
    saveLocalSections(local);
    e.target.reset();
    render();
  });

  document.getElementById("email-dad-btn").addEventListener("click", function () {
    var yaml = buildYamlExport();
    copyText(this, yaml);
  });

  render();
})();
  </script>
</body>
</html>`;
}

async function main() {
  await fs.mkdir(DIST, { recursive: true });
  let names;
  try {
    names = await fs.readdir(SECTIONS_DIR);
  } catch (e) {
    if (e.code === "ENOENT") {
      console.error("Missing folder: sections/");
      process.exit(1);
    }
    throw e;
  }

  const configFiles = names.filter((n) => /\.ya?ml$/i.test(n));

  if (configFiles.length === 0) {
    console.error("No .yaml or .yml files in sections/");
    process.exit(1);
  }

  const sections = [];
  for (const file of configFiles) {
    const raw = await fs.readFile(path.join(SECTIONS_DIR, file), "utf8");
    const data = parseSectionFile(raw);
    sections.push({ ...normalizeSection(data, file), builtIn: true });
  }

  sections.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  const html = buildPage(sections);
  await fs.writeFile(path.join(DIST, "index.html"), html, "utf8");
  await fs.writeFile(path.join(DIST, ".nojekyll"), "", "utf8");
  console.log("Wrote dist/index.html (" + sections.length + " section(s))");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
