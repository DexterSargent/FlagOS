import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PenaltyWizardStep from "@/components/play-by-play/PenaltyWizardStep";

describe("PenaltyWizardStep", () => {
  const defaultProps = {
    possessionTeamName: "Chiefs",
    defendingTeamName: "Ravens",
    currentDown: 1,
    downsPerSeries: 4,
    offenseRoster: ["Patrick Mahomes", "Travis Kelce", "TEAM"],
    defenseRoster: ["Roquan Smith", "Kyle Hamilton", "TEAM"],
    playerNumbers: {
      "Patrick Mahomes": "15",
      "Travis Kelce": "87",
      "Roquan Smith": "0",
      "Kyle Hamilton": "14",
    },
    onCancel: vi.fn(),
    onSavePenalty: vi.fn(),
  };

  const continueToPlayerSelection = () => {
    fireEvent.click(screen.getByRole("button", { name: /Continue to enforcement/i }));
    fireEvent.click(screen.getByRole("button", { name: /Continue to player/i }));
  };

  it("renders jersey number badges for defensive athletes by default", () => {
    render(<PenaltyWizardStep {...defaultProps} />);

    // Defending team is penalized by default (e.g. DPI)
    continueToPlayerSelection();
    expect(screen.getByText("#0")).toBeInTheDocument();
    expect(screen.getByText("#14")).toBeInTheDocument();
    expect(screen.getByText("Roquan Smith")).toBeInTheDocument();
    expect(screen.getByText("Kyle Hamilton")).toBeInTheDocument();
  });

  it("switches to offensive roster and shows offensive jersey numbers when Offense is selected", () => {
    render(<PenaltyWizardStep {...defaultProps} />);

    // Click Offense side button
    const offenseBtn = screen.getByRole("button", { name: /Offense/i });
    fireEvent.click(offenseBtn);
    continueToPlayerSelection();

    expect(screen.getByText("#15")).toBeInTheDocument();
    expect(screen.getByText("#87")).toBeInTheDocument();
    expect(screen.getByText("Patrick Mahomes")).toBeInTheDocument();
    expect(screen.getByText("Travis Kelce")).toBeInTheDocument();
  });

  it("updates Selected label to include player's jersey number", () => {
    render(<PenaltyWizardStep {...defaultProps} />);

    continueToPlayerSelection();

    // Select Kyle Hamilton
    const kyleBtn = screen.getByRole("button", { name: "Kyle Hamilton" });
    fireEvent.click(kyleBtn);

    // Selected display shows #14 Kyle Hamilton
    expect(screen.getByText(/#14 Kyle Hamilton/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Back to enforcement/i }));
    fireEvent.click(screen.getByRole("button", { name: /Back to infraction/i }));
    expect(screen.getByRole("button", { name: /Defensive Pass Interference/i })).toHaveClass("border-amber-500");
    expect(screen.getByRole("button", { name: /Continue to enforcement/i })).toBeInTheDocument();
  });

  it("saves penalty details after stepping through the guided flow", () => {
    const onSavePenalty = vi.fn();
    render(<PenaltyWizardStep {...defaultProps} onSavePenalty={onSavePenalty} />);

    continueToPlayerSelection();
    fireEvent.click(screen.getByRole("button", { name: "Kyle Hamilton" }));
    fireEvent.click(screen.getByRole("button", { name: /Back to enforcement/i }));
    fireEvent.click(screen.getByRole("button", { name: "Declined" }));
    fireEvent.click(screen.getByRole("button", { name: "5 Yds" }));
    fireEvent.click(screen.getByRole("button", { name: /Continue to player/i }));
    fireEvent.click(screen.getByRole("button", { name: /Enforce penalty/i }));

    expect(onSavePenalty).toHaveBeenCalledWith(expect.objectContaining({
      side: "defense",
      penalizedTeamName: "Ravens",
      yards: 5,
      enforcement: "declined",
      player: "Kyle Hamilton",
      statement: expect.stringContaining("Kyle Hamilton"),
    }));
  });
});
