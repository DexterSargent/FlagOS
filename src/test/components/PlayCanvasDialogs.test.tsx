import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import {
  SaveRoutePresetDialog,
  PositionNotesDialog,
  PlayNotesDialog,
} from "@/components/playbook/PlayCanvasDialogs";

vi.mock("@/components/walkthrough/PageGuideButton", () => ({ default: () => null }));
vi.mock("@/lib/pageGuide", () => ({ usePageGuide: () => {} }));

describe("PlayCanvasDialogs", () => {
  describe("SaveRoutePresetDialog", () => {
    it("handles typing, enter key, escape key, and save button", () => {
      const onPresetNameChange = vi.fn();
      const onSave = vi.fn();
      const onClose = vi.fn();

      const { rerender } = render(
        <SaveRoutePresetDialog
          customPresetCount={3}
          waypointCount={4}
          isDemo={false}
          presetName=""
          onPresetNameChange={onPresetNameChange}
          onSave={onSave}
          onClose={onClose}
        />
      );

      expect(screen.getByText("3/20 custom presets for this team")).toBeInTheDocument();
      expect(screen.getByText("4 cuts/points")).toBeInTheDocument();
      const saveBtn = screen.getByRole("button", { name: /Save to Team/i });
      expect(saveBtn).toBeDisabled();

      const input = screen.getByPlaceholderText(/e.g. Post-Corner/i);
      fireEvent.change(input, { target: { value: "Post-Corner" } });
      expect(onPresetNameChange).toHaveBeenCalledWith("Post-Corner");

      // Rerender with value
      rerender(
        <SaveRoutePresetDialog
          customPresetCount={3}
          waypointCount={4}
          isDemo={true}
          presetName="Post-Corner"
          onPresetNameChange={onPresetNameChange}
          onSave={onSave}
          onClose={onClose}
        />
      );

      expect(screen.getByText(/Demo League Mode/i)).toBeInTheDocument();
      expect(saveBtn).toBeEnabled();

      fireEvent.keyDown(input, { key: "Enter" });
      expect(onSave).toHaveBeenCalledTimes(1);

      fireEvent.click(saveBtn);
      expect(onSave).toHaveBeenCalledTimes(2);

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });

  describe("PositionNotesDialog", () => {
    it("renders players, updates individual position notes, and closes", () => {
      const onUpdatePlayerNotes = vi.fn();
      const onClose = vi.fn();

      const players = [
        { id: "p1", label: "X", role: "Wide Receiver", quickRouteName: "Slant", notes: "Break inside" },
        { id: "p2", label: "QB", role: "Quarterback", notes: "" },
      ];

      render(
        <PositionNotesDialog
          playName="Trips Flood"
          players={players as any}
          readOnly={false}
          onUpdatePlayerNotes={onUpdatePlayerNotes}
          onClose={onClose}
        />
      );

      expect(screen.getByText(/Trips Flood • Position Notes & Read Progression/i)).toBeInTheDocument();
      const textarea = screen.getByLabelText("X (Wide Receiver) coaching notes");
      expect(textarea).toHaveValue("Break inside");

      fireEvent.change(textarea, { target: { value: "Break deep after 5 steps" } });
      expect(onUpdatePlayerNotes).toHaveBeenCalledWith("p1", "Break deep after 5 steps");

      fireEvent.click(screen.getByRole("button", { name: "Done" }));
      expect(onClose).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });

  describe("PlayNotesDialog", () => {
    it("renders notes, updates scheme notes, and handles close", () => {
      const onNotesChange = vi.fn();
      const onClose = vi.fn();

      render(
        <PlayNotesDialog
          notes="Initial scheme notes"
          readOnly={false}
          onNotesChange={onNotesChange}
          onClose={onClose}
        />
      );

      const textarea = screen.getByLabelText("Coach playbook scheme notes");
      expect(textarea).toHaveValue("Initial scheme notes");

      fireEvent.change(textarea, { target: { value: "Updated scheme notes" } });
      expect(onNotesChange).toHaveBeenCalledWith("Updated scheme notes");

      fireEvent.click(screen.getByRole("button", { name: "Save Notes" }));
      expect(onClose).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });
});
