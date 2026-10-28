import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import CreateFormationModal from "@/components/playbook/CreateFormationModal";
import type { Playbook, FormationAlignment } from "@/lib/playbookTypes";

vi.mock("@/components/walkthrough/PageGuideButton", () => ({ default: () => null }));
vi.mock("@/lib/pageGuide", () => ({ usePageGuide: () => {} }));

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    settings: {
      rules: { playersOnField: 5, rushLineDistance: 7 },
    },
  }),
}));

const mockOffensePlaybook: Playbook = {
  id: "pb_off",
  teamId: "team_apex",
  title: "Spread Attack",
  type: "offense",
  playersOnField: 5,
  description: "High speed passing",
  formations: [],
  plays: [],
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const mockDefensePlaybook: Playbook = {
  ...mockOffensePlaybook,
  id: "pb_def",
  title: "Zone Lockdown",
  type: "defense",
};

describe("CreateFormationModal", () => {
  it("returns null when isOpen is false", () => {
    const { container } = render(
      <CreateFormationModal
        isOpen={false}
        onClose={vi.fn()}
        playbook={mockOffensePlaybook}
        onSaveFormation={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("creates a new offensive formation with squad size adjustment and preset", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    const { container } = render(
      <CreateFormationModal
        isOpen={true}
        onClose={onClose}
        playbook={mockOffensePlaybook}
        onSaveFormation={onSave}
      />
    );

    expect(screen.getByText("Offensive Alignment Designer")).toBeInTheDocument();

    // Change squad size to 6v6
    fireEvent.click(screen.getByRole("button", { name: /6v6/i }));

    // Apply Trips Right preset
    const tripsBtn = screen.getByRole("button", { name: /Trips Right/i });
    fireEvent.click(tripsBtn);

    // Toggle opposing defense visibility
    const defenseToggle = screen.getByRole("button", { name: /Show Opposing Defense/i });
    fireEvent.click(defenseToggle);

    // Update formation name
    const nameInput = container.querySelector<HTMLInputElement>('input[type="text"]')!;
    fireEvent.change(nameInput, { target: { value: "Trips Right Overload" } });

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /Save Formation Alignment/i }));

    expect(onSave).toHaveBeenCalledOnce();
    const saved: FormationAlignment = onSave.mock.calls[0][0];
    expect(saved.name).toBe("Trips Right Overload");
    expect(saved.side).toBe("offense");
    expect(saved.players!.length).toBeGreaterThanOrEqual(6);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("edits an existing defensive formation alignment", () => {
    const onSave = vi.fn();
    const existing: FormationAlignment = {
      id: "form_cover3",
      name: "Cover 3 Cloud",
      side: "defense",
      description: "Cover 3 scheme",
      players: [
        { id: "d1", label: "CB1", role: "CB", side: "defense", x: 20, y: 55, route: [] },
        { id: "d2", label: "CB2", role: "CB", side: "defense", x: 80, y: 55, route: [] },
        { id: "d3", label: "FS", role: "FS", side: "defense", x: 50, y: 45, route: [] },
      ],
    };

    render(
      <CreateFormationModal
        isOpen={true}
        onClose={vi.fn()}
        playbook={mockDefensePlaybook}
        initialFormation={existing}
        onSaveFormation={onSave}
      />
    );

    expect(screen.getByText("Defensive Shell Designer")).toBeInTheDocument();

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /Save Formation Alignment/i }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0].id).toBe("form_cover3");
  });

  it("validates empty formation name and shows error", () => {
    const onSave = vi.fn();
    const { container } = render(
      <CreateFormationModal
        isOpen={true}
        onClose={vi.fn()}
        playbook={mockOffensePlaybook}
        onSaveFormation={onSave}
      />
    );

    const nameInput = container.querySelector<HTMLInputElement>('input[type="text"]')!;
    fireEvent.change(nameInput, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /Save Formation Alignment/i }));

    expect(screen.getByText("Please enter a name for this formation.")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("handles Escape key and Cancel button", () => {
    const onClose = vi.fn();
    render(
      <CreateFormationModal
        isOpen={true}
        onClose={onClose}
        playbook={mockOffensePlaybook}
        onSaveFormation={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
