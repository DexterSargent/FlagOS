import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WalkthroughModal, { getAvailableSteps } from "@/components/walkthrough/WalkthroughModal";
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

  it("renders the guided tour with per-button details and navigates between steps", () => {
    const handleClose = vi.fn();
    const toolbar = document.createElement("div");
    toolbar.setAttribute("data-testid", "designer-toolbar");
    document.body.appendChild(toolbar);
    vi.spyOn(toolbar, "getBoundingClientRect").mockReturnValue({
      top: 0, left: 0, bottom: 40, right: 200, width: 200, height: 40, x: 0, y: 0, toJSON: () => ({}),
    });
    render(<WalkthroughModal walkthrough={PLAY_DESIGNER_WALKTHROUGH} isOpen={true} onClose={handleClose} />);

    expect(screen.getByText(/Step 1 of/i)).toBeInTheDocument();
    expect(screen.getByText("Build and teach a play")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByText(/Step 2 of/i)).toBeInTheDocument();
    expect(screen.getByText("Studio Toolbar")).toBeInTheDocument();
    expect(screen.getByText("What each control does")).toBeInTheDocument();
    expect(screen.getByText("Back to Plays")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    expect(screen.getByText("Build and teach a play")).toBeInTheDocument();
    toolbar.remove();

    fireEvent.click(screen.getByRole("button", { name: /Close guide/i }));
    expect(handleClose).toHaveBeenCalled();
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
    expect(steps[0].details).toEqual([]);
    hidden.remove();
  });

  it("resets scroll between steps and keeps progress bounded for long guides", () => {
    const walkthrough: ToolWalkthrough = {
      id: "long-guide", toolName: "Long Guide", subtitle: "Test",
      steps: Array.from({ length: 50 }, (_, i) => ({
        id: `step-${i}`, title: `Title ${i}`, description: `Description ${i}`, targetSelector: "",
        details: [{ label: "Control", text: "What it does" }],
      })),
    };
    render(<WalkthroughModal walkthrough={walkthrough} isOpen onClose={vi.fn()} />);
    const body = screen.getByText(/What it does/).closest('[aria-live="polite"]')!;
    body.scrollTop = 200;
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(body.scrollTop).toBe(0);
    expect(screen.getByText("Step 2 of 50")).toBeInTheDocument();
    expect(screen.getByText("Long Guide")).toBeInTheDocument();
  });
});