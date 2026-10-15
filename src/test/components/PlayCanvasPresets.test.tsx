import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlayCanvas from "@/components/playbook/PlayCanvas";
import { PlayDiagram } from "@/lib/playbookTypes";

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

describe("PlayCanvas Route Presets Suite", () => {
  it("renders the 1-click quick-route ribbon for offensive receivers", () => {
    const handleChange = vi.fn();
    render(<PlayCanvas play={mockOffensePlay} onChange={handleChange} />);

    // Quick route buttons should be immediately accessible
    expect(screen.getByTestId("quick-route-slant")).toBeDefined();
    expect(screen.getByTestId("quick-route-out")).toBeDefined();
    expect(screen.getByTestId("quick-route-post")).toBeDefined();
    expect(screen.getByTestId("quick-route-corner")).toBeDefined();
    expect(screen.getByTestId("quick-route-go")).toBeDefined();
    expect(screen.getByTestId("quick-route-jet-motion")).toBeDefined();
  });

  it("applies a route preset when clicking a quick-route button", () => {
    const handleChange = vi.fn();
    render(<PlayCanvas play={mockOffensePlay} onChange={handleChange} />);

    const slantBtn = screen.getByTestId("quick-route-slant");
    fireEvent.click(slantBtn);

    expect(handleChange).toHaveBeenCalled();
    const updatedPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const modifiedPlayer = updatedPlay.players.find((p) => p.quickRouteName === "Slant");
    expect(modifiedPlayer).toBeDefined();
    expect(modifiedPlayer?.route && modifiedPlayer.route.length > 0).toBe(true);
  });

  it("indicates and toggles pre-snap motion on offensive players", () => {
    const handleChange = vi.fn();
    render(<PlayCanvas play={mockOffensePlay} onChange={handleChange} />);

    // Click the dedicated Pre-Snap Motion toggle button
    const motionToggleBtn = screen.getByTestId("toggle-motion-btn");
    expect(motionToggleBtn).toBeDefined();
    fireEvent.click(motionToggleBtn);

    expect(handleChange).toHaveBeenCalled();
    const updatedPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const motionPlayer = updatedPlay.players.find((p) => p.routeType === "motion");
    expect(motionPlayer).toBeDefined();
    expect(motionPlayer?.quickRouteName).toBe("Jet Motion");
    expect(motionPlayer?.route && motionPlayer.route.length > 0).toBe(true);
  });

  it("applies a pre-snap motion preset directly from the ribbon", () => {
    const handleChange = vi.fn();
    render(<PlayCanvas play={mockOffensePlay} onChange={handleChange} />);

    const jetBtn = screen.getByTestId("quick-route-jet-motion");
    fireEvent.click(jetBtn);

    expect(handleChange).toHaveBeenCalled();
    const updatedPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const jetPlayer = updatedPlay.players.find((p) => p.quickRouteName === "Jet Motion");
    expect(jetPlayer).toBeDefined();
    expect(jetPlayer?.routeType).toBe("motion");
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
    const jetBtn = screen.getByTestId("quick-route-jet-motion");
    fireEvent.click(jetBtn);

    expect(handleChange).toHaveBeenCalled();
    const motionPlay = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const motionPlayer = motionPlay.players.find((p) => p.hasMotion || p.routeType === "motion");
    expect(motionPlayer).toBeDefined();
    expect(motionPlayer?.hasMotion).toBe(true);
    expect(motionPlayer?.motionPath && motionPlayer.motionPath.length > 0).toBe(true);

    // Re-render with updated play so state reflects the motion
    rerender(<PlayCanvas play={motionPlay} onChange={handleChange} />);

    // 2. Now apply a route preset (Slant) to the motion receiver
    const slantBtn = screen.getByTestId("quick-route-slant");
    fireEvent.click(slantBtn);

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
    const slantBtn = screen.getByTestId("quick-route-slant");
    fireEvent.click(slantBtn);

    const playWithSlant = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as PlayDiagram;
    const slantedPlayer = playWithSlant.players.find((p) => p.quickRouteName === "Slant");
    expect(slantedPlayer).toBeDefined();
    expect(slantedPlayer?.route![0].x).toBe(slantedPlayer!.x); // initially starts at alignment

    // Re-render with slanted player
    rerender(<PlayCanvas play={playWithSlant} onChange={handleChange} />);

    // 2. Now toggle motion ON for that receiver
    const motionToggleBtn = screen.getByTestId("toggle-motion-btn");
    fireEvent.click(motionToggleBtn);

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
