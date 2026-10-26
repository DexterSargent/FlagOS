#!/usr/bin/env node
// Runs axe-core colour-contrast checks on public pages in light and dark mode.
// Usage: node scripts/contrast-audit.mjs [baseUrl] (default http://localhost:3000)
// Extra paths can be passed with CONTRAST_PATHS="/a,/b". Exits 1 when any violation is found.
// CONTRAST_INTERACTIVE=1 also checks demo settings, forms and their guides without saving changes.
// CONTRAST_SCREENSHOTS=<directory> saves interactive screenshots for visual review.
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const axeSource = require("fs").readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const baseUrl = (process.argv[2] || process.env.CONTRAST_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const defaultPaths = [
  "/",
  "/leagues",
  "/free-agents",
  "/pricing",
  "/login",
  "/join?league=default&demo=true",
  "/schedule?demo=true",
  "/standings?demo=true",
  "/matches/match_w16_11?demo=true",
  "/matches/match_w16_12/play-by-play?demo=true&mode=sync",
];
const paths = process.env.CONTRAST_PATHS ? process.env.CONTRAST_PATHS.split(",").map((p) => p.trim()).filter(Boolean) : defaultPaths;
const viewports = [
  { name: "phone", width: 390, height: 844 },
  { name: "laptop", width: 1366, height: 768 },
];
const themes = ["light", "dark"];
const interactive = process.env.CONTRAST_INTERACTIVE === "1";
const screenshotDir = process.env.CONTRAST_SCREENSHOTS;
const measurements = [];
if (screenshotDir) await mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch();
let total = 0;
async function scan(page, label, scope) {
  const root = scope || page.locator("body");
  if (!await page.evaluate(() => Boolean(window.axe))) {
    await page.addScriptTag({ content: axeSource });
    await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }" });
  }
  const result = await root.evaluate(async (element) => {
    const audit = await window.axe.run(element, { runOnly: ["color-contrast"], resultTypes: ["violations", "incomplete"] });
    const overflow = [...element.querySelectorAll("input, select, textarea, button")].filter((control) => {
      const rect = control.getBoundingClientRect();
      for (let parent = control.parentElement; parent && parent !== element; parent = parent.parentElement) {
        if (/auto|scroll/.test(getComputedStyle(parent).overflowX) && parent.scrollWidth > parent.clientWidth) return false;
      }
      return rect.width && rect.height && (rect.left < -1 || rect.right > innerWidth + 1);
    }).map((control) => control.outerHTML.slice(0, 180));
    const rect = element.getBoundingClientRect();
    const clippedDialog = element.getAttribute("role") === "dialog" && (rect.top < -1 || rect.bottom > innerHeight + 1);
    return { nodes: audit.violations.flatMap((v) => v.nodes), incomplete: audit.incomplete.flatMap((v) => v.nodes.map((n) => n.target)), overflow, clippedDialog };
  });
  const count = result.nodes.length + result.overflow.length + Number(result.clippedDialog);
  total += count;
  console.log(`${count ? "FAIL" : "ok  "}  ${label}${count ? ` (${count})` : ""}`);
  for (const node of result.nodes) {
    const data = node.any?.[0]?.data || {};
    console.log(`      ${data.contrastRatio ?? "?"}:1 fg ${data.fgColor ?? "?"} bg ${data.bgColor ?? "?"}  ${node.html.replace(/\s+/g, " ").slice(0, 160)}`);
  }
  for (const control of result.overflow) console.log(`      Horizontal overflow: ${control}`);
  if (result.clippedDialog) console.log("      Dialog extends outside the viewport");
  measurements.push({ label, ...result });
  if (screenshotDir) {
    await page.screenshot({ path: join(screenshotDir, `${label.replace(/[^a-z0-9]+/gi, "-")}.png`) });
    await writeFile(join(screenshotDir, "results.json"), JSON.stringify(measurements, null, 2));
  }
}

async function scanGuide(page, label, trigger) {
  await trigger.click();
  const dialog = page.getByRole("dialog").last();
  await dialog.getByRole("button", { name: "Close walkthrough" }).waitFor();
  let step = 1;
  for (;;) {
    await page.waitForTimeout(500);
    await scan(page, `${label} guide ${step}`, dialog);
    const next = dialog.getByRole("button", { name: "Next", exact: true });
    if (!await next.count()) break;
    await next.click();
    step++;
    if (step > 100) throw new Error(`Guide did not finish: ${label}`);
  }
  await dialog.getByRole("button", { name: "Close walkthrough" }).click();
}

async function scanSections(page, label, dialog) {
  await scan(page, label, dialog);
  const sections = dialog.locator("[data-tour]");
  for (let index = 0; index < await sections.count(); index++) {
    const section = sections.nth(index);
    if (!await section.isVisible()) continue;
    await section.scrollIntoViewIfNeeded();
    await scan(page, `${label} ${await section.getAttribute("data-tour")}`, dialog);
  }
}

async function scanInteractive(page, label) {
  await page.goto(`${baseUrl}/league/default?demo=true`, { waitUntil: "load", timeout: 60000 });
  await page.getByRole("button", { name: "League Settings", exact: true }).first().click();
  const settings = page.locator('[role="dialog"][aria-labelledby="league-settings-title"]');
  for (const tab of ["League Branding", "League Rules", "Subscription & Teams", "Season & Archival"]) {
    await settings.getByRole("button", { name: tab, exact: true }).click();
    if (tab === "League Branding") await settings.getByRole("button", { name: "Add venue" }).click();
    await scanSections(page, `${label} ${tab}`, settings);
    await scanGuide(page, `${label} ${tab}`, settings.getByTestId("page-guide-button"));
    if (tab === "Season & Archival") {
      await settings.getByRole("button", { name: "End Season", exact: true }).click();
      await settings.getByRole("button", { name: /2. Start the Next Season/ }).click();
      await scanSections(page, `${label} new season draft`, settings);
      await scanGuide(page, `${label} new season draft`, settings.getByTestId("page-guide-button"));
    }
  }
  await settings.getByRole("button", { name: "Close settings" }).click();
  await page.goto(`${baseUrl}/schedule?demo=true`, { waitUntil: "load", timeout: 60000 });
  await page.getByRole("button", { name: "Build Schedule", exact: true }).click();
  const builder = page.getByRole("dialog", { name: "Build Schedule" });
  await scanSections(page, `${label} schedule builder`, builder);
  await scanGuide(page, `${label} schedule builder`, builder.getByTestId("page-guide-button"));
  await builder.getByRole("button", { name: "Close schedule builder" }).click();
  await page.getByRole("button", { name: "Schedule Game", exact: true }).click();
  const event = page.getByRole("dialog").last();
  await scanSections(page, `${label} schedule game`, event);
  await scanGuide(page, `${label} schedule game`, event.getByTestId("page-guide-button"));
  await event.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: /Playoff Picture/ }).click();
  await page.getByRole("button", { name: "Change Playoff Format", exact: true }).click();
  const playoffs = page.getByRole("dialog", { name: "Change Playoff Format" });
  await scanSections(page, `${label} playoff format`, playoffs);
  await scanGuide(page, `${label} playoff format`, playoffs.getByTestId("page-guide-button"));
  await playoffs.getByRole("button", { name: /^Double Elim/ }).click();
  await scanSections(page, `${label} double elimination`, playoffs);
  await playoffs.getByRole("button", { name: "Close playoff format" }).click();
  await page.evaluate(() => {
    sessionStorage.setItem("demo_dev_role", "team_admin");
    sessionStorage.setItem("demo_managed_team_id", "team_buf");
  });
  await page.goto(`${baseUrl}/teams/team_buf?demo=true`, { waitUntil: "load" });
  await page.getByRole("button", { name: "Edit Team Info", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Edit Team Details" });
  await scanSections(page, `${label} team details`, edit);
  await scanGuide(page, `${label} team details`, edit.getByTestId("page-guide-button"));
  await edit.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: /Coaches & Admins/ }).click();
  const staff = page.getByRole("dialog", { name: "Coaches & Team Admins" });
  await scanSections(page, `${label} team staff`, staff);
  await scanGuide(page, `${label} team staff`, staff.getByTestId("page-guide-button"));
  await staff.getByRole("button", { name: "Close team staff" }).click();
  await page.getByRole("button", { name: "Customize Stats", exact: true }).first().click();
  const stats = page.getByRole("dialog", { name: "Choose Team Stats" });
  await scanSections(page, `${label} team stats`, stats);
  await scanGuide(page, `${label} team stats`, stats.getByTestId("page-guide-button"));
  await stats.getByRole("button", { name: "Close customizer" }).click();
  await page.goto(`${baseUrl}/teams/team_buf/roster?demo=true`, { waitUntil: "load" });
  await page.getByRole("button", { name: "Add Player", exact: true }).click();
  const roster = page.getByRole("dialog").last();
  await scanSections(page, `${label} add player`, roster);
  await scanGuide(page, `${label} add player`, roster.getByTestId("page-guide-button"));
  await roster.getByRole("button", { name: "Close add player" }).click();
  for (const path of ["/login", "/join?league=default&demo=true", "/pricing"]) {
    await page.goto(baseUrl + path, { waitUntil: "load" });
    await scanGuide(page, `${label} ${path}`, page.getByTestId("page-guide-button").first());
  }
}
try {
  for (const theme of themes) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, colorScheme: theme });
      await context.addInitScript((mode) => {
        window.localStorage.setItem("flagos_theme_mode_v2", mode);
        if (!window.sessionStorage.getItem("demo_dev_role")) window.sessionStorage.setItem("demo_dev_role", "league_admin");
      }, theme);
      const page = await context.newPage();
      for (const path of paths) {
        try {
          await page.goto(baseUrl + path, { waitUntil: "load", timeout: 60000 });
          await page.waitForTimeout(2500);
          const label = `${theme.padEnd(5)} ${viewport.name.padEnd(6)} ${path}`;
          await scan(page, label);
        } catch (error) {
          console.log(`ERROR ${theme} ${viewport.name} ${path}: ${error.message.split("\n")[0]}`);
          total += 1;
        }
      }
      if (interactive) {
        try {
          await scanInteractive(page, `${theme} ${viewport.name}`);
        } catch (error) {
          console.log(`ERROR ${theme} ${viewport.name} interactive: ${error.message.split("\n")[0]}`);
          total++;
        }
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(total ? `\n${total} contrast/layout issue(s) found.` : "\nNo contrast or layout issues found.");
process.exit(total ? 1 : 0);
