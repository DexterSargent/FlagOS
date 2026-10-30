import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PlayCanvas from "@/components/playbook/PlayCanvas";
import { PlayDiagram, Playbook } from "@/lib/playbookTypes";

const mockOffensePlaybook: Playbook = {
  id: "pb-off-1",
  teamId: "team_apex",
  title: "5v5 Spread Offense",
  type: "offense",
  playersOnField: 5,
  formations: [],
  plays: [
    {
      id: "play-off-verts",
      teamId: "team_apex",
      name: "Spread 2x1 - Verticals",
      type: "offense",
      formation: "Spread 2x1",
      situation: "Standard",
      losY: 65,
      players: [
        { id: "off-qb", side: "offense", label: "QB", role: "Quarterback", x: 50, y: 74 },
        { id: "off-wr1", side: "offense", label: "WR1", role: "Wide Receiver", x: 15, y: 65, route: [{ x: 15, y: 20 }], quickRouteName: "Go", routeType: "pass" },
        { id: "off-slot", side: "offense", label: "SLOT", role: "Slot Receiver", x: 32, y: 65, route: [{ x: 30, y: 25 }], quickRouteName: "Seam", routeType: "pass" },
        { id: "off-wr2", side: "offense", label: "WR2", role: "Wide Receiver", x: 85, y: 65, route: [{ x: 85, y: 20 }], quickRouteName: "Go", routeType: "pass" },
        { id: "off-c", side: "offense", label: "C", role: "Center", x: 50, y: 65, route: [{ x: 50, y: 55 }], quickRouteName: "Sit", routeType: "pass" },
      ],
    },
  ],
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};

const mockDefensePlaybook: Playbook = {
  id: "pb-def-1",
  teamId: "team_apex",
  title: "Apex Lockdown Defense",
  type: "defense",
  playersOnField: 5,
  formations: [],
  plays: [
    {
      id: "play-def-c2",
      teamId: "team_apex",
      name: "Cover 2 Zone",
      type: "defense",
      formation: "Cover 2",
      situation: "Standard",
      losY: 65,
      zones: [
        { id: "z-test-1", name: "Deep Left", x: 25, y: 35, rx: 18, ry: 10, color: "#3B82F6" },
      ],
      players: [
        { id: "def-r", side: "defense", label: "R", role: "Pass Rusher", x: 42, y: 53, coverageType: "rush", route: [{ x: 50, y: 74 }] },
        { id: "def-cb1", side: "defense", label: "CB1", role: "Cornerback", x: 18, y: 58, coverageType: "zone", zoneId: "z-test-1", route: [{ x: 25, y: 35 }] },
        { id: "def-mlb", side: "defense", label: "MLB", role: "Linebacker", x: 50, y: 56, coverageType: "zone", route: [{ x: 50, y: 50 }] },
        { id: "def-cb2", side: "defense", label: "CB2", role: "Cornerback", x: 82, y: 58, coverageType: "zone", route: [{ x: 80, y: 50 }] },
        { id: "def-fs", side: "defense", label: "FS", role: "Free Safety", x: 50, y: 40, coverageType: "zone", route: [{ x: 50, y: 30 }] },
      ],
    },
  ],
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};

describe("PlayCanvas - Opponent Schemes & Rush Toggle", () => {
  it.each([
    { book: mockDefensePlaybook, opponent: mockOffensePlaybook, label: "WR1" },
    { book: mockOffensePlaybook, opponent: mockDefensePlaybook, label: "CB1" },
  ])("lets players preview and reset an opponent against $book.type without saving", ({ book, opponent, label }) => {
    const onChange = vi.fn();
    const play = book.plays[0];
    const original = structuredClone(play);
    render(<PlayCanvas play={play} onChange={onChange} readOnly hasEditAccess={false} playbook={book} allPlaybooks={[book, opponent]} />);
    fireEvent.click(screen.getByTestId("toggle-opponent-btn"));
    fireEvent.click(screen.getByTestId("opponent-play-selector-btn"));
    expect(screen.getByText("Preview only — saved play stays unchanged")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${opponent.plays[0].name}\\s*${opponent.plays[0].formation}$`) }));

    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    expect(screen.getByTestId("opponent-play-selector-btn")).toHaveTextContent(`Vs: ${opponent.title}: ${opponent.plays[0].name}`);
    expect(screen.queryByRole("textbox", { name: "Play name" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save playbook" })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(play).toEqual(original);

    fireEvent.click(screen.getByTestId("opponent-play-selector-btn"));
    fireEvent.click(screen.getByRole("button", { name: "Reset / Clear Opponent" }));
    expect(screen.queryByText(label)).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("supports player preset previews and discards them when switching plays", () => {
    const onChange = vi.fn();
    const play = mockDefensePlaybook.plays[0];
    const view = render(<PlayCanvas play={play} onChange={onChange} readOnly />);
    fireEvent.click(screen.getByTestId("toggle-opponent-btn"));
    fireEvent.click(screen.getByTestId("opponent-play-selector-btn"));
    fireEvent.click(screen.getByRole("button", { name: /^Trips Flood/ }));
    expect(screen.getAllByText("H").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Run Play" }));
    expect(onChange).not.toHaveBeenCalled();

    const next = { ...play, id: "another-play", name: "Another defense" };
    view.rerender(<PlayCanvas play={next} onChange={onChange} readOnly />);
    expect(screen.queryByText("H")).not.toBeInTheDocument();
    expect(screen.getByTestId("opponent-play-selector-btn")).not.toHaveTextContent("Trips Flood");
    view.rerender(<PlayCanvas play={play} onChange={onChange} readOnly />);
    expect(screen.queryByText("H")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps man-coverage targets connected during a player opponent preview", () => {
    const onChange = vi.fn();
    const play: PlayDiagram = {
      ...mockDefensePlaybook.plays[0],
      players: [
        ...mockDefensePlaybook.plays[0].players.map((player) => player.label === "CB1"
          ? { ...player, coverageType: "man" as const, manTargetId: "off-wr1" }
          : player),
        ...mockOffensePlaybook.plays[0].players,
      ],
    };
    render(<PlayCanvas play={play} onChange={onChange} readOnly allPlaybooks={[mockOffensePlaybook]} />);
    fireEvent.click(screen.getByTestId("opponent-play-selector-btn"));
    fireEvent.click(screen.getByRole("button", { name: /Spread 2x1 - Verticals/ }));
    fireEvent.pointerDown(screen.getAllByText("CB1")[0]);
    expect(screen.getByText(/Cover WR1 ·/)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(play.players.find((player) => player.label === "CB1")?.manTargetId).toBe("off-wr1");
  });

  it("retargets imported man defenders to the current offense and clears previous opponent zones", () => {
    const onChange = vi.fn();
    const play = { ...mockOffensePlaybook.plays[0], zones: mockDefensePlaybook.plays[0].zones };
    const opponent: Playbook = {
      ...mockDefensePlaybook,
      plays: [{
        ...mockDefensePlaybook.plays[0],
        zones: [],
        players: [
          { ...mockOffensePlaybook.plays[0].players[1], id: "source-receiver" },
          ...mockDefensePlaybook.plays[0].players.map((player) => player.label === "CB1"
            ? { ...player, coverageType: "man" as const, manTargetId: "source-receiver" }
            : player),
        ],
      }],
    };
    render(<PlayCanvas play={play} onChange={onChange} allPlaybooks={[opponent]} />);
    fireEvent.click(screen.getByTestId("toggle-opponent-btn"));
    fireEvent.click(screen.getByTestId("opponent-play-selector-btn"));
    fireEvent.click(screen.getByRole("button", { name: /^Cover 2 Zone\s*Cover 2$/ }));
    const updated = onChange.mock.lastCall![0] as PlayDiagram;
    expect(updated.players.find((player) => player.label === "CB1")?.manTargetId).toBe("off-wr1");
    expect(updated.zones).toEqual([]);
    expect(updated.players.filter((player) => player.side === "offense")).toEqual(play.players);
  });

  it("does not automatically turn on show opponent when rush is selected for defender", () => {
    const handleChange = vi.fn();
    const defensePlay: PlayDiagram = {
      id: "play-def-test",
      teamId: "team_apex",
      name: "Goal Line Stand",
      type: "defense",
      formation: "Goal Line",
      situation: "Standard",
      losY: 65,
      players: [
        { id: "def-1", side: "defense", label: "RUSH", role: "Pass Rusher", x: 45, y: 53 },
        { id: "def-2", side: "defense", label: "MLB", role: "Linebacker", x: 50, y: 57 },
        { id: "off-qb", side: "offense", label: "QB", role: "Quarterback", x: 50, y: 74 },
        { id: "off-c", side: "offense", label: "C", role: "Center", x: 50, y: 65 },
      ],
    };

    render(
      <PlayCanvas
        play={defensePlay}
        onChange={handleChange}
        playbook={mockDefensePlaybook}
        allPlaybooks={[mockDefensePlaybook, mockOffensePlaybook]}
      />
    );

    // Opponent should be OFF by default
    expect(screen.getByText("Opponent Off")).toBeInTheDocument();

    // Select the rush defender
    fireEvent.click(screen.getAllByText("RUSH")[0]);

    // Click Pass Rush button
    const rushBtn = screen.getByTestId("set-pass-rush-btn");
    fireEvent.click(rushBtn);

    // Rush assignment was saved
    expect(handleChange).toHaveBeenCalled();

    // Opponent should STILL be OFF (does not automatically turn on)
    expect(screen.getByText("Opponent Off")).toBeInTheDocument();
  });

  it("keeps the opponent visible for plays with man coverage", () => {
    const manCoveragePlay: PlayDiagram = {
      id: "play-man-test",
      teamId: "team_apex",
      name: "Man Lock",
      type: "defense",
      formation: "Man Lock",
      situation: "Standard",
      losY: 65,
      players: [
        { id: "def-cb", side: "defense", label: "CB", role: "Cornerback", x: 20, y: 58, coverageType: "man" },
        { id: "off-wr", side: "offense", label: "WR", role: "Wide Receiver", x: 20, y: 65 },
      ],
    };

    render(
      <PlayCanvas
        play={manCoveragePlay}
        onChange={vi.fn()}
        playbook={mockDefensePlaybook}
        allPlaybooks={[mockDefensePlaybook, mockOffensePlaybook]}
      />
    );

    expect(screen.getByText("Opponent On")).toBeInTheDocument();
    expect(screen.getByTestId("opponent-play-selector-btn")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("toggle-opponent-btn"));

    expect(screen.getByText("Opponent On")).toBeInTheDocument();
    expect(screen.getByTestId("opponent-play-selector-btn")).toBeInTheDocument();
  });

  it("allows a defensive play to select an offensive play from team playbooks and populates it", () => {
    let currentPlay: PlayDiagram = {
      id: "play-def-test",
      teamId: "team_apex",
      name: "Base Defense",
      type: "defense",
      formation: "Base",
      situation: "Standard",
      losY: 65,
      players: [
        { id: "def-1", side: "defense", label: "CB1", role: "Cornerback", x: 20, y: 55 },
        { id: "def-2", side: "defense", label: "CB2", role: "Cornerback", x: 80, y: 55 },
        { id: "def-3", side: "defense", label: "MLB", role: "Linebacker", x: 50, y: 55 },
        { id: "def-4", side: "defense", label: "FS", role: "Safety", x: 35, y: 40 },
        { id: "def-5", side: "defense", label: "SS", role: "Safety", x: 65, y: 40 },
        { id: "off-1", side: "offense", label: "QB", role: "Quarterback", x: 50, y: 74 },
        { id: "off-2", side: "offense", label: "C", role: "Center", x: 50, y: 65 },
        { id: "off-3", side: "offense", label: "X", role: "Receiver", x: 20, y: 65 },
        { id: "off-4", side: "offense", label: "Y", role: "Receiver", x: 80, y: 65 },
        { id: "off-5", side: "offense", label: "Z", role: "Receiver", x: 35, y: 65 },
      ],
    };

    const handleChange = vi.fn((next: PlayDiagram) => {
      currentPlay = next;
    });

    render(
      <PlayCanvas
        play={currentPlay}
        onChange={handleChange}
        playbook={mockDefensePlaybook}
        allPlaybooks={[mockDefensePlaybook, mockOffensePlaybook]}
      />
    );

    // Turn Opponent On
    fireEvent.click(screen.getByTestId("toggle-opponent-btn"));
    expect(screen.getByText("Opponent On")).toBeInTheDocument();

    // Opponent play selector is now visible
    const selectorBtn = screen.getByTestId("opponent-play-selector-btn");
    expect(selectorBtn).toBeInTheDocument();

    // Open dropdown
    fireEvent.click(selectorBtn);
    expect(screen.getByTestId("opponent-plays-menu")).toBeInTheDocument();

    // The offensive play from the team's offensive playbook is listed
    expect(screen.getByText("5v5 Spread Offense")).toBeInTheDocument();
    const playOption = screen.getByRole("button", { name: /Spread 2x1 - Verticals/ });
    expect(playOption).toHaveTextContent("Spread 2x1 - Verticals");

    // Select the play
    fireEvent.click(playOption);

    // Verify onChange was called with the imported offense routes and preserved defense
    expect(handleChange).toHaveBeenCalled();
    const updated = handleChange.mock.lastCall![0] as PlayDiagram;

    // Defense players are kept
    expect(updated.players.some((p) => p.side === "defense" && p.label === "CB1")).toBe(true);
    // Offense players with their routes were imported
    expect(updated.players.some((p) => p.side === "offense" && p.label === "WR1" && p.route && p.route.length > 0)).toBe(true);
    expect(updated.players.some((p) => p.side === "offense" && p.label === "SLOT" && p.quickRouteName === "Seam")).toBe(true);
  });

  it("allows an offensive play to select a defensive scheme from team playbooks and populates zones and assignments", () => {
    let currentPlay: PlayDiagram = {
      id: "play-off-test",
      teamId: "team_apex",
      name: "Air Attack",
      type: "offense",
      formation: "Spread",
      situation: "Standard",
      losY: 65,
      players: [
        { id: "off-1", side: "offense", label: "QB", role: "Quarterback", x: 50, y: 74 },
        { id: "off-2", side: "offense", label: "C", role: "Center", x: 50, y: 65 },
        { id: "off-3", side: "offense", label: "WR1", role: "Wide Receiver", x: 15, y: 65, route: [{ x: 15, y: 25 }] },
        { id: "off-4", side: "offense", label: "WR2", role: "Wide Receiver", x: 85, y: 65 },
        { id: "off-5", side: "offense", label: "SLOT", role: "Slot Receiver", x: 35, y: 65 },
        { id: "def-1", side: "defense", label: "FS", role: "Safety", x: 50, y: 40 },
        { id: "def-2", side: "defense", label: "CB1", role: "Cornerback", x: 20, y: 55 },
        { id: "def-3", side: "defense", label: "CB2", role: "Cornerback", x: 80, y: 55 },
        { id: "def-4", side: "defense", label: "LB", role: "Linebacker", x: 35, y: 55 },
        { id: "def-5", side: "defense", label: "R", role: "Pass Rusher", x: 50, y: 53 },
      ],
    };

    const handleChange = vi.fn((next: PlayDiagram) => {
      currentPlay = next;
    });

    render(
      <PlayCanvas
        play={currentPlay}
        onChange={handleChange}
        playbook={mockOffensePlaybook}
        allPlaybooks={[mockDefensePlaybook, mockOffensePlaybook]}
      />
    );

    // Turn Opponent On
    fireEvent.click(screen.getByTestId("toggle-opponent-btn"));

    // Open Opponent play selector
    fireEvent.click(screen.getByTestId("opponent-play-selector-btn"));

    // The defensive play from Apex Lockdown Defense is listed
    expect(screen.getByText("Apex Lockdown Defense")).toBeInTheDocument();
    const defPlayOption = screen.getByRole("button", { name: /^Cover 2 Zone\s*Cover 2$/ });
    expect(defPlayOption).toHaveTextContent("Cover 2 Zone");

    // Select the defensive scheme
    fireEvent.click(defPlayOption);

    expect(handleChange).toHaveBeenCalled();
    const updated = handleChange.mock.lastCall![0] as PlayDiagram;

    // Offense is preserved
    expect(updated.players.some((p) => p.side === "offense" && p.label === "WR1")).toBe(true);
    // Defense players are imported with zones
    expect(updated.players.some((p) => p.side === "defense" && p.label === "R" && p.coverageType === "rush")).toBe(true);
    expect(updated.zones?.some((z) => z.name === "Deep Left")).toBe(true);
  });

  it("indicates open receivers when running play simulation against populated opponent", () => {
    // Play with a deep open receiver far from any defender
    const playWithSeparation: PlayDiagram = {
      id: "play-sim-test",
      teamId: "team_apex",
      name: "Deep Post Attack",
      type: "offense",
      formation: "Spread",
      situation: "Standard",
      losY: 65,
      players: [
        { id: "off-qb", side: "offense", label: "QB", role: "Quarterback", x: 50, y: 74 },
        { id: "off-c", side: "offense", label: "C", role: "Center", x: 50, y: 65 },
        // WR1 runs deep corner into open field at (15, 20)
        { id: "off-wr1", side: "offense", label: "WR1", role: "Wide Receiver", x: 15, y: 65, route: [{ x: 15, y: 20 }] },
        { id: "off-wr2", side: "offense", label: "WR2", role: "Wide Receiver", x: 85, y: 65 },
        { id: "off-slot", side: "offense", label: "SLOT", role: "Slot Receiver", x: 35, y: 65 },
        // Defenders all on the right side of the field
        { id: "def-1", side: "defense", label: "FS", role: "Safety", x: 75, y: 40 },
        { id: "def-2", side: "defense", label: "CB1", role: "Cornerback", x: 70, y: 55 },
        { id: "def-3", side: "defense", label: "CB2", role: "Cornerback", x: 80, y: 55 },
        { id: "def-4", side: "defense", label: "LB", role: "Linebacker", x: 65, y: 55 },
        { id: "def-5", side: "defense", label: "R", role: "Pass Rusher", x: 50, y: 53 },
      ],
    };

    render(
      <PlayCanvas
        play={playWithSeparation}
        onChange={vi.fn()}
        playbook={mockOffensePlaybook}
        allPlaybooks={[mockDefensePlaybook, mockOffensePlaybook]}
      />
    );

    // Turn Opponent On
    fireEvent.click(screen.getByTestId("toggle-opponent-btn"));

    // Click "Run Play" animation button
    const runPlayBtn = screen.getByText("Run Play");
    fireEvent.click(runPlayBtn);

    // WR1 is running away from the defenders on the right and is OPEN
    expect(screen.getByTestId("open-receiver-off-wr1")).toBeInTheDocument();
  });

  it("retargets man defenders based on spatial positioning rather than receiver labels when an opposing play is selected", () => {
    const handleChange = vi.fn();
    // Defense with Left CB at x: 18 and Right CB at x: 82, covering initial offense where X is at x: 15 and Z is at x: 85
    const defensePlay: PlayDiagram = {
      id: "def-man-lock",
      teamId: "team_apex",
      name: "Man 2-Deep",
      type: "defense",
      formation: "Man Cover",
      situation: "Standard",
      losY: 65,
      players: [
        { id: "cb-left", side: "defense", label: "LCB", role: "Cornerback", x: 18, y: 55, coverageType: "man", manTargetId: "init-x" },
        { id: "cb-right", side: "defense", label: "RCB", role: "Cornerback", x: 82, y: 55, coverageType: "man", manTargetId: "init-z" },
        { id: "init-x", side: "offense", label: "X", role: "Wide Receiver", x: 15, y: 65 },
        { id: "init-z", side: "offense", label: "Z", role: "Wide Receiver", x: 85, y: 65 },
      ],
    };

    // Opposing offense where receiver labels are swapped: Z is on the left (x: 15) and X is on the right (x: 85)
    const opponentSwappedOffense: Playbook = {
      id: "pb-swapped",
      teamId: "team_apex",
      title: "Swapped Formation Book",
      type: "offense",
      playersOnField: 5,
      formations: [],
      plays: [
        {
          id: "play-swapped-verts",
          teamId: "team_apex",
          name: "Swapped Verticals",
          type: "offense",
          formation: "Swapped 2x1",
          situation: "Standard",
          losY: 65,
          players: [
            { id: "new-z", side: "offense", label: "Z", role: "Wide Receiver", x: 15, y: 65, route: [{ x: 15, y: 20 }] },
            { id: "new-x", side: "offense", label: "X", role: "Wide Receiver", x: 85, y: 65, route: [{ x: 85, y: 20 }] },
            { id: "new-c", side: "offense", label: "C", role: "Center", x: 50, y: 65 },
            { id: "new-qb", side: "offense", label: "QB", role: "Quarterback", x: 50, y: 74 },
            { id: "new-h", side: "offense", label: "H", role: "Slot Receiver", x: 30, y: 65 },
          ],
        },
      ],
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    };

    render(
      <PlayCanvas
        play={defensePlay}
        onChange={handleChange}
        playbook={mockDefensePlaybook}
        allPlaybooks={[mockDefensePlaybook, opponentSwappedOffense]}
      />
    );

    // Open opponent plays menu
    fireEvent.click(screen.getByTestId("opponent-play-selector-btn"));
    // Select the Swapped Verticals play
    fireEvent.click(screen.getByRole("button", { name: /^Swapped Verticals/ }));

    expect(handleChange).toHaveBeenCalled();
    const updatedPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;

    const updatedLcb = updatedPlay.players.find((p) => p.id === "cb-left");
    const updatedRcb = updatedPlay.players.find((p) => p.id === "cb-right");

    const targetedByLcb = updatedPlay.players.find((p) => p.id === updatedLcb?.manTargetId);
    const targetedByRcb = updatedPlay.players.find((p) => p.id === updatedRcb?.manTargetId);

    // LCB is on the left -> must default to Z (at x: 15), NOT travel across the field to X on the right!
    expect(targetedByLcb?.label).toBe("Z");
    expect(targetedByLcb?.x).toBe(15);

    // RCB is on the right -> must default to X (at x: 85), NOT travel across the field to Z on the left!
    expect(targetedByRcb?.label).toBe("X");
    expect(targetedByRcb?.x).toBe(85);
  });

  it("allows selecting 'No Opposing Play' to clear scheme and go back to showing no opposing play", () => {
    const handleChange = vi.fn();
    const defensePlay: PlayDiagram = {
      id: "def-play-scheme-test",
      teamId: "team_apex",
      name: "Base Defense",
      type: "defense",
      formation: "Base",
      situation: "Standard",
      losY: 65,
      players: [
        { id: "def-cb", side: "defense", label: "CB", role: "Cornerback", x: 20, y: 55, coverageType: "man", manTargetId: "off-1" },
        { id: "off-1", side: "offense", label: "WR", role: "Wide Receiver", x: 20, y: 65 },
      ],
    };

    const { rerender } = render(
      <PlayCanvas
        play={defensePlay}
        onChange={handleChange}
        playbook={mockDefensePlaybook}
        allPlaybooks={[mockDefensePlaybook, mockOffensePlaybook]}
      />
    );

    // 1. Select opposing play
    fireEvent.click(screen.getByTestId("opponent-play-selector-btn"));
    fireEvent.click(screen.getByRole("button", { name: /Spread 2x1 - Verticals/ }));

    expect(handleChange).toHaveBeenCalled();
    const withSchemePlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    rerender(
      <PlayCanvas
        play={withSchemePlay}
        onChange={handleChange}
        playbook={mockDefensePlaybook}
        allPlaybooks={[mockDefensePlaybook, mockOffensePlaybook]}
      />
    );

    // Opponent scheme is now active
    expect(screen.getByTestId("opponent-play-selector-btn")).toHaveTextContent("Spread 2x1 - Verticals");

    // 2. Open opponent plays menu and select 'No Opposing Play'
    fireEvent.click(screen.getByTestId("opponent-play-selector-btn"));
    const noPlayBtn = screen.getByTestId("no-opponent-play-btn");
    expect(noPlayBtn).toBeInTheDocument();
    fireEvent.click(noPlayBtn);

    expect(handleChange).toHaveBeenCalled();
    const clearedPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;

    // The opposing offensive players have no routes or play scheme attached
    const clearedOffense = clearedPlay.players.filter((p) => p.side === "offense");
    for (const player of clearedOffense) {
      expect(player.route || []).toHaveLength(0);
    }
  });

  it("supports freeform shade and cushion depth in man coverage without requiring choices", () => {
    const handleChange = vi.fn();
    const defensePlay: PlayDiagram = {
      id: "def-freeform-test",
      teamId: "team_apex",
      name: "Freeform Man Test",
      type: "defense",
      formation: "Base",
      situation: "Standard",
      losY: 65,
      players: [
        { id: "cb-1", side: "defense", label: "CB", role: "Cornerback", x: 22, y: 52 },
        { id: "wr-x", side: "offense", label: "X", role: "Wide Receiver", x: 20, y: 65 },
      ],
    };

    const { rerender } = render(
      <PlayCanvas
        play={defensePlay}
        onChange={handleChange}
        playbook={mockDefensePlaybook}
        allPlaybooks={[mockDefensePlaybook]}
      />
    );

    // Select defender
    fireEvent.click(screen.getByRole("button", { name: /CB/i }));
    // Switch to man coverage
    fireEvent.click(screen.getByRole("button", { name: /Man/i }));

    const manPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    rerender(
      <PlayCanvas
        play={manPlay}
        onChange={handleChange}
        playbook={mockDefensePlaybook}
        allPlaybooks={[mockDefensePlaybook]}
      />
    );

    // Controls display optional status
    expect(screen.getByText("Alignment Shade (Optional)")).toBeInTheDocument();
    expect(screen.getByText("Cushion Depth (Optional)")).toBeInTheDocument();
    expect(screen.getByTestId("shade-freeform")).toBeInTheDocument();
    expect(screen.getByTestId("cushion-freeform")).toBeInTheDocument();

    // Select Freeform shade
    fireEvent.click(screen.getByTestId("shade-freeform"));
    const freeformShadePlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const cbWithFreeformShade = freeformShadePlay.players.find((p) => p.id === "cb-1");
    expect(cbWithFreeformShade?.shade).toBeUndefined();

    // Select Freeform cushion
    rerender(
      <PlayCanvas
        play={freeformShadePlay}
        onChange={handleChange}
        playbook={mockDefensePlaybook}
        allPlaybooks={[mockDefensePlaybook]}
      />
    );
    fireEvent.click(screen.getByTestId("cushion-freeform"));
    const freeformCushionPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const cbWithFreeformCushion = freeformCushionPlay.players.find((p) => p.id === "cb-1");
    expect(cbWithFreeformCushion?.cushionYards).toBeUndefined();
  });

  it("displays SINGLE COVERAGE tag during simulation for receivers in man coverage instead of calculating open/covered", () => {
    const playWithManAndZone: PlayDiagram = {
      id: "play-sim-man",
      teamId: "team_apex",
      name: "Sim Test Play",
      type: "offense",
      formation: "Trips Right",
      situation: "Standard",
      losY: 65,
      players: [
        {
          id: "off-wr1",
          side: "offense",
          label: "WR1",
          role: "Wide Receiver",
          x: 20,
          y: 65,
          route: [
            { x: 20, y: 65 },
            { x: 20, y: 35 },
          ],
        },
        {
          id: "off-wr2",
          side: "offense",
          label: "WR2",
          role: "Wide Receiver",
          x: 80,
          y: 65,
          route: [
            { x: 80, y: 65 },
            { x: 80, y: 35 },
          ],
        },
        // Defender 1 is in man coverage on WR1
        {
          id: "def-cb1",
          side: "defense",
          label: "CB1",
          role: "Cornerback",
          x: 20,
          y: 55,
          coverageType: "man",
          manTargetId: "off-wr1",
        },
        // Defender 2 is deep safety in zone coverage on right side
        {
          id: "def-fs",
          side: "defense",
          label: "FS",
          role: "Safety",
          x: 50,
          y: 40,
          coverageType: "zone",
        },
      ],
    };

    render(
      <PlayCanvas
        play={playWithManAndZone}
        onChange={vi.fn()}
        playbook={mockOffensePlaybook}
        allPlaybooks={[mockDefensePlaybook, mockOffensePlaybook]}
      />
    );

    // Turn Opponent On
    fireEvent.click(screen.getByTestId("toggle-opponent-btn"));

    // Run Play
    fireEvent.click(screen.getByText("Run Play"));

    // WR1 is man-covered -> displays single-coverage tag
    expect(screen.getByTestId("single-coverage-off-wr1")).toBeInTheDocument();
    expect(screen.getByText("SINGLE COVERAGE")).toBeInTheDocument();
    expect(screen.queryByTestId("open-receiver-off-wr1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("covered-receiver-off-wr1")).not.toBeInTheDocument();

    // WR2 is not man-covered and far from defenders -> displays open receiver
    expect(screen.getByTestId("open-receiver-off-wr2")).toBeInTheDocument();
  });
});

