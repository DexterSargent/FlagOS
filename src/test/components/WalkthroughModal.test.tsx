import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WalkthroughModal from "@/components/walkthrough/WalkthroughModal";
import WalkthroughTrigger from "@/components/walkthrough/WalkthroughTrigger";
import {
  PLAY_DESIGNER_WALKTHROUGH,
  getToolWalkthroughForRoute,
} from "@/lib/walkthroughData";

describe("Walkthrough System", () => {
  it("resolves the correct walkthrough for each application route", () => {
    expect(getToolWalkthroughForRoute("/teams/team-1/playbook")?.id).toBe("play-designer");
    expect(getToolWalkthroughForRoute("/matches/match-1/play-by-play")?.id).toBe("stat-keeper");
    expect(getToolWalkthroughForRoute("/teams/team-1/roster")?.id).toBe("team-roster");
    expect(getToolWalkthroughForRoute("/teams/team-1")?.id).toBe("team-hub");
    expect(getToolWalkthroughForRoute("/league/league-1")?.id).toBe("league-directory");
  });

  it("renders Step-by-Step Tour mode and navigates between steps", () => {
    const handleClose = vi.fn();
    render(
      <WalkthroughModal
        walkthrough={PLAY_DESIGNER_WALKTHROUGH}
        initialMode="tour"
        isOpen={true}
        onClose={handleClose}
      />
    );

    // Initial step check
    expect(screen.getByText(/Step 1 of/i)).toBeInTheDocument();
    expect(screen.getByText("Interactive Field & Dragging")).toBeInTheDocument();

    // Advance to next step
    const nextBtn = screen.getByRole("button", { name: /Next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText(/Step 2 of/i)).toBeInTheDocument();
    expect(screen.getByText("Active Player Quick-Switch")).toBeInTheDocument();

    // Go back
    const backBtn = screen.getByRole("button", { name: /Back/i });
    fireEvent.click(backBtn);

    expect(screen.getByText(/Step 1 of/i)).toBeInTheDocument();
    expect(screen.getByText("Interactive Field & Dragging")).toBeInTheDocument();
  });

  it("switches to Translucent Button Map HUD mode", () => {
    const handleClose = vi.fn();
    render(
      <WalkthroughModal
        walkthrough={PLAY_DESIGNER_WALKTHROUGH}
        initialMode="tour"
        isOpen={true}
        onClose={handleClose}
      />
    );

    const buttonMapBtn = screen.getByRole("button", { name: /Button Map/i });
    fireEvent.click(buttonMapBtn);

    // Should now display the HUD header
    expect(screen.getByText(/Button Map HUD/i)).toBeInTheDocument();
    expect(screen.getByText("Cheat Sheet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Guided Tour/i })).toBeInTheDocument();
  });

  it("WalkthroughTrigger opens walkthrough on click", () => {
    render(<WalkthroughTrigger walkthrough={PLAY_DESIGNER_WALKTHROUGH} variant="header" />);

    const triggerBtn = screen.getByTitle(/Launch Play Designer/i);
    fireEvent.click(triggerBtn);

    expect(screen.getByText("Interactive Field & Dragging")).toBeInTheDocument();
  });
});
