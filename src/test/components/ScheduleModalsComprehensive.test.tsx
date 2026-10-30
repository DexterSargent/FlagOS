import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AutomatedScheduleBuilderModal from "@/components/schedule/AutomatedScheduleBuilderModal";
import EditPlayoffFormatModal from "@/components/schedule/EditPlayoffFormatModal";
import { PageGuideProvider } from "@/lib/pageGuide";

const mockTeams = [
  { id: "team_1", name: "Apex Lions", shortcode: "APX" },
  { id: "team_2", name: "Thunder Sharks", shortcode: "THU" },
  { id: "team_3", name: "Cyber Knights", shortcode: "CYB" },
  { id: "team_4", name: "Iron Raptors", shortcode: "RAP" },
];

describe("Schedule Modals Comprehensive Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AutomatedScheduleBuilderModal", () => {
    it("renders setup modal, adjusts configuration, and generates match preview", async () => {
      const onApply = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();

      render(
        <PageGuideProvider>
          <AutomatedScheduleBuilderModal
            isOpen={true}
            onClose={onClose}
            teams={mockTeams}
            defaultLocation="Turf Field 1"
            existingMatchesCount={0}
            onApplySchedule={onApply}
          />
        </PageGuideProvider>
      );

      // Verify header and setup content
      expect(screen.getByRole("heading", { name: /^Build Schedule$/i })).toBeInTheDocument();
      expect(screen.getByText(/4 Active Teams/i)).toBeInTheDocument();

      // Change weeks count
      const weeksInput = screen.getByTitle(/Enter any number of weeks/i);
      fireEvent.change(weeksInput, { target: { value: "3" } });

      // Add a venue/location
      const addVenueBtn = screen.getByRole("button", { name: /\+ Add Field/i });
      fireEvent.click(addVenueBtn);

      // Click Build Season Schedule button
      const generateBtn = screen.getByRole("button", { name: /Build Season Schedule/i });
      fireEvent.click(generateBtn);

      // Should complete generation and call onApplySchedule
      await waitFor(
        () => {
          expect(onApply).toHaveBeenCalled();
        },
        { timeout: 4000 }
      );
      expect(screen.getByText(/Schedule Built Successfully!/i)).toBeInTheDocument();
    });

    it("triggers onClose when cancel/close button is clicked", () => {
      const onClose = vi.fn();
      render(
        <PageGuideProvider>
          <AutomatedScheduleBuilderModal
            isOpen={true}
            onClose={onClose}
            teams={mockTeams}
            existingMatchesCount={0}
            onApplySchedule={vi.fn()}
          />
        </PageGuideProvider>
      );

      const closeBtn = screen.getByLabelText(/close schedule builder/i);
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it("shows an inline error when fewer than 2 teams are present", async () => {
      render(
        <PageGuideProvider>
          <AutomatedScheduleBuilderModal
            isOpen={true}
            onClose={vi.fn()}
            teams={[{ id: "team_1", name: "Solo Team" }]}
            existingMatchesCount={0}
            onApplySchedule={vi.fn()}
          />
        </PageGuideProvider>
      );

      const generateBtn = screen.getByRole("button", { name: /Build Season Schedule/i });
      fireEvent.click(generateBtn);

      expect(screen.getByRole("alert")).toHaveTextContent("Add at least two active teams before building a schedule.");
    });

    it("manages venues, kickoff times, weeks stepper, and playoff options", () => {
      render(
        <PageGuideProvider>
          <AutomatedScheduleBuilderModal
            isOpen={true}
            onClose={vi.fn()}
            teams={mockTeams}
            existingMatchesCount={2}
            onApplySchedule={vi.fn()}
          />
        </PageGuideProvider>
      );

      // Add a venue with text input
      const venueInput = screen.getByPlaceholderText(/Add venue or field name\.\.\./i);
      fireEvent.change(venueInput, { target: { value: "South Stadium" } });
      const addVenueBtn = screen.getByRole("button", { name: /\+ Add Field/i });
      fireEvent.click(addVenueBtn);
      expect(screen.getByText("South Stadium")).toBeInTheDocument();

      // Remove a venue
      const removeFieldBtn = screen.getByLabelText(/Remove field Field 2 - Prime Turf/i);
      fireEvent.click(removeFieldBtn);
      expect(screen.queryByText("Field 2 - Prime Turf")).toBeNull();

      // Add a kickoff time slot
      const timeInput = screen.getByPlaceholderText(/Add time slot/i);
      fireEvent.change(timeInput, { target: { value: "4:30 PM" } });
      const addTimeBtn = screen.getByRole("button", { name: /\+ Add Time/i });
      fireEvent.click(addTimeBtn);
      expect(screen.getByText("4:30 PM")).toBeInTheDocument();

      // Remove a time slot
      const removeTimeBtn = screen.getByLabelText(/Remove kickoff time 10:15 AM/i);
      fireEvent.click(removeTimeBtn);
      expect(screen.queryByText("10:15 AM")).toBeNull();

      // Increase weeks with stepper button
      const increaseWeekBtn = screen.getByTitle("Increase by 1 week");
      fireEvent.click(increaseWeekBtn);

      // Toggle Playoff Tournament Format button
      const playoffToggleBtn = screen.getByText(/Playoffs Enabled ✓/i);
      fireEvent.click(playoffToggleBtn);
      expect(screen.getByText(/Regular Season Only/i)).toBeInTheDocument();
    });
  });

  describe("EditPlayoffFormatModal", () => {
    it("renders playoff bracket selector, changes team count and elimination structure, and saves", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();

      render(
        <PageGuideProvider>
          <EditPlayoffFormatModal
            isOpen={true}
            onClose={onClose}
            totalTeams={4}
            currentTeamsCount={4}
            currentStructure="single_elimination"
            onSave={onSave}
          />
        </PageGuideProvider>
      );

      expect(screen.getByRole("heading", { name: /Change Playoff Format/i })).toBeInTheDocument();
      expect(screen.getByText(/Playoff Setup/i)).toBeInTheDocument();

      // Switch to double elimination via exact text within button
      const doubleElimBtn = screen.getByText("Double Elim").closest("button")!;
      fireEvent.click(doubleElimBtn);

      // Click 2 Teams quick preset
      const preset2Btn = screen.getByRole("button", { name: /^2 Teams/i });
      fireEvent.click(preset2Btn);

      // Save format
      const saveBtn = screen.getByRole("button", { name: /Apply Playoff Format/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(2, "double_elimination");
      });
      expect(onClose).toHaveBeenCalled();
    });

    it("triggers onClose when close or cancel button is clicked", () => {
      const onClose = vi.fn();
      const { rerender } = render(
        <PageGuideProvider>
          <EditPlayoffFormatModal
            isOpen={true}
            onClose={onClose}
            totalTeams={8}
            currentTeamsCount={4}
            onSave={vi.fn()}
          />
        </PageGuideProvider>
      );

      const closeBtn = screen.getByLabelText(/close playoff format/i);
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);

      // Click Cancel button in footer
      const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
      fireEvent.click(cancelBtn);
      expect(onClose).toHaveBeenCalledTimes(2);

      // When isOpen is false, nothing is rendered
      rerender(
        <PageGuideProvider>
          <EditPlayoffFormatModal
            isOpen={false}
            onClose={onClose}
            totalTeams={8}
            currentTeamsCount={4}
            onSave={vi.fn()}
          />
        </PageGuideProvider>
      );
      expect(screen.queryByRole("heading", { name: /Change Playoff Format/i })).toBeNull();
    });

    it("handles team presets that generate byes for top seeds", () => {
      render(
        <PageGuideProvider>
          <EditPlayoffFormatModal
            isOpen={true}
            onClose={vi.fn()}
            totalTeams={8}
            currentTeamsCount={6}
            currentStructure="single_elimination"
            onSave={vi.fn()}
          />
        </PageGuideProvider>
      );

      // 6 teams out of 8 bracket means 8 - 6 = 2 byes
      expect(screen.getByText(/Top 2 Seeds Bye/i)).toBeInTheDocument();
    });
  });
});

