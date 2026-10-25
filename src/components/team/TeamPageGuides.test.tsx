import { describe, it, expect, vi } from "vitest";
import * as guides from "@/lib/walkthroughData";
import { getAvailableSteps } from "@/components/walkthrough/WalkthroughModal";

describe("Team page guide definitions", () => {
  it.each(Object.entries(guides))("%s starts with an overview and has valid unique steps", (_name, guide) => {
    expect(guide.steps[0].targetSelector).toBe("");
    expect(new Set(guide.steps.map((step) => step.id)).size).toBe(guide.steps.length);
    for (const step of guide.steps) {
      expect(step.title.trim()).not.toBe("");
      expect(step.description.trim()).not.toBe("");
      expect(step.details?.length ?? 0).toBeLessThanOrEqual(8);
      if (step.targetSelector) expect(() => document.querySelector(step.targetSelector)).not.toThrow();
    }
  });

  it("includes nested depth-chart controls only when the chart is available", () => {
    const chart = document.createElement("div");
    chart.dataset.tour = "depth-chart-section";
    chart.innerHTML = '<fieldset></fieldset><div role="group"></div>';
    document.body.appendChild(chart);
    const bounds = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 0, left: 0, bottom: 40, right: 100, width: 100, height: 40, x: 0, y: 0, toJSON: () => ({}),
    });
    expect(getAvailableSteps(guides.TEAM_ROSTER_WALKTHROUGH.steps).map((step) => step.id))
      .toEqual(["roster-overview", "depth-chart-section", "depth-chart-creation", "depth-chart-lineup"]);
    bounds.mockRestore();
    chart.remove();
  });

  it("explains read-only viewing separately from editing", () => {
    expect(guides.PLAY_VIEWER_WALKTHROUGH.steps[0].description).toMatch(/read-only/i);
    expect(guides.PLAY_VIEWER_WALKTHROUGH.steps.some((step) => step.id === "player-view-assignment")).toBe(true);
    expect(guides.ASYNC_STAT_KEEPER_WALKTHROUGH.steps.some((step) => step.id === "penalty-enforcement")).toBe(true);
  });
});
