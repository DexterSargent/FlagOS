import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WalkthroughModal, { findControlByLabel, getAvailableSteps } from "@/components/walkthrough/WalkthroughModal";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";
import { PageGuideProvider, usePageGuide } from "@/lib/pageGuide";
import type { ToolWalkthrough } from "@/lib/walkthroughData";
import {
  PLAY_DESIGNER_WALKTHROUGH,
  PLAYBOOK_STUDIO_WALKTHROUGH,
} from "@/lib/walkthroughData";
import { getToolWalkthroughForRoute } from "@/lib/walkthroughs";

describe("Walkthrough System", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves the correct walkthrough for each application route", () => {
    expect(getToolWalkthroughForRoute("/teams/team-1/playbook")?.id).toBe("play-designer");
    expect(getToolWalkthroughForRoute("/matches/match-1/play-by-play")?.id).toBe("stat-keeper");
    expect(getToolWalkthroughForRoute("/teams/team-1/roster")?.id).toBe("team-roster");
    expect(getToolWalkthroughForRoute("/teams/team-1")?.id).toBe("team-hub");
    expect(getToolWalkthroughForRoute("/league/league-1")?.id).toBe("commissioner-dashboard");
  });

  it("gives every step a title, description and unique id", () => {
    const ids = new Set<string>();
    for (const step of PLAY_DESIGNER_WALKTHROUGH.steps) {
      expect(step.title).toBeTruthy();
      expect(step.description).toBeTruthy();
      expect(ids.has(step.id)).toBe(false);
      ids.add(step.id);
    }
  });

  it("walks through an area, then spotlights each of its controls one at a time", () => {
    const handleClose = vi.fn();
    const toolbar = document.createElement("div");
    toolbar.setAttribute("data-testid", "designer-toolbar");
    const backButton = document.createElement("button");
    backButton.textContent = "Back to Plays";
    toolbar.appendChild(backButton);
    document.body.appendChild(toolbar);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const size = this === toolbar || this === backButton ? 40 : 0;
      return { top: 0, left: 0, bottom: size, right: size * 5, width: size * 5, height: size, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    });
    render(<WalkthroughModal walkthrough={PLAY_DESIGNER_WALKTHROUGH} isOpen={true} onClose={handleClose} />);

    expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByText("Build and teach a play")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();
    expect(screen.getByText("Studio Toolbar")).toBeInTheDocument();
    expect(screen.queryByText("What each control does")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByRole("heading", { name: "Back to Plays" })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("data-control-step", "found");
    expect(backButton).toHaveAttribute("data-walkthrough-target");

    fireEvent.click(screen.getByRole("button", { name: /^Back$/ }));
    expect(screen.getByRole("heading", { name: "Studio Toolbar" })).toBeInTheDocument();
    expect(backButton).not.toHaveAttribute("data-walkthrough-target");
    toolbar.remove();

    fireEvent.click(screen.getByRole("button", { name: /Close guide/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it("matches controls by name, label variants, and the area itself", () => {
    const area = document.createElement("div");
    area.innerHTML = `
      <button aria-label="Switch to Light Mode" data-guide-name="Theme toggle"></button>
      <button>Draw</button>
      <button>Undo (Ctrl+Z)</button>
      <div class="rounded-2xl" id="tile"><span>Total Roster Athletes</span><div>291</div></div>`;
    document.body.appendChild(area);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 0, left: 0, bottom: 20, right: 20, width: 20, height: 20, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);

    expect(findControlByLabel(area, "Theme")?.getAttribute("data-guide-name")).toBe("Theme toggle");
    expect(findControlByLabel(area, "Draw / Done")?.textContent).toBe("Draw");
    expect(findControlByLabel(area, "Undo button")?.textContent).toBe("Undo (Ctrl+Z)");
    expect(findControlByLabel(area, "Total Roster Athletes")?.id).toBe("tile");
    // A lone generic word ("toggle") must not match an unrelated control.
    expect(findControlByLabel(area, "Toggle menu")).toBeNull();
    area.remove();
  });

  it("no longer offers a Button Map mode", () => {
    render(<WalkthroughModal walkthrough={PLAY_DESIGNER_WALKTHROUGH} isOpen={true} onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Button Map/i })).not.toBeInTheDocument();
  });

  it("skips steps whose controls are not on screen", () => {
    const visible = document.createElement("div");
    visible.setAttribute("data-tour", "create-playbook-btn");
    document.body.appendChild(visible);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const size = this === visible ? 40 : 0;
      return { top: 0, left: 0, bottom: size, right: size, width: size, height: size, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    });

    const steps = getAvailableSteps(PLAYBOOK_STUDIO_WALKTHROUGH.steps);
    expect(steps.map((s) => s.id)).toEqual(["studio-overview", "create-playbook-btn"]);
    visible.remove();
  });

  it("the header Guide opens the tour registered by the current page, letting a nested tool override it", () => {
    function Register({ walkthrough, priority }: { walkthrough: ToolWalkthrough; priority?: number }) {
      usePageGuide(walkthrough, priority);
      return null;
    }
    const { rerender } = render(
      <PageGuideProvider>
        <PageGuideButton />
        <Register walkthrough={PLAYBOOK_STUDIO_WALKTHROUGH} />
      </PageGuideProvider>
    );
    expect(screen.getByRole("button", { name: /Playbook Studio guided tour/i })).toBeInTheDocument();

    rerender(
      <PageGuideProvider>
        <PageGuideButton />
        <Register walkthrough={PLAYBOOK_STUDIO_WALKTHROUGH} />
        <Register walkthrough={PLAY_DESIGNER_WALKTHROUGH} priority={1} />
      </PageGuideProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: /Play Designer guided tour/i }));
    expect(screen.getByRole("dialog", { name: /Play Designer walkthrough/i })).toBeInTheDocument();
    expect(screen.getByText("Build and teach a play")).toBeInTheDocument();
  });

  it("hides the Guide on pages without a tour", () => {
    render(
      <PageGuideProvider>
        <PageGuideButton />
      </PageGuideProvider>
    );
    expect(screen.queryByTestId("page-guide-button")).not.toBeInTheDocument();
  });

  it("keeps keyboard focus in the guide, closes only the guide with Escape and restores focus", () => {
    const onClose = vi.fn();
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const { rerender } = render(<WalkthroughModal walkthrough={PLAY_DESIGNER_WALKTHROUGH} isOpen onClose={onClose} />);
    expect(screen.getByRole("dialog")).toHaveFocus();
    const next = screen.getByRole("button", { name: "Done" });
    next.focus();
    fireEvent.keyDown(next, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Close walkthrough" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true });
    expect(next).toHaveFocus();
    const underlyingEscape = vi.fn();
    window.addEventListener("keydown", underlyingEscape);
    fireEvent.keyDown(next, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    expect(underlyingEscape).not.toHaveBeenCalled();
    window.removeEventListener("keydown", underlyingEscape);
    rerender(<WalkthroughModal walkthrough={PLAY_DESIGNER_WALKTHROUGH} isOpen={false} onClose={onClose} />);
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it("omits detail controls that exist but are hidden", () => {
    const hidden = document.createElement("button");
    hidden.id = "hidden-control";
    hidden.style.display = "none";
    document.body.appendChild(hidden);
    const steps = getAvailableSteps([{
      id: "overview", title: "Overview", description: "Help", targetSelector: "",
      details: [{ label: "Hidden action", text: "Not available", requiresSelector: "#hidden-control" }],
    }]);
    expect(steps.map((s) => s.id)).toEqual(["overview"]);
    expect(steps[0].details).toBeUndefined();
    hidden.remove();
  });

  it("resets scroll between steps and keeps progress bounded for long guides", () => {
    const walkthrough: ToolWalkthrough = {
      id: "long-guide", toolName: "Long Guide", subtitle: "Test",
      steps: Array.from({ length: 50 }, (_, i) => ({
        id: `step-${i}`, title: `Title ${i}`, description: `Description ${i}`, targetSelector: "",
      })),
    };
    render(<WalkthroughModal walkthrough={walkthrough} isOpen onClose={vi.fn()} />);
    const body = screen.getByText("Description 0").closest('[aria-live="polite"]')!;
    body.scrollTop = 200;
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(body.scrollTop).toBe(0);
    expect(screen.getByText("Step 2 of 50")).toBeInTheDocument();
    expect(screen.getByText("Long Guide")).toBeInTheDocument();
  });
});