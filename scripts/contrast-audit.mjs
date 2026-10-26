#!/usr/bin/env node
// Runs axe-core colour-contrast checks on public pages in light and dark mode.
// Usage: node scripts/contrast-audit.mjs [baseUrl] (default http://localhost:3000)
// Extra paths can be passed with CONTRAST_PATHS="/a,/b". Exits 1 when any violation is found.
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const axeSource = require("fs").readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const baseUrl = (process.argv[2] || process.env.CONTRAST_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const defaultPaths = [
  "/",
  "/leagues",
  "/free-agents",
  "/pricing",
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

const browser = await chromium.launch();
let total = 0;
try {
  for (const theme of themes) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, colorScheme: theme });
      await context.addInitScript((mode) => {
        try { window.localStorage.setItem("flagos_theme_mode_v2", mode); } catch {}
      }, theme);
      const page = await context.newPage();
      for (const path of paths) {
        try {
          await page.goto(baseUrl + path, { waitUntil: "load", timeout: 60000 });
          await page.waitForTimeout(2500);
          await page.addScriptTag({ content: axeSource });
          // Freeze animations so pulsing/fading elements are measured at their resting colours.
          await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; }" });
          const result = await page.evaluate(async () => {
            return window.axe.run(document, { runOnly: ["color-contrast"], resultTypes: ["violations"] });
          });
          const nodes = result.violations.flatMap((v) => v.nodes);
          total += nodes.length;
          const label = `${theme.padEnd(5)} ${viewport.name.padEnd(6)} ${path}`;
          if (!nodes.length) {
            console.log(`ok    ${label}`);
            continue;
          }
          console.log(`FAIL  ${label} (${nodes.length})`);
          for (const node of nodes) {
            const data = node.any?.[0]?.data || {};
            console.log(`      ${data.contrastRatio ?? "?"}:1 fg ${data.fgColor ?? "?"} bg ${data.bgColor ?? "?"}  ${String(node.target?.[0] ?? "").slice(0, 90)}`);
            console.log(`      ${node.html.replace(/\s+/g, " ").slice(0, 140)}`);
          }
        } catch (error) {
          console.log(`ERROR ${theme} ${viewport.name} ${path}: ${error.message.split("\n")[0]}`);
          total += 1;
        }
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(total ? `\n${total} contrast issue(s) found.` : "\nNo contrast issues found.");
process.exit(total ? 1 : 0);
