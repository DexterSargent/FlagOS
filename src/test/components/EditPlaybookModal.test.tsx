import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import EditPlaybookModal from "@/components/playbook/EditPlaybookModal";
import { Playbook } from "@/lib/playbookTypes";

const mockPlaybook: Playbook = {
  id: "pb-123",
  teamId: "team_apex",
  title: "Apex Air Raid",
  type: "offense",
  playersOnField: 5,
  description: "Up-tempo 5v5 passing offense designed to attack two-deep coverage.",
  formations: [
    {
      id: "form-1",
      name: "Spread 2x1",
      side: "offense",
      players: [],
    },
  ],
  plays: [
    {
      id: "play-1",
      teamId: "team_apex",
      name: "Trips Right - Verticals",
      type: "offense",
      formation: "Spread 2x1",
      situation: "Standard",
      losY: 65,
      players: [],
    },
  ],
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};

describe("EditPlaybookModal Component", () => {
  it("does not render when isOpen is false or playbook is null", () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn();

    const { rerender } = render(
      <EditPlaybookModal
        isOpen={false}
        onClose={handleClose}
        playbook={mockPlaybook}
        onSave={handleSave}
      />
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(
      <EditPlaybookModal
        isOpen={true}
        onClose={handleClose}
        playbook={null}
        onSave={handleSave}
      />
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("populates existing playbook details upon opening", () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn();

    render(
      <EditPlaybookModal
        isOpen={true}
        onClose={handleClose}
        playbook={mockPlaybook}
        onSave={handleSave}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Edit Playbook Details")).toBeInTheDocument();
    expect(screen.getByText(/1 Formation • 1 Play/)).toBeInTheDocument();

    const titleInput = screen.getByTestId("edit-playbook-title-input") as HTMLInputElement;
    expect(titleInput.value).toBe("Apex Air Raid");

    const descInput = screen.getByTestId("edit-playbook-description-input") as HTMLTextAreaElement;
    expect(descInput.value).toBe("Up-tempo 5v5 passing offense designed to attack two-deep coverage.");
  });

  it("validates required title field", () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn();

    render(
      <EditPlaybookModal
        isOpen={true}
        onClose={handleClose}
        playbook={mockPlaybook}
        onSave={handleSave}
      />
    );

    const titleInput = screen.getByTestId("edit-playbook-title-input");
    fireEvent.change(titleInput, { target: { value: "   " } });

    fireEvent.click(screen.getByTestId("edit-playbook-save-button"));

    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a title for your playbook.");
    expect(handleSave).not.toHaveBeenCalled();
  });

  it("saves updated title, description, unit type, and squad format", () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn();

    render(
      <EditPlaybookModal
        isOpen={true}
        onClose={handleClose}
        playbook={mockPlaybook}
        onSave={handleSave}
      />
    );

    // Edit title
    const titleInput = screen.getByTestId("edit-playbook-title-input");
    fireEvent.change(titleInput, { target: { value: "Apex Lockdown Defense" } });

    // Switch unit to defense
    fireEvent.click(screen.getByTestId("edit-playbook-unit-defense"));

    // Switch squad size to 6v6
    fireEvent.click(screen.getByTestId("edit-playbook-squad-6"));

    // Edit description
    const descInput = screen.getByTestId("edit-playbook-description-input");
    fireEvent.change(descInput, { target: { value: "6v6 aggressive press-man scheme." } });

    // Save
    fireEvent.click(screen.getByTestId("edit-playbook-save-button"));

    expect(handleSave).toHaveBeenCalledTimes(1);
    const saved = handleSave.mock.calls[0][0] as Playbook;
    expect(saved.id).toBe("pb-123");
    expect(saved.title).toBe("Apex Lockdown Defense");
    expect(saved.type).toBe("defense");
    expect(saved.playersOnField).toBe(6);
    expect(saved.description).toBe("6v6 aggressive press-man scheme.");
    expect(saved.formations).toEqual(mockPlaybook.formations);
    expect(saved.plays).toEqual(mockPlaybook.plays);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when cancel or X button is clicked", () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn();

    render(
      <EditPlaybookModal
        isOpen={true}
        onClose={handleClose}
        playbook={mockPlaybook}
        onSave={handleSave}
      />
    );

    fireEvent.click(screen.getByTestId("edit-playbook-cancel-button"));
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Close edit playbook modal"));
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
