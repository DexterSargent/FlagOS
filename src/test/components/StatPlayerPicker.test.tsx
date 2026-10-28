import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StatPlayerPicker from "@/components/play-by-play/StatPlayerPicker";

describe("StatPlayerPicker Component", () => {
  const defaultProps = {
    label: "Flagger(s)",
    roster: ["Patrick Mahomes", "Travis Kelce", "TEAM"],
    playerNumbers: {
      "Patrick Mahomes": "15",
      "Travis Kelce": "87",
    },
    counts: {
      "Patrick Mahomes": 3,
      "Travis Kelce": 5,
    },
    countLabel: "flags",
    selected: ["Travis Kelce"],
    onSelect: vi.fn(),
  };

  it("renders player buttons with jersey numbers and stat counts", () => {
    render(<StatPlayerPicker {...defaultProps} />);

    expect(screen.getByText("Flagger(s)")).toBeInTheDocument();
    expect(screen.getByText("#15")).toBeInTheDocument();
    expect(screen.getByText("#87")).toBeInTheDocument();
    expect(screen.getByText("Patrick Mahomes")).toBeInTheDocument();
    expect(screen.getByText("Travis Kelce")).toBeInTheDocument();
    expect(screen.getByText("Team Defense")).toBeInTheDocument();
    expect(screen.getByText("(5 flags)")).toBeInTheDocument();
    expect(screen.getByText("(3 flags)")).toBeInTheDocument();
  });

  it("calls onSelect when a player button is clicked", () => {
    const onSelect = vi.fn();
    render(<StatPlayerPicker {...defaultProps} onSelect={onSelect} />);

    const mahomesBtn = screen.getByRole("button", { name: "Patrick Mahomes" });
    fireEvent.click(mahomesBtn);

    expect(onSelect).toHaveBeenCalledWith("Patrick Mahomes");
  });

  it("supports collapsible mode when expanded is toggled", () => {
    const onExpandedChange = vi.fn();
    const { rerender } = render(
      <StatPlayerPicker
        {...defaultProps}
        collapsible={true}
        expanded={false}
        onExpandedChange={onExpandedChange}
      />
    );

    // Collapsed header button should be visible
    const collapsedBtn = screen.getByRole("button", { name: /Flagger\(s\): #87 Travis Kelce\. Click to change/i });
    expect(collapsedBtn).toBeInTheDocument();

    fireEvent.click(collapsedBtn);
    expect(onExpandedChange).toHaveBeenCalledWith(true);

    // Re-render expanded
    rerender(
      <StatPlayerPicker
        {...defaultProps}
        collapsible={true}
        expanded={true}
        onExpandedChange={onExpandedChange}
      />
    );

    const doneBtn = screen.getByRole("button", { name: "Done selecting Flagger(s)" });
    expect(doneBtn).toBeInTheDocument();
    fireEvent.click(doneBtn);
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });
});
