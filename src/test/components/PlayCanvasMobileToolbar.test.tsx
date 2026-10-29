import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlayCanvas from "@/components/playbook/PlayCanvas";
import { PlayDiagram, createDefaultPlaybooks } from "@/lib/playbookTypes";

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    settings: {
      leagueName: "FlagOS League",
      rules: { playersOnField: 5 },
    },
    isDemoLeague: false,
  }),
}));

const mockPlay: PlayDiagram = {
  id: "test_play_mobile",
  teamId: "team_test",
  name: "Trips Right Flood",
  type: "offense",
  formation: "Trips Right",
  situation: "Standard",
  losY: 70,
  players: [
    { id: "p_qb", label: "QB", role: "QB", side: "offense", x: 50, y: 82, route: [] },
    { id: "p_c", label: "C", role: "C", side: "offense", x: 50, y: 70, route: [] },
    { id: "p_x", label: "X", role: "WR", side: "offense", x: 15, y: 70, route: [] },
    { id: "p_y", label: "Y", role: "TE", side: "offense", x: 75, y: 70, route: [] },
    { id: "p_z", label: "Z", role: "WR", side: "offense", x: 88, y: 70, route: [] },
  ],
  zones: [],
};

const mockPlaybook = createDefaultPlaybooks("team_test")[0];

describe("PlayCanvas Mobile Toolbar & Dropdown Responsiveness", () => {
  it("renders both situation and formation dropdowns in the metaRow toolbar container", () => {
    const onChange = vi.fn();
    render(
      <PlayCanvas
        play={mockPlay}
        playbook={mockPlaybook}
        onChange={onChange}
        readOnly={false}
      />
    );

    const formationSelect = screen.getByRole("combobox", { name: "Play formation" });
    const situationSelect = screen.getByRole("combobox", { name: "Play situation" });

    expect(formationSelect).toBeInTheDocument();
    expect(formationSelect).toHaveValue("Trips Right");

    expect(situationSelect).toBeInTheDocument();
    expect(situationSelect).toHaveValue("Standard");

    // Verify both dropdowns are wrapped within the metaRow container
    const metaRow = formationSelect.closest('[class*="metaRow"]');
    expect(metaRow).not.toBeNull();
    expect(metaRow).toContainElement(formationSelect);
    expect(metaRow).toContainElement(situationSelect);
  });

  it("updates situation when user selects a different gameday situation", () => {
    const onChange = vi.fn();
    render(
      <PlayCanvas
        play={mockPlay}
        playbook={mockPlaybook}
        onChange={onChange}
        readOnly={false}
      />
    );

    const situationSelect = screen.getByRole("combobox", { name: "Play situation" });
    fireEvent.change(situationSelect, { target: { value: "Red Zone" } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        situation: "Red Zone",
      })
    );
  });

  it("updates formation when user selects a different formation", () => {
    const onChange = vi.fn();
    render(
      <PlayCanvas
        play={mockPlay}
        playbook={mockPlaybook}
        onChange={onChange}
        readOnly={false}
      />
    );

    const formationSelect = screen.getByRole("combobox", { name: "Play formation" });
    fireEvent.change(formationSelect, { target: { value: "Spread 2x1" } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        formation: "Spread 2x1",
      })
    );
  });

  it("displays formation and situation as text in readOnly viewer mode", () => {
    const onChange = vi.fn();
    render(
      <PlayCanvas
        play={mockPlay}
        playbook={mockPlaybook}
        onChange={onChange}
        readOnly={true}
      />
    );

    expect(screen.queryByRole("combobox", { name: "Play formation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Play situation" })).not.toBeInTheDocument();
    expect(screen.getByText("Trips Right · Standard")).toBeInTheDocument();
  });
});

