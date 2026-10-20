import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlayCanvas from "@/components/playbook/PlayCanvas";
import { PlayDiagram } from "@/lib/playbookTypes";
import { createYorkOffensivePlaybook } from "@/lib/yorkOffensivePlaybook";

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    settings: {
      leagueName: "FlagOS League",
      rules: { playersOnField: 5 },
    },
    isDemoLeague: false,
  }),
}));

const mockOffensePlay: PlayDiagram = {
  id: "test_play_1",
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
  notes: "Primary read is X on quick slant",
};

const mockDefensePlay: PlayDiagram = {
  ...mockOffensePlay,
  id: "test_defense_play_1",
  name: "Cover 2 Shell",
  type: "defense",
  formation: "Cover 2 Zone",
  players: [
    ...mockOffensePlay.players,
    { id: "p_rush", label: "RUSH", role: "Pass Rusher", side: "defense", x: 50, y: 57, coverageType: "rush", routeType: "rush", route: [{ x: 50, y: 79 }] },
    { id: "p_cb1", label: "CB1", role: "Cornerback Left", side: "defense", x: 18, y: 62, coverageType: "zone", route: [] },
    { id: "p_cb2", label: "CB2", role: "Cornerback Right", side: "defense", x: 82, y: 62, coverageType: "zone", route: [] },
    { id: "p_fs", label: "FS", role: "Free Safety", side: "defense", x: 34, y: 54, coverageType: "zone", route: [] },
    { id: "p_ss", label: "SS", role: "Strong Safety", side: "defense", x: 66, y: 54, coverageType: "zone", route: [] },
  ],
  zones: [],
};

function applyCatalogRoute(shortName: string) {
  if (!screen.queryByTestId("route-presets-catalog")) {
    fireEvent.click(screen.getByTestId("route-presets-toggle"));
  }
  fireEvent.click(screen.getByTestId(`catalog-route-${shortName}`));
}

function applyMotion(shortName: string) {
  if (!screen.queryByTestId("motion-menu")) {
    fireEvent.click(screen.getByTestId("toggle-motion-btn"));
  }
  fireEvent.click(screen.getByTestId(`quick-route-${shortName}-motion`));
}

describe("PlayCanvas Route Presets Suite", () => {
  it("moves York plays between OC categories without resetting player alignments or routes", () => {
    const book = createYorkOffensivePlaybook("york_lions");
    const play = book.plays[0];
    const onChange = vi.fn();
    render(<PlayCanvas play={play} onChange={onChange} playbook={book} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Play formation" }), { target: { value: "Pass" } });
    const updated = onChange.mock.calls.at(-1)?.[0] as PlayDiagram;
    expect(updated.formation).toBe("Pass");
    expect(updated.players).toBe(play.players);
    expect(screen.queryByRole("option", { name: "Spread 2x1" })).not.toBeInTheDocument();
  });

  it("exposes named controls and the selected player for keyboard and touch users", () => {
    render(<PlayCanvas play={mockOffensePlay} onChange={vi.fn()} />);

    expect(screen.getByRole("textbox", { name: "Play name" })).toHaveValue(mockOffensePlay.name);
    expect(screen.getByRole("combobox", { name: "Play situation" })).toHaveValue("Standard");
    expect(screen.getByRole("button", { name: "Select X" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Select Y" }));
    expect(screen.getByRole("button", { name: "Select Y" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("textbox", { name: "Y coaching notes" })).toBeInTheDocument();
  });

  it("keeps routes and motion behind two menu buttons instead of a sliding ribbon", () => {
    render(<PlayCanvas play={mockOffensePlay} onChange={vi.fn()} />);

    expect(screen.queryByTestId("quick-route-slant")).toBeNull();
    expect(screen.queryByTestId("quick-route-jet-motion")).toBeNull();
    expect(screen.queryByText("Pre-snap motion")).toBeNull();

    fireEvent.click(screen.getByTestId("toggle-motion-btn"));
    expect(screen.getByTestId("motion-menu")).toBeDefined();
    expect(screen.getByTestId("quick-route-jet-motion")).toBeDefined();
    expect(screen.getByTestId("quick-route-orbit-motion")).toBeDefined();

    fireEvent.click(screen.getByTestId("route-presets-toggle"));
    expect(screen.queryByTestId("motion-menu")).toBeNull();
    expect(screen.getByTestId("catalog-route-slant")).toBeDefined();
    expect(screen.getByTestId("catalog-route-out")).toBeDefined();
  });

  it("does not auto-select a receiver after clicking empty field space", () => {
    render(<PlayCanvas play={mockOffensePlay} onChange={vi.fn()} />);

    expect(screen.getByText("Route Assignment (X):")).toBeInTheDocument();
    const svg = screen.getByTestId("designer-field").querySelector("svg") as SVGSVGElement;
    fireEvent.pointerDown(svg, { clientX: 500, clientY: 350 });

    expect(screen.queryByText(/Route Assignment/)).not.toBeInTheDocument();
  });

  it("applies a route at a custom depth", () => {
    const handleChange = vi.fn();
    render(<PlayCanvas play={mockOffensePlay} onChange={handleChange} />);

    fireEvent.click(screen.getByTestId("route-presets-toggle"));
    fireEvent.click(screen.getByLabelText("Increase route depth"));
    fireEvent.click(screen.getByLabelText("Increase route depth"));
    fireEvent.click(screen.getByTestId("catalog-route-out"));

    const updatedPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const outPlayer = updatedPlay.players.find((p) => p.quickRouteName === "Out");
    // Default Out depth is 5 yds, +2 = 7 yds
    expect(outPlayer?.routeDepthYards).toBe(7);
    expect(outPlayer?.route?.[0].y).toBeCloseTo(70 - 7 * 1.75, 1);
  });

  it("keeps the field and assignment controls in one workspace", () => {
    render(<PlayCanvas play={mockOffensePlay} onChange={vi.fn()} />);

    expect(screen.getByTestId("designer-field-pane")).toBeInTheDocument();
    expect(screen.getByTestId("designer-field")).toBeInTheDocument();
    expect(screen.getByTestId("designer-assignments-pane")).toBeInTheDocument();
    expect(screen.queryByTestId("designer-pane-field")).not.toBeInTheDocument();
    expect(screen.queryByTestId("designer-pane-assignments")).not.toBeInTheDocument();
  });

  it("selects a defender when switching from an offense play to a defense play", () => {
    const { rerender } = render(<PlayCanvas play={mockOffensePlay} onChange={vi.fn()} />);

    expect(screen.getByText("Route Assignment (X):")).toBeInTheDocument();

    rerender(<PlayCanvas play={mockDefensePlay} onChange={vi.fn()} />);

    expect(screen.getByText("Coverage & Assignment (RUSH):")).toBeInTheDocument();
    expect(screen.queryByText(/Route Assignment/)).not.toBeInTheDocument();
  });

  it("applies a route preset when clicking a quick-route button", () => {
    const handleChange = vi.fn();
    render(<PlayCanvas play={mockOffensePlay} onChange={handleChange} />);

    applyCatalogRoute("slant");

    expect(handleChange).toHaveBeenCalled();
    const updatedPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const modifiedPlayer = updatedPlay.players.find((p) => p.quickRouteName === "Slant");
    expect(modifiedPlayer).toBeDefined();
    expect(modifiedPlayer?.route && modifiedPlayer.route.length > 0).toBe(true);
  });

  it("indicates and toggles pre-snap motion on offensive players", () => {
    const handleChange = vi.fn();
    render(<PlayCanvas play={mockOffensePlay} onChange={handleChange} />);

    applyMotion("jet");

    expect(handleChange).toHaveBeenCalled();
    const updatedPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const motionPlayer = updatedPlay.players.find((p) => p.routeType === "motion");
    expect(motionPlayer).toBeDefined();
    expect(motionPlayer?.quickRouteName).toBe("Jet Motion");
    expect(motionPlayer?.route && motionPlayer.route.length > 0).toBe(true);
  });

  it("applies a pre-snap motion preset from the motion menu", () => {
    const handleChange = vi.fn();
    render(<PlayCanvas play={mockOffensePlay} onChange={handleChange} />);

    applyMotion("jet");

    expect(handleChange).toHaveBeenCalled();
    const updatedPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const jetPlayer = updatedPlay.players.find((p) => p.quickRouteName === "Jet Motion");
    expect(jetPlayer).toBeDefined();
    expect(jetPlayer?.routeType).toBe("motion");
  });

  it("assigns QB spy as a distinct defensive responsibility", () => {
    const handleChange = vi.fn();
    render(<PlayCanvas play={mockDefensePlay} onChange={handleChange} />);

    expect(screen.queryByTestId("coverage-qb-spy")).toBeNull();
    fireEvent.click(screen.getByTestId("coverage-category-special"));
    fireEvent.click(screen.getByTestId("coverage-qb-spy"));

    const updatedPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const spyPlayer = updatedPlay.players.find((p) => p.id === "p_rush");
    expect(spyPlayer?.coverageType).toBe("spy");
    expect(spyPlayer?.routeType).toBeUndefined();
    expect(spyPlayer?.zoneId).toBeDefined();
  });

  it("clears pass-rush routing when a defender is reassigned to a zone", () => {
    const handleChange = vi.fn();
    render(<PlayCanvas play={mockDefensePlay} onChange={handleChange} />);

    fireEvent.click(screen.getByTestId("coverage-deep-half-l"));

    const updatedPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const defender = updatedPlay.players.find((p) => p.id === "p_rush");
    expect(defender?.coverageType).toBe("zone");
    expect(defender?.routeType).toBeUndefined();
  });

  it("replaces a defender's old zone while preserving unassigned custom bubbles", () => {
    const onChange = vi.fn();
    const { rerender } = render(<PlayCanvas play={mockDefensePlay} onChange={onChange} />);
    fireEvent.click(screen.getByTestId("coverage-deep-half-l"));
    const assigned = onChange.mock.lastCall![0] as PlayDiagram;
    const oldZone = assigned.zones![0];
    const customZone = { ...oldZone, id: "custom-zone", name: "Custom Landmark" };
    rerender(<PlayCanvas play={{ ...assigned, zones: [...assigned.zones!, customZone] }} onChange={onChange} />);
    fireEvent.click(screen.getByTestId("coverage-deep-half-r"));
    const updated = onChange.mock.lastCall![0] as PlayDiagram;
    expect(updated.zones?.some((zone) => zone.id === oldZone.id)).toBe(false);
    expect(updated.zones?.some((zone) => zone.id === customZone.id)).toBe(true);
    expect(updated.zones).toHaveLength(2);
    const defender = updated.players.find((player) => player.id === "p_rush")!;
    expect(updated.zones?.some((zone) => zone.id === defender.zoneId)).toBe(true);
    rerender(<PlayCanvas play={updated} onChange={onChange} />);
    expect(screen.getByTestId("coverage-deep-half-r")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("coverage-deep-half-l")).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps an old zone when another defender still uses it", () => {
    const onChange = vi.fn();
    const { rerender } = render(<PlayCanvas play={mockDefensePlay} onChange={onChange} />);
    fireEvent.click(screen.getByTestId("coverage-deep-half-l"));
    const assigned = onChange.mock.lastCall![0] as PlayDiagram;
    const oldZone = assigned.zones![0];
    const shared = {
      ...assigned,
      players: assigned.players.map((player) => player.id === "p_cb1" ? { ...player, zoneId: oldZone.id } : player),
    };
    rerender(<PlayCanvas play={shared} onChange={onChange} />);
    fireEvent.click(screen.getByTestId("coverage-deep-half-r"));
    const updated = onChange.mock.lastCall![0] as PlayDiagram;
    expect(updated.zones?.some((zone) => zone.id === oldZone.id)).toBe(true);
    expect(updated.zones).toHaveLength(2);
  });

  it.each(["Man", "Rush", "Zone"])("removes the previous zone when switching to %s", (assignment) => {
    const onChange = vi.fn();
    const { rerender } = render(<PlayCanvas play={mockDefensePlay} onChange={onChange} />);
    fireEvent.click(screen.getByTestId("coverage-deep-half-l"));
    const assigned = onChange.mock.lastCall![0] as PlayDiagram;
    rerender(<PlayCanvas play={assigned} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: assignment === "Rush" ? /Rush.*yd/ : assignment }));
    expect((onChange.mock.lastCall![0] as PlayDiagram).zones).toHaveLength(0);
  });

  it("toggles the route presets catalog drawer without clipping", () => {
    const handleChange = vi.fn();
    render(<PlayCanvas play={mockOffensePlay} onChange={handleChange} />);

    // Initially catalog is closed
    expect(screen.queryByTestId("route-presets-catalog")).toBeNull();

    // Click toggle button
    const toggleBtn = screen.getByTestId("route-presets-toggle");
    fireEvent.click(toggleBtn);

    // Catalog should now be visible inline
    const catalog = screen.getByTestId("route-presets-catalog");
    expect(catalog).toBeDefined();
    expect(screen.getByText("Route Tree & Team Presets Catalog")).toBeDefined();

    // Clicking a route inside catalog applies it
    const catalogPostBtn = screen.getByTestId("catalog-route-post");
    fireEvent.click(catalogPostBtn);
    expect(handleChange).toHaveBeenCalled();

    const updatedPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const postPlayer = updatedPlay.players.find((p) => p.quickRouteName === "Post");
    expect(postPlayer).toBeDefined();
  });

  it("preserves pre-snap motion when applying a route preset and runs route from motion endpoint", () => {
    const handleChange = vi.fn();
    const { rerender } = render(<PlayCanvas play={mockOffensePlay} onChange={handleChange} />);

    // 1. Put receiver in motion
    applyMotion("jet");

    expect(handleChange).toHaveBeenCalled();
    const motionPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const motionPlayer = motionPlay.players.find((p) => p.hasMotion || p.routeType === "motion");
    expect(motionPlayer).toBeDefined();
    expect(motionPlayer?.hasMotion).toBe(true);
    expect(motionPlayer?.motionPath && motionPlayer.motionPath.length > 0).toBe(true);

    // Re-render with updated play so state reflects the motion
    rerender(<PlayCanvas play={motionPlay} onChange={handleChange} />);

    // 2. Now apply a route preset (Slant) to the motion receiver
    applyCatalogRoute("slant");

    expect(handleChange).toHaveBeenCalled();
    const routedPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const playerWithBoth = routedPlay.players.find((p) => p.id === motionPlayer?.id);

    // Verify motion was NOT undone!
    expect(playerWithBoth?.hasMotion).toBe(true);
    expect(playerWithBoth?.motionPath && playerWithBoth.motionPath.length > 0).toBe(true);
    expect(playerWithBoth?.quickRouteName).toBe("Slant");

    // Verify route starts from the terminal waypoint of motion, NOT alignment (player.x, player.y)
    const motionEnd = playerWithBoth!.motionPath![playerWithBoth!.motionPath!.length - 1];
    expect(playerWithBoth?.route && playerWithBoth.route.length > 0).toBe(true);
    // Route starting waypoint matches motion endpoint
    expect(playerWithBoth!.route![0].x).toBe(motionEnd.x);
    expect(playerWithBoth!.route![0].x).not.toBe(playerWithBoth!.x);
  });

  it("re-anchors existing route preset to start from motion endpoint when pre-snap motion is added", () => {
    const handleChange = vi.fn();
    const { rerender } = render(<PlayCanvas play={mockOffensePlay} onChange={handleChange} />);

    // 1. Give player a route preset first (e.g. Slant)
    applyCatalogRoute("slant");

    const playWithSlant = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const slantedPlayer = playWithSlant.players.find((p) => p.quickRouteName === "Slant");
    expect(slantedPlayer).toBeDefined();
    expect(slantedPlayer?.route![0].x).toBe(slantedPlayer!.x); // initially starts at alignment

    // Re-render with slanted player
    rerender(<PlayCanvas play={playWithSlant} onChange={handleChange} />);

    // 2. Now toggle motion ON for that receiver
    applyMotion("jet");

    const finalPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const finalPlayer = finalPlay.players.find((p) => p.id === slantedPlayer!.id);

    // Player now has both motion and route!
    expect(finalPlayer?.hasMotion).toBe(true);
    expect(finalPlayer?.motionPath && finalPlayer.motionPath.length > 0).toBe(true);
    expect(finalPlayer?.quickRouteName).toBe("Slant");

    // Route is now re-anchored from motion endpoint!
    const motionEnd = finalPlayer!.motionPath![finalPlayer!.motionPath!.length - 1];
    expect(finalPlayer!.route![0].x).toBe(motionEnd.x);
    expect(finalPlayer!.route![0].x).not.toBe(finalPlayer!.x);
  });
});
