#!/usr/bin/env node
// Usage: node dexter-site-review/handoff/merge-reviews.cjs out.json base.json lane1.json lane2.json ...
// Checks are OR-ed; the most severe verdict wins; notes/evidence from every lane are kept.
const fs = require("fs");
const [out, ...inputs] = process.argv.slice(2);
if (!out || inputs.length < 1) { console.error("Usage: merge-reviews.cjs <out.json> <backup.json>..."); process.exit(1); }
const rank = { todo: 0, na: 1, passed: 2, reviewing: 3, blocked: 4, issue: 5 };
const prio = { low: 0, normal: 1, high: 2, blocker: 3 };
const merged = { version: 1, settings: null, entries: {} };
for (const file of inputs) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (data.version !== 1 || !data.entries) throw new Error(`${file} is not a version 1 review backup`);
  merged.settings = merged.settings || data.settings;
  const lane = require("path").basename(file, ".json");
  for (const [id, e] of Object.entries(data.entries)) {
    const m = merged.entries[id];
    if (!m) { merged.entries[id] = JSON.parse(JSON.stringify(e)); continue; }
    for (const k of ["checks", "controls"]) for (const [c, v] of Object.entries(e[k] || {})) m[k][c] = m[k][c] === true || v === true;
    for (const k of ["notes", "evidence"]) if (e[k] && !(m[k] || "").includes(e[k])) m[k] = m[k] ? `${m[k]}\n\n[${lane}] ${e[k]}` : e[k];
    if ((rank[e.status] ?? 0) > (rank[m.status] ?? 0)) m.status = e.status;
    if ((prio[e.priority] ?? 1) > (prio[m.priority] ?? 1)) m.priority = e.priority;
    if ((e.updatedAt || "") > (m.updatedAt || "")) { m.updatedAt = e.updatedAt; m.signature = e.signature || m.signature; }
  }
}
// "passed" is only valid when every recorded check is ticked; otherwise fall back to reviewing.
for (const e of Object.values(merged.entries)) {
  if (e.status === "passed" && [...Object.values(e.checks || {}), ...Object.values(e.controls || {})].some((v) => v !== true)) e.status = "reviewing";
}
fs.writeFileSync(out, JSON.stringify(merged, null, 2));
const all = Object.values(merged.entries);
const ticked = all.reduce((n, e) => n + [...Object.values(e.checks || {}), ...Object.values(e.controls || {})].filter(Boolean).length, 0);
const count = (s) => all.filter((e) => e.status === s).length;
console.log(`Merged ${inputs.length} file(s) -> ${out}: ${all.length} entries, ${ticked} checks ticked, ${count("passed")} passed, ${count("issue")} issue, ${count("blocked")} blocked`);
