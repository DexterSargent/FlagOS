const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");
const { chromium } = require("playwright");
const { createServer } = require("./serve.cjs");
const root = path.resolve(__dirname, "..");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "inventory.js"), "utf8"), context);
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "review-plan.js"), "utf8"), context);
const inventory = context.window.FLAGOS_INVENTORY;
const plan = context.window.FLAGOS_REVIEW_PLAN;
function collect(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? collect(file) : [file.split(path.sep).join("/")];
  });
}
async function main() {
  const pages = collect("src/app").filter((file) => file.endsWith("/page.tsx")).sort();
  assert.deepEqual(Array.from(inventory.routes, (route) => route.file).sort(), pages);
  assert.equal(Object.keys(plan.pages).length, pages.length);
  for (const route of inventory.routes) assert.ok(plan.pages[route.route], `Missing curated scenarios for ${route.route}`);
  const components = collect("src/components").filter((file) => /\.(ts|tsx)$/.test(file) && !/\.(test|spec)\./.test(file)).sort();
  assert.deepEqual(Array.from(inventory.components, (component) => component.path).sort(), components);
  const apis = collect("src/app/api").filter((file) => file.endsWith("/route.ts")).sort();
  assert.deepEqual(Array.from(inventory.apis, (api) => api.path).sort(), apis);
  const allTsx = inventory.sources.filter((file) => file.path.endsWith(".tsx")).map((file) => file.path).sort();
  const reviewedTsx = [...inventory.routes.map((route) => route.file), ...inventory.components.map((file) => file.path), ...inventory.modules.map((file) => file.path)].filter((file) => file.endsWith(".tsx")).sort();
  assert.deepEqual(Array.from(reviewedTsx), Array.from(allTsx), "Every production TSX module must have a review card");
  for (const source of inventory.sources) {
    assert.ok(fs.existsSync(path.join(root, source.path)), source.path);
    for (const control of source.controls) assert.ok(control.line > 0 && control.line <= source.lines);
  }
  for (const [, file] of plan.resources) assert.ok(fs.existsSync(path.join(root, file)), `Missing resource: ${file}`);
  console.log(`Coverage passed: ${pages.length} pages, ${components.length} component files, ${inventory.modules.length} other TSX modules, ${apis.length} API routes.`);
  const server = createServer();
  let browser;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "flagos-review-verify-"));
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const [url, expected] of [
      ["/dexter-site-review/", 200], ["/src/app/page.tsx", 200], ["/.env.local", 403],
      ["/node_modules/stripe/package.json", 403], ["/.git/config", 403],
      ["/dexter-site-review/%2e%2e%5c.env.local", 403],
    ]) assert.equal((await fetch(base + url)).status, expected, url);
    assert.equal((await fetch(base + "/dexter-site-review/", { method: "POST" })).status, 405);
    const foreignHostStatus = await new Promise((resolve, reject) => {
      require("node:http").get(base + "/dexter-site-review/", { headers: { host: "example.com:4317" } }, (response) => {
        response.resume(); resolve(response.statusCode);
      }).on("error", reject);
    });
    assert.equal(foreignHostStatus, 403);
    for (const [, file] of plan.resources) assert.equal((await fetch(base + "/" + file)).status, 200, `Resource served: ${file}`);
    const failures = [];
    for (const options of [{ headless: true }, { headless: true, channel: "msedge" }, { headless: true, channel: "chrome" }]) {
      try { browser = await chromium.launch(options); break; } catch (error) { failures.push(error.message.split("\n")[0]); }
    }
    if (!browser) throw new Error("No available Playwright browser: " + failures.join("; "));
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(base + "/dexter-site-review/");
    await assert.doesNotReject(() => page.getByRole("heading", { name: "Dexter's site review", exact: true }).waitFor());
    assert.equal(await page.locator(".card").count(), inventory.routes.length);
    assert.equal(await page.locator('details[data-id="page:/teams/[id]"] .open-link').count(), 0, "Missing IDs disable links");
    // Fixture URLs and safe origin handling.
    await page.locator("#team-id").fill("team_buf"); await page.locator("#team-id").dispatchEvent("change");
    await page.locator("#league-id").fill("default"); await page.locator("#league-id").dispatchEvent("change");
    await page.locator("#demo").check();
    let team = page.locator('details[data-id="page:/teams/[id]"]');
    await team.locator(":scope > summary").click();
    assert.equal(await team.getByRole("link", { name: "/teams/[id]", exact: true }).getAttribute("href"), "https://flagos.ca/teams/team_buf?demo=true");
    await page.locator("#origin").fill("javascript:alert(1)"); await page.locator("#origin").dispatchEvent("change");
    assert.equal(await page.locator('details[data-id="page:/teams/[id]"] .open-link').count(), 0);
    await page.locator("#origin").fill("http://localhost:3001"); await page.locator("#origin").dispatchEvent("change");
    await page.locator("#match-id").fill("league-match"); await page.locator("#match-id").dispatchEvent("change");
    await page.locator("#team-match-id").fill("team-match"); await page.locator("#team-match-id").dispatchEvent("change");
    assert.equal(await page.locator('details[data-id="page:/teams/[id]/matches/[matchId]/stat-keeper"] .open-link').getAttribute("href"), "http://localhost:3001/teams/team_buf/matches/team-match/stat-keeper?demo=true");
    assert.equal(await page.locator('details[data-id="page:/matches/[id]"] .open-link').getAttribute("href"), "http://localhost:3001/matches/league-match?demo=true");
    assert.equal(await page.locator('details[data-id="page:/join"] .open-link').getAttribute("href"), "http://localhost:3001/join?league=default&demo=true");
    // Choose a short page to fully review.
    const id = "page:/my-story";
    let card = page.locator('details[data-id="page:/my-story"]');
    await card.locator(":scope > summary").click();
    await card.locator("select").first().selectOption("passed");
    assert.equal(await card.locator("select").first().inputValue(), "todo", "Cannot pass without checks");
    for (const section of await card.locator("details").all()) {
      if (await section.locator('input[type="checkbox"]').count()) await section.locator(":scope > summary").click();
    }
    const checks = card.locator('input[type="checkbox"]');
    for (let index = 0; index < await checks.count(); index++) await checks.nth(index).check();
    await card.locator("textarea").fill("Reviewed on laptop and phone. Example evidence only.");
    await card.locator("select").first().selectOption("passed");
    assert.equal(await card.getAttribute("data-status"), "passed");
    const passedState = await page.evaluate(() => JSON.parse(localStorage.getItem("flagos.dexter-site-review.v1")));
    await page.reload();
    card = page.locator('details[data-id="page:/my-story"]');
    await card.locator(":scope > summary").click();
    assert.equal(await card.getAttribute("data-status"), "passed");
    assert.match(await card.locator("textarea").inputValue(), /Example evidence/);
    await card.locator('input[type="checkbox"]').first().uncheck();
    assert.equal(await card.getAttribute("data-status"), "reviewing");
    await card.locator("select").first().selectOption("issue");
    await card.locator("select").last().selectOption("blocker");
    // Export and inspect actual downloads.
    let downloadPromise = page.waitForEvent("download");
    await page.locator("#export-json").click();
    let download = await downloadPromise;
    const backupPath = path.join(temp, "backup.json");
    await download.saveAs(backupPath);
    const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
    assert.equal(backup.entries[id].status, "issue");
    assert.equal(backup.entries[id].priority, "blocker");
    assert.equal(backup.settings.teamId, "team_buf");
    downloadPromise = page.waitForEvent("download");
    await page.locator("#export-report").click();
    download = await downloadPromise;
    const reportPath = path.join(temp, "report.md");
    await download.saveAs(reportPath);
    const report = fs.readFileSync(reportPath, "utf8");
    assert.ok(report.includes("Example evidence only."));
    assert.ok(report.includes("page:/admin/sandbox"), "Full report includes entries outside the visible view");
    // Invalid import must preserve current state.
    await page.locator("#import-file").setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from('{"version":999}') });
    await page.getByRole("status").filter({ hasText: "Import failed" }).waitFor();
    assert.equal(await card.getAttribute("data-status"), "issue");
    // Import a valid backup with markup-like notes; render strictly as text.
    backup.entries[id].notes = '<img src=x onerror="alert(1)"> imported safely';
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#import-file").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
    await page.getByRole("status").filter({ hasText: "Backup restored" }).waitFor();
    card = page.locator('details[data-id="page:/my-story"]');
    if (!await card.evaluate((element) => element.open)) await card.locator(":scope > summary").click();
    assert.match(await card.locator("textarea").inputValue(), /imported safely/);
    assert.equal(await page.locator("img").count(), 0);
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.locator("#import-file").setInputFiles(backupPath);
    await page.waitForTimeout(150);
    assert.match(await card.locator("textarea").inputValue(), /imported safely/, "Cancelled import preserves notes");
    await page.locator("#search").fill("imported safely");
    await page.waitForTimeout(250);
    assert.equal(await page.locator(".card").count(), 1, "Search includes notes");
    await page.locator("#clear-filters").click();
    await page.locator("#status").selectOption("issue");
    assert.equal(await page.locator(".card").count(), 1);
    await page.locator("#clear-filters").click();
    await page.getByRole("button", { name: "Journeys & launch gates", exact: true }).click();
    assert.equal(await page.locator(".card").count(), plan.journeys.length);
    await page.getByRole("button", { name: "Components & layouts", exact: true }).click();
    assert.equal(await page.locator(".card").count(), inventory.components.length + inventory.modules.length);
    await page.getByRole("button", { name: "API checklist", exact: true }).click();
    assert.equal(await page.locator(".card").count(), inventory.apis.length);
    assert.equal(await page.locator(".open-link").count(), 0, "API checklist has no execute/browse links");
    await page.getByRole("button", { name: "Source atlas", exact: true }).click();
    await page.locator("#search").fill("TeamDepthCharts");
    await page.waitForTimeout(250);
    assert.ok(await page.locator(".atlas-entry").count() >= 2);
    await page.locator("#clear-filters").click();
    await page.getByRole("button", { name: "Resources", exact: true }).click();
    assert.equal(await page.locator(".atlas-entry").count(), plan.resources.length);
    await page.getByRole("button", { name: "Pages", exact: true }).click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(temp, "desktop.png"), fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('details[data-id="page:/pricing"] > summary').click();
    await page.locator('details[data-id="page:/pricing"] > summary').scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No horizontal overflow at phone size");
    await page.screenshot({ path: path.join(temp, "phone.png"), fullPage: false });
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.locator(".tools").isVisible(), false);
    await page.emulateMedia({ media: "screen" });
    // A changed source fingerprint must not become a pass just by editing notes.
    passedState.entries[id].signature = "previous-source";
    await page.evaluate((state) => localStorage.setItem("flagos.dexter-site-review.v1", JSON.stringify(state)), passedState);
    await page.reload();
    card = page.locator('details[data-id="page:/my-story"]');
    await card.locator(":scope > summary").click();
    assert.equal(await page.locator("#pass-count").textContent(), "0");
    await card.locator("textarea").fill("Recheck still required after editing notes.");
    await page.reload();
    assert.equal(await page.locator("#pass-count").textContent(), "0");
    assert.equal(await page.locator('details[data-id="page:/my-story"] > summary .badge').textContent(), "Re-review changes");
    // An impossible current pass cannot be imported.
    const currentState = JSON.parse(fs.readFileSync(backupPath, "utf8"));
    currentState.entries[id].status = "passed";
    currentState.entries[id].checks = {};
    await page.locator("#import-file").setInputFiles({ name: "invalid-pass.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(currentState)) });
    await page.getByRole("status").filter({ hasText: "incomplete current checklist" }).waitFor();
    page.once("dialog", (dialog) => dialog.accept("not-reset"));
    await page.locator("#reset").click();
    assert.equal(await page.locator('details[data-id="page:/my-story"] > summary .badge').textContent(), "Re-review changes");
    page.once("dialog", (dialog) => dialog.accept("RESET"));
    await page.locator("#reset").click();
    assert.equal(await page.locator("#progress-count").textContent(), `0 / ${inventory.routes.length + inventory.components.length + inventory.modules.length + inventory.apis.length + plan.journeys.length}`);
    assert.equal(await page.locator("#team-id").inputValue(), "team_buf", "Reset preserves settings");
    assert.deepEqual(errors, [], "No browser JavaScript errors");
    console.log("Browser checks passed: fixtures, safe URLs, required checks, persistence, verdicts, filters, notes, JSON/report downloads, import validation, text safety, component/API coverage, mobile layout and print.");
    if (process.env.REVIEW_SCREENSHOTS) {
      const dest = path.resolve(process.env.REVIEW_SCREENSHOTS);
      fs.mkdirSync(dest, { recursive: true });
      for (const name of ["desktop.png", "phone.png"]) fs.copyFileSync(path.join(temp, name), path.join(dest, name));
      console.log("Screenshots saved to " + dest);
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
    for (const name of ["backup.json", "report.md", "desktop.png", "phone.png"]) {
      const file = path.join(temp, name);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    fs.rmdirSync(temp);
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
