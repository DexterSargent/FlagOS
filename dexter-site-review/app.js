(() => {
  "use strict";
  const inventory = window.FLAGOS_INVENTORY;
  const plan = window.FLAGOS_REVIEW_PLAN;
  const KEY = "flagos.dexter-site-review.v1";
  const verdicts = { todo: "Not reviewed", reviewing: "In review", passed: "Passed", issue: "Needs fixes", blocked: "Blocked", na: "Not applicable" };
  const $ = (id) => document.getElementById(id);
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const hash = (text) => {
    let result = 2166136261;
    for (const char of text) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
    return (result >>> 0).toString(36);
  };
  const sources = new Map(inventory.sources.map((source) => [source.path, source]));
  const pageMap = new Map(inventory.routes.map((route) => [route.route, route]));
  const basicChecks = [
    "Inspect every visible control, tab, dialog and conditional branch; check copy matches current behavior.",
    "Test loading, empty, error/denied and populated states; retry and refresh without lost or misleading data.",
    "Keyboard: labels, focus order, visible focus, Escape/back and focus return; inspect at 200% zoom.",
    "Check permissions using the listed roles and direct URLs, not just visibility of buttons.",
    "Light / laptop (1366 x 768): readable text, forms, focus, dropdowns and unclipped dialogs.",
    "Dark / laptop (1366 x 768): readable text, forms, focus, dropdowns and unclipped dialogs.",
    "Light / phone (390 x 844): navigation, touch targets, keyboard entry, scrolling and no accidental overflow.",
    "Dark / phone (390 x 844): contrast, modals, tooltips and Guide spotlight fit the viewport.",
    "Guide: step through all currently available targets, including controls revealed by a dialog/tab."
  ];
  function checks(texts) {
    return texts.map((text) => ({ id: hash(text), text }));
  }
  function makeItem(values, extraChecks = []) {
    const source = sources.get(values.file);
    const controls = source?.controls || [];
    return {
      ...values,
      checks: checks([...extraChecks, ...basicChecks]),
      controls,
      signature: hash(JSON.stringify([source?.fingerprint, values.routeData?.allClosure.map((file) => sources.get(file)?.fingerprint), controls, extraChecks, basicChecks])),
    };
  }
  const items = [];
  for (const route of inventory.routes) {
    const definition = plan.pages[route.route] || [route.route, "Unclassified", ["Visitor"], ["Review newly discovered route and add a specific review plan."]];
    items.push(makeItem({
      id: route.id, kind: "pages", title: definition[0], group: definition[1], roles: definition[2],
      file: route.file, route: route.route, pages: [route.route], routeData: route,
    }, definition[3]));
  }
  for (const component of [...inventory.components, ...inventory.modules]) {
    const parentPages = component.pages || [];
    const allPages = [...new Set([...parentPages, ...(component.shellPages || [])])];
    const groups = [...new Set(allPages.map((route) => plan.pages[route]?.[1]).filter(Boolean))];
    const roles = [...new Set(allPages.flatMap((route) => plan.pages[route]?.[2] || []))];
    items.push(makeItem({
      id: component.id, kind: "components", title: component.path.split("/").pop().replace(/\.(tsx|ts)$/, ""),
      file: component.path, group: groups.length === 1 ? groups[0] : "Shared experience",
      roles: roles.length ? roles : ["Developer"], pages: allPages, directPages: parentPages,
      shellPages: component.shellPages || [], symbols: component.symbols,
    }, [
      allPages.length ? "Open a linked parent screen, then trigger this component's tab, dialog or state. Import reachability is not proof it renders there."
        : "No page import path was found: verify whether this module is active, obsolete, or loaded by a mechanism the static inventory cannot resolve. Record the result.",
      "Inspect the named exports and inline subcomponents in this file; exercise all visible controls, not just tour-marked ones."
    ]));
  }
  for (const api of inventory.apis) {
    items.push({
      id: api.id, kind: "apis", title: api.route, group: api.route.includes("billing") || api.route.includes("stripe") ? "Release gates" : "Backend checks",
      roles: ["Developer", "Platform admin"], file: api.path, pages: [], methods: api.methods,
      controls: [], signature: hash(JSON.stringify([api.path, api.methods, api.fingerprint])),
      checks: checks([
        `Inspect the ${api.methods.join(", ") || "declared"} handler and the calling app flow. Do not navigate to or invoke mutating endpoints casually.`,
        "In isolated data: verify a valid authorized request, invalid/missing input and missing/expired authorization.",
        "Check wrong-entity/role access, duplicate/retried requests, rate limits where implemented and explicit failures.",
        api.route.includes("webhooks") ? "Verify authentic signed delivery, invalid signatures and duplicate/retried events. Never use real payments or send production test emails."
          : api.route.includes("cron") ? "Verify job authorization, throttling, retry behavior and scheduler configuration. Do not run production jobs from this checklist."
          : "Trace the visible page result back to the saved data; distinguish a successful API response from complete fulfillment.",
        "Record concrete request/test evidence and any deployment prerequisite; no credentials in notes."
      ])
    });
  }
  for (const [id, title, group, roles, scenarios, pages] of plan.journeys) {
    items.push({ id: `journey:${id}`, title, group, roles, pages, kind: "journeys", controls: [], checks: checks(scenarios), signature: hash(JSON.stringify(scenarios)) });
  }
  const itemMap = new Map(items.map((item) => [item.id, item]));
  let state = { version: 1, settings: { origin: "https://flagos.ca", leagueId: "default", teamId: "", matchId: "", teamMatchId: "", reviewer: "", demo: false }, entries: {} };
  let view = "pages";
  const openItems = new Set();
  function tell(text, error = false) {
    $("message").textContent = text;
    $("message").classList.toggle("error", error);
    $("message").hidden = false;
  }
  function storageFailure() {
    $("storage-warning").hidden = false;
    $("storage-warning").textContent = "Browser storage is unavailable or full. Your changes are only in memory. Export a backup now; use the local server for a stable origin.";
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { storageFailure(); }
  }
  function record(item) {
    return state.entries[item.id] || { status: "todo", checks: {}, controls: {}, notes: "", priority: "normal", evidence: "", updatedAt: "" };
  }
  function update(item, changes) {
    state.entries[item.id] = { ...record(item), ...changes,
      ...(changes.status ? { signature: item.signature } : {}),
      updatedAt: new Date().toISOString() };
    save();
    updateMetrics();
  }
  function normalize(input) {
    if (!input || input.version !== 1 || !input.settings || !input.entries || typeof input.entries !== "object" || Array.isArray(input.entries)) throw new Error("Not a supported FlagOS review backup (version 1).");
    const settings = { ...state.settings };
    for (const key of ["origin", "leagueId", "teamId", "matchId", "teamMatchId", "reviewer"]) {
      if (typeof input.settings[key] === "string" && input.settings[key].length <= 2000) settings[key] = input.settings[key];
    }
    settings.demo = input.settings.demo === true;
    const entries = {};
    for (const item of items) {
      if (!Object.hasOwn(input.entries, item.id)) continue;
      const entry = input.entries[item.id];
      if (!entry || typeof entry !== "object" || !Object.hasOwn(verdicts, entry.status)) throw new Error("Backup contains an invalid review entry.");
      const clean = { status: entry.status, checks: {}, controls: {}, notes: "", evidence: "", priority: "normal", signature: "", updatedAt: "" };
      for (const key of ["notes", "evidence", "signature", "updatedAt"]) {
        if (typeof entry[key] === "string" && entry[key].length <= 100000) clean[key] = entry[key];
      }
      if (["normal", "low", "high", "blocker"].includes(entry.priority)) clean.priority = entry.priority;
      for (const check of item.checks) clean.checks[check.id] = entry.checks?.[check.id] === true;
      for (const control of item.controls) clean.controls[control.name] = entry.controls?.[control.name] === true;
      if (clean.status === "passed" && clean.signature === item.signature &&
        (!item.checks.every((check) => clean.checks[check.id]) || !item.controls.every((control) => clean.controls[control.name]))) {
        throw new Error("Backup marks an incomplete current checklist as passed.");
      }
      if (["issue", "blocked", "na"].includes(clean.status) && !clean.notes.trim()) throw new Error("Backup contains a verdict without required notes.");
      entries[item.id] = clean;
    }
    return { version: 1, settings, entries };
  }
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) state = normalize(JSON.parse(stored));
  } catch (error) {
    storageFailure();
    tell(`Saved review could not be loaded: ${error.message}. Existing browser data has not been overwritten.`, true);
  }
  function isStale(item) {
    const entry = record(item);
    return entry.status !== "todo" && entry.signature !== item.signature;
  }
  function completed(item) {
    const entry = record(item);
    return item.checks.every((check) => entry.checks[check.id]) && item.controls.every((control) => entry.controls[control.name]);
  }
  function fileLinks(file, line) {
    const wrapper = node("span");
    const relative = "../" + file.split("/").map(encodeURIComponent).join("/");
    const link = node("a", file + (line ? `:${line}` : ""));
    link.href = relative; link.target = "_blank"; link.rel = "noopener noreferrer";
    const vscode = node("a", "VS Code");
    vscode.href = "vscode://file/" + inventory.root.split("/").map(encodeURIComponent).join("/") + "/" + file.split("/").map(encodeURIComponent).join("/") + (line ? `:${line}` : "");
    wrapper.append(link, document.createTextNode(" · "), vscode);
    return wrapper;
  }
  function targetUrl(route) {
    let value = route;
    const replacements = route.startsWith("/teams/") ? { id: state.settings.teamId, matchId: state.settings.teamMatchId }
      : route.startsWith("/matches/") ? { id: state.settings.matchId }
      : { id: state.settings.leagueId };
    value = value.replace(/\[([^\]]+)\]/g, (_, key) => replacements[key] ? encodeURIComponent(replacements[key]) : `[${key}]`);
    if (value.includes("[")) return null;
    let base;
    try {
      base = new URL(state.settings.origin);
      if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.pathname !== "/" || base.search || base.hash) return null;
    } catch { return null; }
    const url = new URL(value, base.origin);
    if (route === "/join" && state.settings.leagueId) url.searchParams.set("league", state.settings.leagueId);
    if (state.settings.demo) url.searchParams.set("demo", "true");
    return url.href;
  }
  function pageLink(route) {
    const url = targetUrl(route);
    if (!url) return node("span", `${route} — set valid origin / required IDs above`, "disabled-link");
    const link = node("a", route);
    link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.className = "open-link";
    return link;
  }
  function updateMetrics() {
    const counts = { passed: 0, issue: 0, blocked: 0, na: 0 };
    let checked = 0, totalChecks = 0;
    for (const item of items) {
      const entry = record(item);
      if (Object.hasOwn(counts, entry.status) && !(entry.status === "passed" && isStale(item))) counts[entry.status]++;
      checked += item.checks.filter((check) => entry.checks[check.id]).length + item.controls.filter((control) => entry.controls[control.name]).length;
      totalChecks += item.checks.length + item.controls.length;
    }
    const reviewed = counts.passed + counts.issue + counts.na;
    $("progress-count").textContent = `${reviewed} / ${items.length}`;
    $("pass-count").textContent = counts.passed;
    $("issue-count").textContent = counts.issue;
    $("blocked-count").textContent = `${counts.blocked} / ${counts.na}`;
    $("check-count").textContent = `${checked} / ${totalChecks}`;
    $("progress").value = reviewed / items.length * 100;
  }
  function relatedTests(file) {
    return inventory.tests.filter((test) => test.imports.includes(file));
  }
  function sourceSection(item) {
    const details = node("details", undefined, "nested");
    details.append(node("summary", "Edit map, dependencies & test evidence"));
    if (item.file) {
      const primary = node("p", "Primary edit surface: ");
      primary.append(fileLinks(item.file)); details.append(primary);
    }
    if (item.symbols?.length) details.append(node("p", "Named components in this file: " + item.symbols.map((symbol) => `${symbol.name} (line ${symbol.line})`).join(", "), "muted"));
    if (item.routeData) {
      details.append(node("p", "Page-specific reachable components (including dynamic imports and conditional branches):", "source-caption"));
      const list = node("ul", undefined, "source-list");
      const componentFiles = [...inventory.components, ...inventory.modules].filter((component) => item.routeData.directClosure.includes(component.path));
      for (const component of componentFiles) { const li = node("li"); li.append(fileLinks(component.path)); list.append(li); }
      details.append(list);
      const shell = node("p", "Layouts wrap this route; their imports may render conditionally: ");
      for (const layout of item.routeData.layouts) { shell.append(fileLinks(layout), document.createTextNode(" ")); }
      details.append(shell);
      const services = node("details", undefined, "nested");
      services.append(node("summary", "Related libraries, guides & data helpers"));
      const ul = node("ul", undefined, "source-list");
      for (const file of item.routeData.directClosure.filter((file) => file.startsWith("src/lib/"))) {
        const li = node("li"); li.append(fileLinks(file)); ul.append(li);
      }
      services.append(ul); details.append(services);
    } else if (item.file) {
      const ul = node("ul", undefined, "source-list");
      for (const file of sources.get(item.file)?.imports || []) { const li = node("li"); li.append(fileLinks(file)); ul.append(li); }
      details.append(node("p", "Direct local imports:", "source-caption"), ul);
    }
    const tests = item.file ? relatedTests(item.file) : [];
    details.append(node("p", "Tests directly importing this file (not a claim of complete coverage):", "source-caption"));
    if (!tests.length) details.append(node("p", "No direct-import test found. Search the Source atlas for related tests/helpers; manual verification is still required.", "muted"));
    const ul = node("ul", undefined, "source-list");
    for (const test of tests) { const li = node("li"); li.append(fileLinks(test.path)); ul.append(li); }
    details.append(ul);
    return details;
  }
  function card(item) {
    const entry = record(item);
    const details = node("details", undefined, "card");
    details.dataset.id = item.id; details.dataset.status = entry.status; details.open = openItems.has(item.id);
    details.addEventListener("toggle", () => {
      if (details.isConnected) details.open ? openItems.add(item.id) : openItems.delete(item.id);
    });
    const summary = node("summary");
    const title = node("span", undefined, "card-title");
    title.append(node("strong", item.title), node("small", item.route || item.file || item.group));
    const badge = node("span", isStale(item) ? "Re-review changes" : verdicts[entry.status], `badge ${entry.status}`);
    summary.append(title, badge); details.append(summary);
    const body = node("div", undefined, "card-body");
    const meta = node("div", undefined, "card-meta");
    meta.append(node("span", item.group, "badge"));
    item.roles.forEach((role) => meta.append(node("span", role, "badge")));
    if (item.methods) meta.append(node("span", item.methods.join(" / "), "badge"));
    body.append(meta);
    const links = node("div", undefined, "links");
    item.pages.forEach((route) => links.append(pageLink(route)));
    body.append(links);
    if (item.kind === "components") body.append(node("p", "Parent links are static import reachability, not guaranteed visibility. Shell components follow route/role conditions. Open the parent, then reveal the relevant state.", "muted"));
    if (isStale(item)) body.append(node("p", "Inventory/checklist changed since this verdict. Recheck it before relying on the result; passed count excludes stale passes.", "danger-text"));
    body.append(node("h3", "Review checks"));
    const checkList = node("div", undefined, "checks");
    function checkbox(text, checked, onChange) {
      const label = node("label", undefined, "check");
      const input = node("input"); input.type = "checkbox"; input.checked = checked;
      input.addEventListener("change", () => {
        onChange(input.checked);
        if (!input.checked && record(item).status === "passed") {
          update(item, { status: "reviewing" }); status.value = "reviewing";
          details.dataset.status = "reviewing"; badge.textContent = verdicts.reviewing; badge.className = "badge reviewing";
        }
        const done = item.checks.filter((check) => record(item).checks[check.id]).length;
        count.textContent = `${done}/${item.checks.length} scenario checks`;
      });
      label.append(input, node("span", text)); return label;
    }
    const count = node("p", `${item.checks.filter((check) => entry.checks[check.id]).length}/${item.checks.length} scenario checks`, "muted");
    body.append(count);
    for (const check of item.checks) {
      checkList.append(checkbox(check.text, !!entry.checks[check.id], (checked) => update(item, { checks: { ...record(item).checks, [check.id]: checked } })));
    }
    body.append(checkList);
    if (item.controls.length) {
      const controls = node("details", undefined, "nested");
      controls.append(node("summary", `Control/component spot-checks (${item.controls.length} source tour targets)`));
      controls.append(node("p", "Open the matching tab/dialog first. Dynamic targets need every rendered instance checked. Mark N/A with a reason if this entire module is unused; individual role-only controls should be inspected under that role.", "muted"));
      const list = node("div", undefined, "checks");
      for (const control of item.controls) {
        const label = checkbox(`Inspect ${control.name}${control.dynamic ? " (dynamic target)" : ""}`, !!entry.controls[control.name], (checked) => update(item, { controls: { ...record(item).controls, [control.name]: checked } }));
        label.append(fileLinks(item.file, control.line)); list.append(label);
      }
      controls.append(list); body.append(controls);
    }
    body.append(sourceSection(item));
    const notesLabel = node("label", "Review notes / issues / reason if blocked or N/A");
    const notes = node("textarea"); notes.value = entry.notes;
    notes.placeholder = "What happened? Expected vs actual? Role, URL, viewport, theme, screenshot location, reproduction steps...";
    const printNotes = node("p", entry.notes, "print-notes"); printNotes.hidden = true;
    notes.addEventListener("input", () => { update(item, { notes: notes.value }); printNotes.textContent = notes.value; });
    notesLabel.append(notes); body.append(notesLabel);
    const row = node("div", undefined, "verdict-row");
    const statusLabel = node("label", "Verdict");
    const status = node("select"); status.setAttribute("aria-label", `Verdict: ${item.title}`);
    for (const [value, label] of Object.entries(verdicts)) { const option = node("option", label); option.value = value; status.append(option); }
    status.value = entry.status;
    status.addEventListener("change", () => {
      if (status.value === "passed" && !completed(item)) {
        tell("Complete all scenario and control checks before marking Passed. Use Blocked or Not applicable with a reason instead.", true);
        status.value = record(item).status; return;
      }
      if (["blocked", "na", "issue"].includes(status.value) && !record(item).notes.trim()) {
        tell("Add notes describing the issue, blocker or N/A reason first.", true);
        status.value = record(item).status; notes.focus(); return;
      }
      update(item, { status: status.value });
      details.dataset.status = status.value;
      badge.textContent = verdicts[status.value]; badge.className = `badge ${status.value}`;
    });
    statusLabel.append(status);
    const priorityLabel = node("label", "Issue priority");
    const priority = node("select");
    for (const [value, text] of [["normal", "Normal"], ["low", "Low"], ["high", "High"], ["blocker", "Launch blocker"]]) {
      const option = node("option", text); option.value = value; priority.append(option);
    }
    priority.value = entry.priority;
    priority.addEventListener("change", () => update(item, { priority: priority.value }));
    priorityLabel.append(priority); row.append(statusLabel, priorityLabel); body.append(row);
    const evidenceLabel = node("label", "Evidence / tested roles, browser, date, screenshot or issue reference");
    const evidence = node("input"); evidence.value = entry.evidence; evidence.placeholder = "Chrome / Coach / phone dark / screenshot filename";
    evidence.addEventListener("input", () => update(item, { evidence: evidence.value }));
    evidenceLabel.append(evidence); body.append(evidenceLabel);
    details.append(body); return details;
  }
  const viewTitles = { pages: "Page checklist", components: "Components, inline views & layouts", journeys: "Cross-page journeys & release gates", apis: "Backend/API verification checklist", atlas: "Source atlas", resources: "Resources & reviewer tools" };
  function matches(item) {
    const search = $("search").value.trim().toLowerCase();
    const entry = record(item);
    return (!$("group").value || item.group === $("group").value) &&
      (!$("role").value || item.roles.includes($("role").value)) &&
      (!$("status").value || entry.status === $("status").value) &&
      (!search || JSON.stringify([item, entry.notes, entry.evidence]).toLowerCase().includes(search));
  }
  function render() {
    document.querySelectorAll(".card").forEach((element) => {
      if (element.open) openItems.add(element.dataset.id);
      else openItems.delete(element.dataset.id);
    });
    $("view-title").textContent = viewTitles[view];
    $("view-help").textContent = view === "atlas" ? "Search every inventoried source/test file. File links open the source; VS Code links open your local editor. No line number is inferred for a whole file."
      : view === "apis" ? "Developer-assisted checks. These entries deliberately have no Run or endpoint-launch button. Test mutations only in isolated data."
      : view === "resources" ? "Existing runbooks and local tools. Read their safety instructions before running commands."
      : "No bulk-pass button: check each scenario and source control, record evidence, then choose a verdict. A pass requires every check. Blocked is not counted as reviewed.";
    $("results").replaceChildren();
    if (view === "atlas" || view === "resources") {
      const grid = node("div", undefined, "atlas-grid");
      const query = $("search").value.toLowerCase();
      const rows = view === "atlas" ? [...inventory.sources.map((source) => [source.path.split("/").pop(), source.path, `${source.lines} lines; ${source.controls.length} tour targets; ${source.symbols.map((symbol) => symbol.name).join(", ")}`]),
        ...inventory.tests.map((test) => [test.path.split("/").pop(), test.path, "Automated test file; direct imports: " + test.imports.join(", ")])]
        : plan.resources;
      for (const [title, file, description] of rows.filter((row) => row.join(" ").toLowerCase().includes(query))) {
        const entry = node("article", undefined, "atlas-entry");
        entry.append(node("h3", title), node("p", description), fileLinks(file));
        const parents = inventory.routes.filter((route) => route.allClosure.includes(file));
        if (parents.length) entry.append(node("p", "Potential parent routes: " + parents.map((route) => route.route).join(", "), "muted"));
        grid.append(entry);
      }
      $("results").append(grid);
      $("result-count").textContent = `${grid.childElementCount} files / resources`;
      for (const id of ["group", "role", "status"]) $(id).disabled = true;
      return;
    }
    for (const id of ["group", "role", "status"]) $(id).disabled = false;
    const visible = items.filter((item) => item.kind === view && matches(item));
    $("result-count").textContent = `${visible.length} / ${items.filter((item) => item.kind === view).length} entries`;
    if (!visible.length) $("results").append(node("p", "No entries match. Clear filters or choose another view.", "empty"));
    const groups = [...new Set(visible.map((item) => item.group))];
    for (const group of groups) {
      const section = node("section", undefined, "section-list");
      section.append(node("h3", `${group} (${visible.filter((item) => item.group === group).length})`));
      for (const item of visible.filter((item) => item.group === group)) section.append(card(item));
      $("results").append(section);
    }
  }
  const settingFields = { origin: "origin", "league-id": "leagueId", "team-id": "teamId", "match-id": "matchId", "team-match-id": "teamMatchId", reviewer: "reviewer", demo: "demo" };
  function syncSettings() {
    for (const [id, key] of Object.entries(settingFields)) {
      if (id === "demo") $(id).checked = state.settings[key];
      else $(id).value = state.settings[key];
    }
  }
  for (const [id, key] of Object.entries(settingFields)) $(id).addEventListener("change", () => {
    state.settings[key] = id === "demo" ? $(id).checked : $(id).value.trim(); save();
    document.querySelectorAll(".card").forEach((element) => {
      const item = itemMap.get(element.dataset.id);
      element.querySelector(".links").replaceChildren(...item.pages.map(pageLink));
    });
  });
  syncSettings();
  for (const group of [...new Set(items.map((item) => item.group))].sort()) { const option = node("option", group); option.value = group; $("group").append(option); }
  for (const role of [...new Set(items.flatMap((item) => item.roles))].sort()) { const option = node("option", role); option.value = role; $("role").append(option); }
  $("views").addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (!button) return;
    view = button.dataset.view;
    $("views").querySelectorAll("button").forEach((element) => element.setAttribute("aria-pressed", String(element === button)));
    render();
  });
  let searchTimer;
  $("search").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(render, 150); });
  for (const id of ["group", "role", "status"]) $(id).addEventListener("change", render);
  $("clear-filters").addEventListener("click", () => { for (const id of ["search", "group", "role", "status"]) $(id).value = ""; render(); });
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const anchor = node("a"); anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const date = () => new Date().toISOString().replace(/[:.]/g, "-");
  $("export-json").addEventListener("click", () => {
    download(`flagos-review-${date()}.json`, JSON.stringify({ ...state, exportedAt: new Date().toISOString(), inventoryRevision: inventory.revision, inventoryGeneratedAt: inventory.generatedAt }, null, 2), "application/json");
    tell("Backup exported. Keep it private; it contains your notes and fixture IDs.");
  });
  $("export-report").addEventListener("click", () => {
    const lines = ["# Dexter's FlagOS site review", "", `Exported: ${new Date().toISOString()}`, `Reviewer: ${state.settings.reviewer || "Not specified"}`,
      `Target: ${state.settings.origin}`, `Inventory: ${inventory.revision} / ${inventory.generatedAt}`, "", "This is personal review evidence, not automated production approval.", ""];
    for (const item of items) {
      const entry = record(item);
      lines.push(`## ${verdicts[entry.status]}: ${item.title}`, `ID: ${item.id}`, `Group: ${item.group}; priority: ${entry.priority}`,
        `Source: ${item.file || "Cross-page journey"}`, `Updated: ${entry.updatedAt || "Never"}`, `Needs re-review: ${isStale(item) ? "Yes" : "No"}`, "");
      for (const check of item.checks) lines.push(`- [${entry.checks[check.id] ? "x" : " "}] ${check.text}`);
      for (const control of item.controls) lines.push(`- [${entry.controls[control.name] ? "x" : " "}] Control: ${control.name} (${item.file}:${control.line})`);
      lines.push("", "Notes:", entry.notes || "(none)", "", "Evidence:", entry.evidence || "(none)", "");
    }
    download(`flagos-review-${date()}.md`, lines.join("\n"), "text/markdown");
    tell("Full report exported, including unreviewed items. Export backup too if you need to restore progress.");
  });
  $("import-file").addEventListener("change", async () => {
    const file = $("import-file").files[0];
    if (!file) return;
    try {
      if (file.size > 10000000) throw new Error("Backup exceeds 10 MB.");
      const replacement = normalize(JSON.parse(await file.text()));
      if (!window.confirm("Replace this browser's review progress and target settings with this backup? Export your current backup first. No app data will change.")) return;
      state = replacement; syncSettings(); save(); updateMetrics(); render();
      tell("Backup restored. Unknown/removed inventory entries were ignored; source changes may require re-review.");
    } catch (error) { tell(`Import failed; current review preserved. ${error.message}`, true); }
    finally { $("import-file").value = ""; }
  });
  $("import-backup").addEventListener("click", () => $("import-file").click());
  $("reset").addEventListener("click", () => {
    if (window.prompt('This clears only this local checklist. Export first. Type RESET to continue:') !== "RESET") return;
    state.entries = {}; save(); updateMetrics(); render(); tell("Local review progress reset; target settings preserved.");
  });
  $("print").addEventListener("click", () => {
    document.querySelectorAll(".card").forEach((element) => { element.open = true; });
    tell("Print includes the current filtered view only. Export report for the full checklist and evidence.");
    window.print();
  });
  $("snapshot").textContent = `Source snapshot: ${inventory.revision} · generated ${new Date(inventory.generatedAt).toLocaleString()} · ${inventory.routes.length} pages · ${inventory.components.length} component files · ${inventory.modules.length} layouts/inline UI modules · ${inventory.apis.length} API routes. Refresh inventory after code changes.`;
  updateMetrics(); render();
})();
