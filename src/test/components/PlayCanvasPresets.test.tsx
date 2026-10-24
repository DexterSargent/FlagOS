import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlayCanvas from "@/components/playbook/PlayCanvas";
import { PlayDiagram } from "@/lib/playbookTypes";
import { createDefaultPlaybooks } from "@/lib/playbookTypes";

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

// The route catalog drawer is lazy-loaded, so wait for its chunk after opening it.
async function applyCatalogRoute(shortName: string) {
  if (!screen.queryByTestId("route-presets-catalog")) {
    fireEvent.click(screen.getByTestId("route-presets-toggle"));
  }
  fireEvent.click(await screen.findByTestId(`catalog-route-${shortName}`));
}

function applyMotion(shortName: string) {
  if (!screen.queryByTestId("motion-menu")) {
    fireEvent.click(screen.getByTestId("toggle-motion-btn"));
  }
  fireEvent.click(screen.getByTestId(`quick-route-${shortName}-motion`));
}

describe("Man coverage animation", () => {
  function position(container: HTMLElement, label: string) {
    const text = [...container.querySelectorAll("svg text")].find((node) => node.textContent === label)!;
    const badge = text.parentElement!.querySelector('circle[r="18"]')!;
    return { x: Number(badge.getAttribute("cx")) / 10, y: Number(badge.getAttribute("cy")) / 7 };
  }

  const receiver = {
    ...mockOffensePlay.players[2],
    route: [{ x: 15, y: 50 }, { x: 50, y: 50 }],
  };
  const defender = {
    ...mockDefensePlay.players.find((player) => player.id === "p_cb1")!,
    coverageType: "man" as const,
    manTargetId: receiver.id,
    route: [{ x: 90, y: 10 }],
  };

  it.each([0, 0.25, 0.5, 0.75, 1])("mirrors the receiver exactly at timeline progress %s", (progress) => {
    const play = { ...mockDefensePlay, players: [receiver, defender] };
    const { container } = render(<PlayCanvas play={play} onChange={vi.fn()} />);
    const toggle = screen.queryByTitle("Show opposing offense");
    if (toggle) fireEvent.click(toggle);
    fireEvent.change(screen.getByRole("slider", { name: "Animation timeline" }), { target: { value: progress } });
    const recPos = position(container, "X");
    const dbPos = position(container, "CB1");
    expect(dbPos.x - recPos.x).toBeCloseTo(defender.x - receiver.x);
    expect(dbPos.y - recPos.y).toBeCloseTo(defender.y - receiver.y);
    if (progress > 0) expect(dbPos).not.toEqual({ x: defender.x, y: defender.y });
  });

  it.each([0.175, 0.35, 0.675, 1])("mirrors pre-snap motion and the post-snap route at %s", (progress) => {
    const motionReceiver = { ...receiver, motionPath: [{ x: 35, y: 70 }], motionName: "Jet Motion" };
    const play = { ...mockDefensePlay, players: [motionReceiver, defender] };
    const { container } = render(<PlayCanvas play={play} onChange={vi.fn()} />);
    const toggle = screen.queryByTitle("Show opposing offense");
    if (toggle) fireEvent.click(toggle);
    fireEvent.change(screen.getByRole("slider", { name: "Animation timeline" }), { target: { value: progress } });
    const recPos = position(container, "X");
    const dbPos = position(container, "CB1");
    expect(dbPos.x - recPos.x).toBeCloseTo(defender.x - receiver.x);
    expect(dbPos.y - recPos.y).toBeCloseTo(defender.y - receiver.y);
  });

  it("preserves normal routing for an unresolved or defensive man target", () => {
    const play = { ...mockDefensePlay, players: [receiver, { ...defender, manTargetId: "missing" }] };
    const { container, rerender } = render(<PlayCanvas play={play} onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("slider", { name: "Animation timeline" }), { target: { value: 1 } });
    expect(position(container, "CB1")).toEqual({ x: 90, y: 10 });
    rerender(<PlayCanvas play={{ ...play, players: [receiver, { ...defender, manTargetId: defender.id }] }} onChange={vi.fn()} />);
    expect(position(container, "CB1")).toEqual({ x: 90, y: 10 });
  });
});

describe("PlayCanvas Route Presets Suite", () => {
  it("moves plays between custom categories without resetting player alignments or routes", () => {
    const book = { ...createDefaultPlaybooks("falcons")[0], formationsAreCategories: true, formations: [{ id: "run", name: "Run", side: "offense" as const }, { id: "pass", name: "Pass", side: "offense" as const }], plays: [mockOffensePlay] };
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

  it("keeps routes and motion behind two menu buttons instead of a sliding ribbon", async () => {
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
    expect(await screen.findByTestId("catalog-route-slant")).toBeDefined();
    expect(screen.getByTestId("catalog-route-out")).toBeDefined();
  });

  it("keeps motions in the Motion menu and only post-snap routes in the route tree", async () => {
    render(<PlayCanvas play={mockOffensePlay} onChange={vi.fn()} />);

    fireEvent.click(screen.getByTestId("toggle-motion-btn"));
    for (const motion of ["jet", "orbit", "shift", "return"]) {
      expect(screen.getByTestId(`quick-route-${motion}-motion`)).toBeDefined();
    }

    fireEvent.click(screen.getByTestId("route-presets-toggle"));
    const catalog = await screen.findByTestId("route-presets-catalog");
    expect(catalog.textContent).not.toMatch(/Jet Motion|Orbit Motion|Shift \/ Re-align|Return Motion|Motion/);
    expect(screen.getByTestId("catalog-route-drag")).toBeDefined();
  });

  it("lets the coach switch receivers without leaving the route menu", async () => {
    render(<PlayCanvas play={mockOffensePlay} onChange={vi.fn()} />);

    fireEvent.click(screen.getByTestId("route-presets-toggle"));
    await screen.findByTestId("route-presets-catalog");

    fireEvent.mouseDown(screen.getByRole("button", { name: "Select Y" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Y" }));
    expect(screen.getByTestId("route-presets-catalog")).toBeInTheDocument();
    expect(screen.getByText("Route Assignment (Y):")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("button", { name: "Switch to Z" }));
    fireEvent.click(screen.getByRole("button", { name: "Switch to Z" }));
    expect(screen.getByTestId("route-presets-catalog")).toBeInTheDocument();
    expect(screen.getByText("Route Assignment (Z):")).toBeInTheDocument();
  });

  it("adjusts route depth from the vertical rail beside the field", () => {
    const handleChange = vi.fn();
    const slantX = {
      ...mockOffensePlay,
      players: mockOffensePlay.players.map((p) =>
        p.id === "p_x" ? { ...p, quickRouteName: "Slant", route: [{ x: 15, y: 63 }, { x: 29, y: 52.5 }] } : p
      ),
    };
    render(<PlayCanvas play={slantX} onChange={handleChange} />);

    const rail = screen.getByRole("slider", { name: "Route depth in yards" });
    expect(rail).toHaveAttribute("aria-orientation", "vertical");
    expect(rail).toHaveAttribute("aria-valuenow", "4");
    fireEvent.keyDown(rail, { key: "ArrowUp" });

    const updated = handleChange.mock.lastCall![0] as PlayDiagram;
    const x = updated.players.find((p) => p.id === "p_x")!;
    expect(x.quickRouteName).toBe("Slant");
    expect(x.routeDepthYards).toBe(5);
    expect(x.route?.[0].y).toBeCloseTo(70 - 5 * 1.75, 1);
  });

  it("does not auto-select a receiver after clicking empty field space", () => {
    render(<PlayCanvas play={mockOffensePlay} onChange={vi.fn()} />);

    expect(screen.getByText("Route Assignment (X):")).toBeInTheDocument();
    const svg = screen.getByTestId("designer-field").querySelector("svg") as SVGSVGElement;
    fireEvent.pointerDown(svg, { clientX: 500, clientY: 350 });

    expect(screen.queryByText(/Route Assignment/)).not.toBeInTheDocument();
  });

  it("applies a route at a custom depth", async () => {
    const handleChange = vi.fn();
    render(<PlayCanvas play={mockOffensePlay} onChange={handleChange} />);

    fireEvent.click(screen.getByTestId("route-presets-toggle"));
    fireEvent.click(await screen.findByLabelText("Increase route depth"));
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

  it("applies a route preset when clicking a quick-route button", async () => {
    const handleChange = vi.fn();
    render(<PlayCanvas play={mockOffensePlay} onChange={handleChange} />);

    await applyCatalogRoute("slant");

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

  it("toggles the route presets catalog drawer without clipping", async () => {
    const handleChange = vi.fn();
    render(<PlayCanvas play={mockOffensePlay} onChange={handleChange} />);

    // Initially catalog is closed
    expect(screen.queryByTestId("route-presets-catalog")).toBeNull();

    // Click toggle button
    const toggleBtn = screen.getByTestId("route-presets-toggle");
    fireEvent.click(toggleBtn);

    // Catalog should now be visible inline
    const catalog = await screen.findByTestId("route-presets-catalog");
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

  it("preserves pre-snap motion when applying a route preset and runs route from motion endpoint", async () => {
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
    await applyCatalogRoute("slant");

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

  it("re-anchors existing route preset to start from motion endpoint when pre-snap motion is added", async () => {
    const handleChange = vi.fn();
    const { rerender } = render(<PlayCanvas play={mockOffensePlay} onChange={handleChange} />);

    // 1. Give player a route preset first (e.g. Slant)
    await applyCatalogRoute("slant");

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

  it("allows defining receiver shade in man coverage and adjusts beginning point", () => {
    const handleChange = vi.fn();
    const initialPlay: PlayDiagram = {
      ...mockDefensePlay,
      players: mockDefensePlay.players.map((p) =>
        p.id === "p_cb1" ? { ...p, coverageType: "zone" } : p
      ),
    };

    const { rerender } = render(<PlayCanvas play={initialPlay} onChange={handleChange} />);

    // Select CB1
    const cb1Btn = screen.getByRole("button", { name: /CB1/i });
    fireEvent.click(cb1Btn);

    // Click "Man" coverage button
    fireEvent.click(screen.getByRole("button", { name: /Man/i }));

    const manPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const manCb1 = manPlay.players.find((p) => p.id === "p_cb1");
    expect(manCb1?.coverageType).toBe("man");

    // Re-render with man coverage active
    rerender(<PlayCanvas play={manPlay} onChange={handleChange} />);

    // Check that Receiver selector and Shade buttons are visible
    expect(screen.getByTestId("man-coverage-controls")).toBeDefined();
    expect(screen.getByTestId("shade-inside")).toBeDefined();
    expect(screen.getByTestId("shade-head_up")).toBeDefined();
    expect(screen.getByTestId("shade-outside")).toBeDefined();

    // 1. Choose Receiver X (p_x is at x: 15, y: 70)
    fireEvent.click(screen.getByTestId("man-receiver-x"));

    const targetedPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const targetedCb1 = targetedPlay.players.find((p) => p.id === "p_cb1");
    expect(targetedCb1?.manTargetId).toBe("p_x");
    // Default shade is head_up -> x should be exactly receiver X (15)
    expect(targetedCb1?.x).toBe(15);

    // Re-render with targeted play
    rerender(<PlayCanvas play={targetedPlay} onChange={handleChange} />);

    // 2. Select Inside Shade
    // Receiver X is left of center (15 < 50), so inside shade shifts toward center (15 + 2.8 = 17.8)
    fireEvent.click(screen.getByTestId("shade-inside"));

    const insidePlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const insideCb1 = insidePlay.players.find((p) => p.id === "p_cb1");
    expect(insideCb1?.shade).toBe("inside");
    expect(insideCb1?.x).toBe(17.8);

    // Re-render with inside shade
    rerender(<PlayCanvas play={insidePlay} onChange={handleChange} />);
    expect(screen.getByTestId("receiver-shaded-half-p_x-right")).toBeDefined();

    // 3. Select Outside Shade
    // Receiver X is left of center (15 < 50), so outside shade shifts toward sideline (15 - 2.8 = 12.2)
    fireEvent.click(screen.getByTestId("shade-outside"));

    const outsidePlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const outsideCb1 = outsidePlay.players.find((p) => p.id === "p_cb1");
    expect(outsideCb1?.shade).toBe("outside");
    expect(outsideCb1?.x).toBe(12.2);

    // Re-render with outside shade
    rerender(<PlayCanvas play={outsidePlay} onChange={handleChange} />);
    // Outside shade on left receiver (15 < 50) darkens the outside/left half of the receiver badge
    expect(screen.getByTestId("receiver-shaded-half-p_x-left")).toBeDefined();

    // 4. Select Head Up
    // Should align directly over receiver X (15)
    fireEvent.click(screen.getByTestId("shade-head_up"));

    const headUpPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const headUpCb1 = headUpPlay.players.find((p) => p.id === "p_cb1");
    expect(headUpCb1?.shade).toBe("head_up");
    expect(headUpCb1?.x).toBe(15);

    // Re-render with head up -> no half is darkened
    rerender(<PlayCanvas play={headUpPlay} onChange={handleChange} />);
    expect(screen.queryByTestId("receiver-shaded-half-p_x-right")).toBeNull();
    expect(screen.queryByTestId("receiver-shaded-half-p_x-left")).toBeNull();

    // 5. Cushion Depth Controls
    expect(screen.getByTestId("cushion-depth-controls")).toBeDefined();

    // Select Press cushion (1 yard)
    fireEvent.click(screen.getByTestId("cushion-preset-1"));
    const pressPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const pressCb1 = pressPlay.players.find((p) => p.id === "p_cb1");
    expect(pressCb1?.cushionYards).toBe(1);
    expect(pressCb1?.y).toBe(68.3); // 70 - 1.75 = 68.25 -> 68.3

    // Select Soft cushion (7 yards)
    fireEvent.click(screen.getByTestId("cushion-preset-7"));
    const softPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const softCb1 = softPlay.players.find((p) => p.id === "p_cb1");
    expect(softCb1?.cushionYards).toBe(7);
    expect(softCb1?.y).toBe(57.8); // 70 - (7 * 1.75) = 57.75 -> 57.8
  });

  describe("Automatic Assignment Notes in Play and Player Notes", () => {
    it("automatically populates '8yd Dig' in player notes and play notes when Dig / In route is set to 8yds depth", async () => {
      const handleChange = vi.fn();
      const digPlay: PlayDiagram = {
        ...mockOffensePlay,
        players: mockOffensePlay.players.map((p) =>
          p.id === "p_x"
            ? { ...p, quickRouteName: "Dig / In", routeDepthYards: 9, route: [{ x: 15, y: 54 }, { x: 30, y: 54 }] }
            : p
        ),
      };

      const { rerender } = render(<PlayCanvas play={digPlay} onChange={handleChange} />);

      // Select Receiver X
      const xBtn = screen.getByRole("button", { name: "Select X" });
      fireEvent.click(xBtn);

      // Decrease depth from 9 to 8
      const decreaseBtn = screen.getByLabelText("Decrease route depth");
      fireEvent.click(decreaseBtn);

      expect(handleChange).toHaveBeenCalled();
      const finalPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
      const finalX = finalPlay.players.find((p) => p.id === "p_x");

      // Expect player's note to be '8yd Dig'
      expect(finalX?.notes).toBe("8yd Dig");

      // Expect play notes to contain '• X: 8yd Dig'
      expect(finalPlay.notes).toContain("Assignments:");
      expect(finalPlay.notes).toContain("• X: 8yd Dig");
    });

    it("automatically populates 'Man inside shade, 5yds off' when defender selects man inside shade with 5yds cushion", () => {
      const handleChange = vi.fn();
      const { rerender } = render(<PlayCanvas play={mockDefensePlay} onChange={handleChange} />);

      // Select CB1
      const cb1Btn = screen.getByRole("button", { name: /CB1/i });
      fireEvent.click(cb1Btn);

      // Click Man coverage
      fireEvent.click(screen.getByRole("button", { name: /Man/i }));
      const manPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
      rerender(<PlayCanvas play={manPlay} onChange={handleChange} />);

      // Select Receiver X
      fireEvent.click(screen.getByTestId("man-receiver-x"));
      const targetedPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
      rerender(<PlayCanvas play={targetedPlay} onChange={handleChange} />);

      // Select Inside shade
      fireEvent.click(screen.getByTestId("shade-inside"));
      const shadePlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
      rerender(<PlayCanvas play={shadePlay} onChange={handleChange} />);

      // Select 5yds cushion
      fireEvent.click(screen.getByTestId("cushion-preset-5"));
      const finalPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
      const finalCb1 = finalPlay.players.find((p) => p.id === "p_cb1");

      // Expect defender's note to reflect man inside shade, 5yds off
      expect(finalCb1?.notes).toContain("Man inside shade, 5yds off");

      // Expect play notes to contain the assignment
      expect(finalPlay.notes).toContain("Assignments:");
      expect(finalPlay.notes).toContain("• CB1: Man inside shade, 5yds off");
    });
  });
});
