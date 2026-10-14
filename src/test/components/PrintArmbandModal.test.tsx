import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PrintArmbandModal from "@/components/playbook/PrintArmbandModal";
import { Playbook, PlayDiagram } from "@/lib/playbookTypes";

// Mock LeagueContext for MiniPlayDiagram
vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    settings: {
      rules: { rushLineDistance: 7 },
    },
  }),
}));

const mockPlay1: PlayDiagram = {
  id: "play_1",
  teamId: "team_test",
  name: "Quick Slants",
  formation: "Spread 2x1",
  situation: "3rd & Short / Must-Have",
  type: "offense",
  losY: 65,
  players: [
    { id: "qb", label: "QB", side: "offense", role: "Quarterback", x: 50, y: 75, route: [] },
    { id: "c", label: "C", side: "offense", role: "Center", x: 50, y: 65, route: [] },
    { id: "x", label: "X", side: "offense", role: "Wide Receiver", x: 20, y: 65, route: [{ x: 35, y: 50 }] },
  ],
  notes: "Hit X on third step if corner bails.",
};

const mockPlay2: PlayDiagram = {
  id: "play_2",
  teamId: "team_test",
  name: "Deep Post",
  formation: "Trips Right",
  situation: "Red Zone / Goal Line",
  type: "offense",
  losY: 65,
  players: [
    { id: "qb", label: "QB", side: "offense", role: "Quarterback", x: 50, y: 75, route: [] },
    { id: "c", label: "C", side: "offense", role: "Center", x: 50, y: 65, route: [] },
    { id: "z", label: "Z", side: "offense", role: "Slot", x: 75, y: 65, route: [{ x: 50, y: 30 }] },
  ],
  notes: "Safety lookoff required.",
};

const mockPlaybook: Playbook = {
  id: "pb_test_1",
  teamId: "team_test",
  title: "Championship Offense",
  type: "offense",
  playersOnField: 5,
  description: "Test playbook",
  formations: [],
  plays: [mockPlay1, mockPlay2],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("PrintArmbandModal", () => {
  const mockOnClose = vi.fn();
  const originalPrint = window.print;

  beforeEach(() => {
    vi.clearAllMocks();
    window.print = vi.fn();
  });

  afterAll(() => {
    window.print = originalPrint;
  });

  it("renders the armband inserts mode with cutting guides and cards", () => {
    render(
      <PrintArmbandModal
        isOpen={true}
        onClose={mockOnClose}
        playbook={mockPlaybook}
        teamName="Arizona"
      />
    );

    // Title and team name
    expect(screen.getByText("Armband Cards & Playbook Printing")).toBeInTheDocument();
    expect(screen.getByText(/Arizona • Championship Offense/i)).toBeInTheDocument();

    // Mode tabs
    expect(screen.getByRole("button", { name: /Armband Inserts/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gameday Call Sheet/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Complete Playbook/i })).toBeInTheDocument();

    // Print area contains cutting guide and cards
    expect(screen.getByText(/Cut along dashed border for wrist coach insert/i)).toBeInTheDocument();
    expect(screen.getByText(/Quick Slants/i)).toBeInTheDocument();
    expect(screen.getByText(/Deep Post/i)).toBeInTheDocument();
  });

  it("switches to Gameday Call Sheet mode and groups plays by situation", () => {
    render(
      <PrintArmbandModal
        isOpen={true}
        onClose={mockOnClose}
        playbook={mockPlaybook}
        teamName="Arizona"
      />
    );

    const callSheetTab = screen.getByRole("button", { name: /Gameday Call Sheet/i });
    fireEvent.click(callSheetTab);

    // Situations appear as headers
    expect(screen.getByText("3rd & Short / Must-Have")).toBeInTheDocument();
    expect(screen.getByText("Red Zone / Goal Line")).toBeInTheDocument();
    expect(screen.getByText(/Gameday Call Sheet by Situation/i)).toBeInTheDocument();
  });

  it("switches to Complete Playbook mode and displays coaching notes and assignments", () => {
    render(
      <PrintArmbandModal
        isOpen={true}
        onClose={mockOnClose}
        playbook={mockPlaybook}
        teamName="Arizona"
      />
    );

    const playbookTab = screen.getByRole("button", { name: /Complete Playbook/i });
    fireEvent.click(playbookTab);

    // Playbook detailed breakdown
    expect(screen.getAllByText("Personnel Assignments:").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Coaching Progression & Gameday Notes:").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Hit X on third step if corner bails.")).toBeInTheDocument();
  });

  it("triggers window.print when clicking Print / Save PDF", () => {
    render(
      <PrintArmbandModal
        isOpen={true}
        onClose={mockOnClose}
        playbook={mockPlaybook}
        teamName="Arizona"
      />
    );

    const printButton = screen.getByRole("button", { name: /Print \/ Save PDF/i });
    fireEvent.click(printButton);

    expect(window.print).toHaveBeenCalledTimes(1);
  });
});
