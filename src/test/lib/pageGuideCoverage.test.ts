import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ALL_WALKTHROUGHS, getToolWalkthroughForRoute } from "@/lib/walkthroughs";
import * as teamGuides from "@/lib/walkthroughData";
import * as leagueGuides from "@/lib/walkthroughs/league";
import * as publicGuides from "@/lib/walkthroughs/public";
import * as adminGuides from "@/lib/walkthroughs/admin";
import type { ToolWalkthrough } from "@/lib/walkthroughData";

const APP_DIR = path.resolve(__dirname, "../../app");

function listPageRoutes(dir: string, base = ""): string[] {
  const routes: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith("_") || entry.name === "api") continue;
      const segment = entry.name.startsWith("(") ? "" : `/${entry.name.replace(/^\[\.*(.+?)\]$/, "sample-$1")}`;
      routes.push(...listPageRoutes(path.join(dir, entry.name), base + segment));
    } else if (entry.name === "page.tsx") {
      routes.push(base || "/");
    }
  }
  return routes;
}

function isWalkthrough(value: unknown): value is ToolWalkthrough {
  return Boolean(value && typeof value === "object" && "steps" in value && Array.isArray((value as ToolWalkthrough).steps));
}

const everyGuide: ToolWalkthrough[] = [teamGuides, leagueGuides, publicGuides, adminGuides]
  .flatMap((mod) => Object.values(mod))
  .flatMap((value) => (isWalkthrough(value) ? [value] : value && typeof value === "object" ? Object.values(value).filter(isWalkthrough) : []));

describe("page guide coverage", () => {
  const routes = listPageRoutes(APP_DIR);

  it("finds the app's pages", () => {
    expect(routes.length).toBeGreaterThan(15);
  });

  it.each(routes)("%s has a page guide", (route) => {
    expect(getToolWalkthroughForRoute(route)).not.toBeNull();
  });

  it("registers each route guide by its id", () => {
    for (const guide of Object.values(ALL_WALKTHROUGHS)) expect(ALL_WALKTHROUGHS[guide.id]).toBe(guide);
  });

  it("gives every guide a unique id and well-formed steps", () => {
    const ids = new Set<string>();
    for (const guide of new Set(everyGuide)) {
      expect(ids.has(guide.id), `duplicate guide id ${guide.id}`).toBe(false);
      ids.add(guide.id);
      expect(guide.toolName.trim()).not.toBe("");
      expect(guide.steps.length).toBeGreaterThan(0);
      const stepIds = new Set<string>();
      for (const step of guide.steps) {
        expect(stepIds.has(step.id), `duplicate step ${step.id} in ${guide.id}`).toBe(false);
        stepIds.add(step.id);
        expect(step.title.trim(), `${guide.id}/${step.id} title`).not.toBe("");
        expect(step.description.trim(), `${guide.id}/${step.id} description`).not.toBe("");
        for (const detail of step.details ?? []) {
          expect(detail.label.trim()).not.toBe("");
          expect(detail.text.trim()).not.toBe("");
        }
      }
    }
  });

  it("gives every full-page guide an overview and real coverage", () => {
    for (const guide of Object.values(ALL_WALKTHROUGHS)) {
      expect(guide.steps.length, `${guide.id} step count`).toBeGreaterThanOrEqual(4);
    }
  });

  it("uses plain league terminology and does not describe the old checkout buttons", () => {
    const copy = JSON.stringify(everyGuide);
    expect(copy).not.toMatch(/\bcircuits?\b/i);
    expect(copy).not.toContain("Confirm & Pay");
    expect(copy).not.toContain("Flag Guarding / FFL");
  });
});