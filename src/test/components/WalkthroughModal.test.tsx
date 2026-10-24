import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WalkthroughModal, { getAvailableSteps } from "@/components/walkthrough/WalkthroughModal";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";
import { PageGuideProvider, usePageGuide } from "@/lib/pageGuide";
import type { ToolWalkthrough } from "@/lib/walkthroughData";
import {
  PLAY_DESIGNER_WALKTHROUGH,
  PLAYBOOK_STUDIO_WALKTHROUGH,
  getToolWalkthroughForRoute,
} from "@/lib/walkthroughData";

describe("Walkthrough System", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves the correct walkthrough for each application route", () => {
    expect(getToolWalkthroughForRoute("/teams/team-1/playbook")?.id).toBe("play-designer");
    expect(getToolWalkthroughForRoute("/matches/match-1/play-by-play")?.id).toBe("stat-keeper");
    expect(getToolWalkthroughForRoute("/teams/team-1/roster")?.id).toBe("team-roster");
    expect(getToolWalkthroughForRoute("/teams/team-1")?.id).toBe("team-hub");
    expect(getToolWalkthroughForRoute("/league/league-1")?.id).toBe("league-directory");
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
    render(<WalkthroughModal walkthrough={PLAY_DESIGNER_WALKTHROUGH} isOpen={true} onClose={handleClose} />);

    expect(screen.getByText(/Step 1 of/i)).toBeInTheDocument();
    expect(screen.getByText("Studio Toolbar")).toBeInTheDocument();
    expect(screen.getByText("What each control does")).toBeInTheDocument();
    expect(screen.getByText("Back to Plays")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByText(/Step 2 of/i)).toBeInTheDocument();
    expect(screen.getByText("Play Details Bar")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    expect(screen.getByText("Studio Toolbar")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Skip tour/i }));
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
    expect(steps.map((s) => s.id)).toEqual(["studio-overview", "create-playbook"]);
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
    expect(screen.getByText("Studio Toolbar")).toBeInTheDocument();
  });

  it("hides the Guide on pages without a tour", () => {
    render(
      <PageGuideProvider>
        <PageGuideButton />
      </PageGuideProvider>
    );
    expect(screen.queryByTestId("page-guide-button")).not.toBeInTheDocument();
  });
});