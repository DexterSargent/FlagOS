import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement, useState, type ComponentProps } from "react";
import PlayCanvas from "@/components/playbook/PlayCanvas";
import MiniPlayDiagram from "@/components/playbook/MiniPlayDiagram";
import type { PlayDiagram } from "@/lib/playbookTypes";

const renderCounts = vi.hoisted(() => ({ sidebarIcon: 0 }));

vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>();
  // The position-notes icon is drawn by the assignments dock.
  const Layers = (props: ComponentProps<typeof actual.Layers>) => {
    renderCounts.sidebarIcon++;
    return createElement(actual.Layers, props);
  };
  return { ...actual, Layers };
});

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    settings: { leagueName: "FlagOS League", rules: { playersOnField: 5 } },
    isDemoLeague: false,
  }),
}));

const play: PlayDiagram = {
  id: "perf_play",
  teamId: "team_perf",
  name: "Perf Flood",
  type: "offense",
  formation: "Trips Right",
  situation: "Standard",
  losY: 70,
  players: [
    { id: "p_qb", label: "QB", role: "QB", side: "offense", x: 50, y: 82, route: [] },
    { id: "p_c", label: "C", role: "C", side: "offense", x: 50, y: 70, route: [] },
    { id: "p_x", label: "X", role: "WR", side: "offense", x: 15, y: 70, route: [{ x: 15, y: 50 }] },
    { id: "p_y", label: "Y", role: "TE", side: "offense", x: 75, y: 70, route: [] },
    { id: "p_z", label: "Z", role: "WR", side: "offense", x: 88, y: 70, route: [] },
  ],
  zones: [],
  notes: "Primary read",
};

function badgeY(container: HTMLElement, label: string) {
  const text = [...container.querySelectorAll("svg text")].find((node) => node.textContent === label)!;
  return Number(text.parentElement!.querySelector('circle[r="18"]')!.getAttribute("cy")) / 7;
}

describe("PlayCanvas animation rendering", () => {
  let frames: FrameRequestCallback[] = [];

  beforeEach(() => {
    frames = [];
    renderCounts.sidebarIcon = 0;
    vi.spyOn(performance, "now").mockReturnValue(1000);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  function runFrame(time: number) {
    const pending = frames.splice(0);
    act(() => pending.forEach((cb) => cb(time)));
  }

  it("advances the field each frame without re-rendering the sidebar", () => {
    const { container } = render(<PlayCanvas play={play} onChange={vi.fn()} />);
    const initialSidebarRenders = renderCounts.sidebarIcon;
    expect(initialSidebarRenders).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Run Play/ }));
    // Starting playback is a real state change, so the probe does observe designer re-renders.
    expect(renderCounts.sidebarIcon).toBeGreaterThan(initialSidebarRenders);
    const slider = screen.getByRole("slider", { name: "Animation timeline" }) as HTMLInputElement;
    const sidebarRendersWhilePlaying = renderCounts.sidebarIcon;

    runFrame(1000 + 800);
    expect(Number(slider.value)).toBeCloseTo(0.25);
    expect(badgeY(container, "X")).toBeCloseTo(65);

    runFrame(1000 + 1600);
    expect(Number(slider.value)).toBeCloseTo(0.5);
    expect(badgeY(container, "X")).toBeCloseTo(60);
    expect(screen.getByText("1.6s")).toBeInTheDocument();
    expect(renderCounts.sidebarIcon).toBe(sidebarRendersWhilePlaying);

    runFrame(1000 + 4000);
    expect(Number(slider.value)).toBe(1);
    expect(badgeY(container, "X")).toBeCloseTo(50);
    expect(frames).toHaveLength(0);
    expect(screen.getByRole("button", { name: /Replay/ })).toBeInTheDocument();
  });

  it("scrubbing the timeline updates the field without re-rendering the sidebar", () => {
    const { container } = render(<PlayCanvas play={play} onChange={vi.fn()} />);
    const before = renderCounts.sidebarIcon;
    fireEvent.change(screen.getByRole("slider", { name: "Animation timeline" }), { target: { value: 0.5 } });
    expect(badgeY(container, "X")).toBeCloseTo(60);
    expect(renderCounts.sidebarIcon).toBe(before);
  });

  it("replays from the start after the play finishes", () => {
    const { container } = render(<PlayCanvas play={play} onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("slider", { name: "Animation timeline" }), { target: { value: 1 } });
    fireEvent.click(screen.getByRole("button", { name: /Replay/ }));
    expect(badgeY(container, "X")).toBeCloseTo(70);
    expect(screen.getByRole("button", { name: /Pause/ })).toBeInTheDocument();
  });
});

describe("PlayCanvas lazy dialogs", () => {
  it("loads the scheme notes dialog on demand and saves edits", async () => {
    const onChange = vi.fn();
    render(<PlayCanvas play={play} onChange={onChange} />);
    expect(screen.queryByText("Coach Playbook Scheme Notes")).toBeNull();
    fireEvent.click(screen.getByTitle("Open general coaching notes & scheme progression"));
    const notes = await screen.findByDisplayValue("Primary read");
    fireEvent.change(notes, { target: { value: "Read the flat" } });
    expect(onChange.mock.calls.at(-1)?.[0].notes).toBe("Read the flat");
    fireEvent.click(screen.getByRole("button", { name: "Save Notes" }));
    expect(screen.queryByText("Coach Playbook Scheme Notes")).toBeNull();
  });

  it("loads position notes for the active side and updates a player's notes", async () => {
    const onChange = vi.fn();
    render(<PlayCanvas play={play} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "View and edit position notes" }));
    expect(await screen.findByText(/Position Notes & Read Progression/)).toBeInTheDocument();
    const textareas = screen.getAllByPlaceholderText(/Read free safety/);
    expect(textareas).toHaveLength(5);
    fireEvent.change(textareas[2], { target: { value: "Win inside" } });
    const updated = onChange.mock.calls.at(-1)?.[0] as PlayDiagram;
    expect(updated.players.find((p) => p.id === "p_x")?.notes).toBe("Win inside");
  });

  it("loads the save route preset dialog with the selected route details", async () => {
    render(<PlayCanvas play={play} onChange={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Save Preset/ })[0]);
    expect(await screen.findByDisplayValue("X Custom Route")).toBeInTheDocument();
    expect(screen.getByText("1 cuts/points")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save to Team (0/20)" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Save Route Preset")).toBeNull();
  });
});

function fieldSvg() {
  const svg = screen.getByTestId("designer-field").querySelector("svg") as SVGSVGElement;
  svg.getScreenCTM = () => null;
  // jsdom has no SVG layout; map client pixels 1:1 onto the 1000x700 viewBox via the rect fallback.
  svg.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 1000, height: 700, right: 1000, bottom: 700, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  return svg;
}

describe("PlayCanvas compact editing and player study", () => {
  it("undoes one route node at a time without removing motion or changing other players", () => {
    const initial: PlayDiagram = {
      ...play,
      players: play.players.map((player) => player.id === "p_x" ? {
        ...player,
        route: [{ x: 15, y: 60 }, { x: 25, y: 50 }],
        routeType: "pass",
        quickRouteName: "Slant",
        routeDepthYards: 8,
        hasMotion: true,
        motionName: "Jet",
        motionPath: [{ x: 20, y: 70 }],
      } : player),
    };
    let latest = initial;
    function Editor() {
      const [value, setValue] = useState(initial);
      return <PlayCanvas play={value} onChange={(updated) => { latest = updated; setValue(updated); }} />;
    }
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "Select X" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo last route point" }));
    let receiver = latest.players.find((player) => player.id === "p_x")!;
    expect(receiver.route).toEqual([{ x: 15, y: 60 }]);
    expect(receiver.quickRouteName).toBe("Custom Route");
    expect(receiver.routeDepthYards).toBeUndefined();
    expect(receiver.motionPath).toEqual([{ x: 20, y: 70 }]);
    expect(receiver.hasMotion).toBe(true);
    expect(latest.players.filter((player) => player.side === "offense" && player.id !== "p_x")).toEqual(initial.players.filter((player) => player.id !== "p_x"));
    fireEvent.click(screen.getByRole("button", { name: "Undo last route point" }));
    receiver = latest.players.find((player) => player.id === "p_x")!;
    expect(receiver.route).toEqual([]);
    expect(receiver.motionPath).toEqual([{ x: 20, y: 70 }]);
    expect(screen.queryByRole("button", { name: "Undo last route point" })).not.toBeInTheDocument();
    expect(screen.queryByText(/custom points?/i)).not.toBeInTheDocument();
  });

  it("gives players readable assignments and playback rather than disabled editor menus", () => {
    const onChange = vi.fn();
    const studyPlay: PlayDiagram = {
      ...play,
      players: play.players.map((player) => player.id === "p_x" ? { ...player, notes: "Read the safety, break inside.", quickRouteName: "Slant" } : player),
    };
    render(<PlayCanvas play={studyPlay} onChange={onChange} readOnly onOpenQuestions={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Perf Flood" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Play name" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Draw route" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show route catalog" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select X" }));
    expect(screen.getByText("Read the safety, break inside.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Coach Q&A" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Run Play/ })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Select QB" }));
    expect(screen.getByText(/No position notes yet/)).toBeInTheDocument();
    fireEvent.pointerDown(playerNode(screen.getByTestId("designer-field"), "X"), at(15, 70));
    expect(screen.getByText("Read the safety, break inside.")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});

function playerNode(container: HTMLElement, label: string) {
  return [...container.querySelectorAll("svg text")].find((node) => node.textContent === label)!.parentElement!;
}

const at = (x: number, y: number) => ({ clientX: x * 10, clientY: y * 7, pointerId: 1 });

describe("PlayCanvas drag drafts", () => {
  it("previews a player drag locally and persists once on release", () => {
    const onChange = vi.fn();
    const { container } = render(<PlayCanvas play={play} onChange={onChange} />);
    const svg = fieldSvg();
    onChange.mockClear();

    fireEvent.pointerDown(playerNode(container, "X"), at(15, 70));
    fireEvent.pointerMove(svg, at(20, 70));
    fireEvent.pointerMove(svg, at(25, 70));
    fireEvent.pointerMove(svg, at(30, 70));

    expect(onChange).not.toHaveBeenCalled();
    expect(badgeY(container, "X")).toBeCloseTo(70);
    const previewX = Number(playerNode(container, "X").querySelector('circle[r="18"]')!.getAttribute("cx")) / 10;
    expect(previewX).toBeCloseTo(30);

    fireEvent.pointerUp(svg, at(30, 70));
    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0][0] as PlayDiagram;
    const x = saved.players.find((p) => p.id === "p_x")!;
    expect(x.x).toBeCloseTo(30);
    expect(x.route).toEqual([{ x: 30, y: 50 }]);

    fireEvent.pointerMove(svg, at(40, 70));
    fireEvent.pointerUp(svg, at(40, 70));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("keeps the latest preview when the browser cancels the pointer", () => {
    const onChange = vi.fn();
    const { container } = render(<PlayCanvas play={play} onChange={onChange} />);
    const svg = fieldSvg();
    onChange.mockClear();
    fireEvent.pointerDown(playerNode(container, "Z"), at(88, 70));
    fireEvent.pointerMove(svg, at(80, 70));
    fireEvent.pointerCancel(svg, at(80, 70));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect((onChange.mock.calls[0][0] as PlayDiagram).players.find((p) => p.id === "p_z")!.x).toBeCloseTo(80);
  });

  it("does not persist a tap without movement", () => {
    const onChange = vi.fn();
    const { container } = render(<PlayCanvas play={play} onChange={onChange} />);
    const svg = fieldSvg();
    onChange.mockClear();
    fireEvent.pointerDown(playerNode(container, "Y"), at(75, 70));
    fireEvent.pointerUp(svg, at(75, 70));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("drags a route waypoint with a live depth badge and one save", () => {
    const onChange = vi.fn();
    const { container } = render(<PlayCanvas play={play} onChange={onChange} />);
    const svg = fieldSvg();
    onChange.mockClear();
    const handle = [...container.querySelectorAll('circle[r="44"]')].find(
      (circle) => circle.getAttribute("cx") === "150" && circle.getAttribute("cy") === "350"
    )!;
    fireEvent.pointerDown(handle.parentElement!, at(15, 50));
    fireEvent.pointerMove(svg, at(15, 40));
    fireEvent.pointerMove(svg, at(15, 35));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("route-depth-badge")).toHaveTextContent(/yd deep/);
    fireEvent.pointerUp(svg, at(15, 35));
    expect(screen.queryByTestId("route-depth-badge")).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(1);
    const route = (onChange.mock.calls[0][0] as PlayDiagram).players.find((p) => p.id === "p_x")!.route!;
    expect(route).toHaveLength(1);
    expect(route[0].y).toBeLessThan(40);
  });

  it("moves a man defender with its own drag and keeps the man assignment", () => {
    const onChange = vi.fn();
    const defensePlay: PlayDiagram = {
      ...play,
      id: "perf_def",
      type: "defense",
      players: [
        ...play.players,
        { id: "d_cb", label: "CB1", role: "Cornerback", side: "defense", x: 18, y: 62, coverageType: "man", manTargetId: "p_x", route: [] },
        { id: "d_2", label: "D2", role: "Safety", side: "defense", x: 40, y: 50, route: [] },
        { id: "d_3", label: "D3", role: "Safety", side: "defense", x: 60, y: 50, route: [] },
        { id: "d_4", label: "D4", role: "Corner", side: "defense", x: 82, y: 62, route: [] },
        { id: "d_5", label: "D5", role: "Rusher", side: "defense", x: 50, y: 57, route: [] },
      ],
    };
    const { container } = render(<PlayCanvas play={defensePlay} onChange={onChange} />);
    const svg = fieldSvg();
    onChange.mockClear();
    fireEvent.pointerDown(playerNode(container, "CB1"), at(18, 62));
    fireEvent.pointerMove(svg, at(22, 60));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(svg, at(22, 60));
    const cb = (onChange.mock.calls.at(-1)![0] as PlayDiagram).players.find((p) => p.id === "d_cb")!;
    expect(cb).toMatchObject({ x: 22, y: 60, coverageType: "man", manTargetId: "p_x" });
  });

  it("drags a zone bubble with its attached defender and keeps the zone on save", () => {
    const onChange = vi.fn();
    const zone = { id: "z_deep", name: "Deep Half", x: 30, y: 30, rx: 12, ry: 8, color: "#38BDF8" };
    const defensePlay: PlayDiagram = {
      ...play,
      id: "perf_zone",
      type: "defense",
      zones: [zone],
      players: [
        ...play.players,
        { id: "d_fs", label: "FS", role: "Safety", side: "defense", x: 30, y: 45, coverageType: "zone", zoneId: zone.id, route: [{ x: 30, y: 30 }] },
        { id: "d_2", label: "D2", role: "Safety", side: "defense", x: 60, y: 50, route: [] },
        { id: "d_3", label: "D3", role: "Corner", side: "defense", x: 18, y: 62, route: [] },
        { id: "d_4", label: "D4", role: "Corner", side: "defense", x: 82, y: 62, route: [] },
        { id: "d_5", label: "D5", role: "Rusher", side: "defense", x: 50, y: 57, route: [] },
      ],
    };
    const { container } = render(<PlayCanvas play={defensePlay} onChange={onChange} />);
    const svg = fieldSvg();
    onChange.mockClear();
    const zoneEllipse = () => [...container.querySelectorAll("ellipse")].find((el) => el.getAttribute("stroke-dasharray") === "6 4")!;
    expect(zoneEllipse().getAttribute("cx")).toBe("300");
    fireEvent.pointerDown(zoneEllipse().parentElement!, at(30, 30));
    fireEvent.pointerMove(svg, at(40, 25));
    expect(onChange).not.toHaveBeenCalled();
    expect(Number(zoneEllipse().getAttribute("cx"))).toBeCloseTo(400);
    fireEvent.pointerUp(svg, at(40, 25));
    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0][0] as PlayDiagram;
    expect(saved.zones).toEqual([{ ...zone, x: 40, y: 25 }]);
    expect(saved.players.find((p) => p.id === "d_fs")!.route).toEqual([{ x: 40, y: 25 }]);
  });

  it("drags a defensive player's zone arrow and moves the attached zone with it", () => {
    const onChange = vi.fn();
    const zone = { id: "z_deep", name: "Deep Half", x: 30, y: 30, rx: 12, ry: 8, color: "#38BDF8" };
    const defensePlay: PlayDiagram = {
      ...play,
      id: "perf_zone_arrow",
      type: "defense",
      zones: [zone],
      players: [
        ...play.players,
        { id: "d_fs", label: "FS", role: "Safety", side: "defense", x: 30, y: 45, coverageType: "zone", zoneId: zone.id, route: [{ x: 30, y: 30 }] },
        { id: "d_2", label: "D2", role: "Safety", side: "defense", x: 60, y: 50, route: [] },
        { id: "d_3", label: "D3", role: "Corner", side: "defense", x: 18, y: 62, route: [] },
        { id: "d_4", label: "D4", role: "Corner", side: "defense", x: 82, y: 62, route: [] },
        { id: "d_5", label: "D5", role: "Rusher", side: "defense", x: 50, y: 57, route: [] },
      ],
    };
    const { container } = render(<PlayCanvas play={defensePlay} onChange={onChange} />);
    const svg = fieldSvg();
    onChange.mockClear();

    // Select the defensive player first
    fireEvent.pointerDown(playerNode(container, "FS"), at(30, 45));
    fireEvent.pointerUp(svg, at(30, 45));

    // Find the waypoint handle circle at (30, 30) => cx=300, cy=210
    const handle = [...container.querySelectorAll('circle[r="44"]')].find(
      (circle) => circle.getAttribute("cx") === "300" && circle.getAttribute("cy") === "210"
    )!;
    expect(handle).toBeDefined();

    // 17.5 is exactly 30 yards from losY 70 (70 - 30 * 1.75 = 17.5)
    fireEvent.pointerDown(handle.parentElement!, at(30, 30));
    fireEvent.pointerMove(svg, at(45, 17.5));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.pointerUp(svg, at(45, 17.5));
    expect(onChange).toHaveBeenCalledTimes(1);

    const saved = onChange.mock.calls[0][0] as PlayDiagram;
    expect(saved.zones).toEqual([{ ...zone, x: 45, y: 17.5 }]);
    expect(saved.players.find((p) => p.id === "d_fs")!.route).toEqual([{ x: 45, y: 17.5 }]);
  });

  it("drags a defensive player's zone arrow directly via the path to move the attached zone", () => {
    const onChange = vi.fn();
    const zone = { id: "z_deep", name: "Deep Half", x: 30, y: 30, rx: 12, ry: 8, color: "#38BDF8" };
    const defensePlay: PlayDiagram = {
      ...play,
      id: "perf_zone_arrow_direct",
      type: "defense",
      zones: [zone],
      players: [
        ...play.players,
        { id: "d_fs", label: "FS", role: "Safety", side: "defense", x: 30, y: 45, coverageType: "zone", zoneId: zone.id, route: [{ x: 30, y: 30 }] },
        { id: "d_2", label: "D2", role: "Safety", side: "defense", x: 60, y: 50, route: [] },
        { id: "d_3", label: "D3", role: "Corner", side: "defense", x: 18, y: 62, route: [] },
        { id: "d_4", label: "D4", role: "Corner", side: "defense", x: 82, y: 62, route: [] },
        { id: "d_5", label: "D5", role: "Rusher", side: "defense", x: 50, y: 57, route: [] },
      ],
    };
    const { container } = render(<PlayCanvas play={defensePlay} onChange={onChange} />);
    const svg = fieldSvg();
    onChange.mockClear();

    // Directly click and drag the arrow path without pre-selecting the player
    const arrowPath = [...container.querySelectorAll('path.cursor-move')].find(
      (path) => path.getAttribute("stroke") === "#A855F7" || path.getAttribute("stroke") === "transparent"
    )!;
    expect(arrowPath).toBeDefined();

    fireEvent.pointerDown(arrowPath, at(30, 30));
    fireEvent.pointerMove(svg, at(50, 17.5));
    fireEvent.pointerUp(svg, at(50, 17.5));

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0][0] as PlayDiagram;
    expect(saved.zones).toEqual([{ ...zone, x: 50, y: 17.5 }]);
    expect(saved.players.find((p) => p.id === "d_fs")!.route).toEqual([{ x: 50, y: 17.5 }]);
  });

  it("moving a defensive player preserves arrow attachment to their zone", () => {
    const onChange = vi.fn();
    const zone = { id: "z_deep", name: "Deep Half", x: 30, y: 30, rx: 12, ry: 8, color: "#38BDF8" };
    const defensePlay: PlayDiagram = {
      ...play,
      id: "perf_zone_player_drag",
      type: "defense",
      zones: [zone],
      players: [
        ...play.players,
        { id: "d_fs", label: "FS", role: "Safety", side: "defense", x: 30, y: 45, coverageType: "zone", zoneId: zone.id, route: [{ x: 30, y: 30 }] },
        { id: "d_2", label: "D2", role: "Safety", side: "defense", x: 60, y: 50, route: [] },
        { id: "d_3", label: "D3", role: "Corner", side: "defense", x: 18, y: 62, route: [] },
        { id: "d_4", label: "D4", role: "Corner", side: "defense", x: 82, y: 62, route: [] },
        { id: "d_5", label: "D5", role: "Rusher", side: "defense", x: 50, y: 57, route: [] },
      ],
    };
    const { container } = render(<PlayCanvas play={defensePlay} onChange={onChange} />);
    const svg = fieldSvg();
    onChange.mockClear();

    fireEvent.pointerDown(playerNode(container, "FS"), at(30, 45));
    fireEvent.pointerMove(svg, at(35, 48));
    fireEvent.pointerUp(svg, at(35, 48));

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0][0] as PlayDiagram;
    const fs = saved.players.find((p) => p.id === "d_fs")!;
    expect(fs.x).toBeCloseTo(35);
    expect(fs.y).toBeCloseTo(48);
    // Route must remain pointing to the zone at (30, 30) instead of drifting
    expect(fs.route).toEqual([{ x: 30, y: 30 }]);
  });

  it("flushes an in-progress drag if the designer unmounts", () => {
    const onChange = vi.fn();
    const { container, unmount } = render(<PlayCanvas play={play} onChange={onChange} />);
    const svg = fieldSvg();
    onChange.mockClear();
    fireEvent.pointerDown(playerNode(container, "X"), at(15, 70));
    fireEvent.pointerMove(svg, at(22, 70));
    unmount();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect((onChange.mock.calls[0][0] as PlayDiagram).players.find((p) => p.id === "p_x")!.x).toBeCloseTo(22);
  });
});

describe("PlayCanvas lazy route catalog", () => {
  it("does not render catalog cards until opened, then loads them on demand", async () => {
    const { container } = render(<PlayCanvas play={play} onChange={vi.fn()} />);
    expect(container.querySelector('[data-testid^="catalog-route-"]')).toBeNull();
    const toggle = screen.getByTestId("route-presets-toggle");
    fireEvent.pointerEnter(toggle);
    fireEvent.click(toggle);
    expect(await screen.findByTestId("catalog-route-slant", {}, { timeout: 5000 })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close route catalog"));
    await waitFor(() => expect(screen.queryByTestId("route-presets-catalog")).toBeNull());
  });
});

describe("PlayCanvas custom zone creation, shapes, and resizing", () => {
  const defensePlay: PlayDiagram = {
    ...play,
    id: "defense_custom_zones",
    type: "defense",
    losY: 65,
    players: [
      ...play.players,
      { id: "d_fs", label: "FS", role: "Safety", side: "defense", x: 50, y: 40, route: [] },
      { id: "d_cb1", label: "CB1", role: "Corner", side: "defense", x: 20, y: 55, route: [] },
      { id: "d_cb2", label: "CB2", role: "Corner", side: "defense", x: 80, y: 55, route: [] },
      { id: "d_lb", label: "LB", role: "Linebacker", side: "defense", x: 50, y: 55, route: [] },
      { id: "d_rush", label: "RUSH", role: "Rusher", side: "defense", x: 50, y: 58, route: [] },
    ],
    zones: [],
  };

  it("creates one adjustable custom zone instead of separate box and oval actions", () => {
    const onChange = vi.fn();
    const { container } = render(<PlayCanvas play={defensePlay} onChange={onChange} />);
    onChange.mockClear();

    const createBoxBtn = screen.getByTestId("create-custom-zone");
    expect(createBoxBtn).toBeInTheDocument();

    fireEvent.click(createBoxBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as PlayDiagram;
    expect(updated.zones).toHaveLength(1);
    const zone = updated.zones![0];
    expect(zone.roundness).toBe(100);
    expect(zone.name).toBe("Custom Zone");
    expect(zone.rx).toBe(18);
    expect(zone.ry).toBe(10);

    // Re-render with the created zone and check that an SVG <rect> is rendered
    const { container: reContainer } = render(<PlayCanvas play={updated} onChange={vi.fn()} />);
    const rectZone = reContainer.querySelector('g[data-testid^="zone-bubble-"] rect');
    expect(rectZone).not.toBeNull();
  });

  it("adjusts roundness continuously from square corners to oval while retaining legacy zones", () => {
    const onChange = vi.fn();
    const existingZone = {
      id: "zone_custom_test",
      name: "Custom Under",
      x: 50,
      y: 45,
      rx: 15,
      ry: 10,
      color: "#8B5CF6",
      shape: "ellipse" as const,
    };
    const playWithZone: PlayDiagram = {
      ...defensePlay,
      zones: [existingZone],
    };

    function Editor() {
      const [value, setValue] = useState(playWithZone);
      return <PlayCanvas play={value} onChange={(updated) => { onChange(updated); setValue(updated); }} />;
    }
    const { container } = render(<Editor />);
    fieldSvg();

    // Click on the zone to select it
    const zoneGroup = container.querySelector(`[data-testid="zone-bubble-${existingZone.id}"]`)!;
    expect(zoneGroup).toBeDefined();
    fireEvent.pointerDown(zoneGroup, at(50, 45));

    // Customizer panel should appear
    expect(screen.getByTestId("zone-customizer-panel")).toBeInTheDocument();

    const roundness = screen.getByRole("slider", { name: "Zone roundness" });
    expect(roundness).toHaveValue("100");
    fireEvent.change(roundness, { target: { value: "0" } });

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as PlayDiagram;
    expect(lastCall.zones![0].shape).toBe("rectangle");
    expect(lastCall.zones![0].roundness).toBe(0);

    fireEvent.change(roundness, { target: { value: "45" } });
    expect(onChange.mock.calls.at(-1)![0].zones[0].roundness).toBe(45);
    fireEvent.change(roundness, { target: { value: "100" } });

    const afterEllipseCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as PlayDiagram;
    expect(afterEllipseCall.zones![0].roundness).toBe(100);
  });

  it("shows zone tools only in zone coverage, never in man or rush", () => {
    function Editor() {
      const [value, setValue] = useState(defensePlay);
      return <PlayCanvas play={value} onChange={setValue} />;
    }
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "Select CB1" }));
    expect(screen.getByTestId("create-custom-zone")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Man" }));
    expect(screen.queryByTestId("create-custom-zone")).not.toBeInTheDocument();
    expect(screen.queryByTestId("coverage-category-deep")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select CB2" }));
    expect(screen.getByTestId("create-custom-zone")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select CB1" }));
    expect(screen.queryByTestId("create-custom-zone")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("set-pass-rush-btn"));
    expect(screen.queryByTestId("man-coverage-controls")).not.toBeInTheDocument();
    expect(screen.queryByTestId("create-custom-zone")).not.toBeInTheDocument();
    expect(screen.queryByTestId("coverage-category-deep")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zone" }));
    expect(screen.getByTestId("create-custom-zone")).toBeInTheDocument();
  });

  it.each([0, 45, 100])("renders %s percent zone roundness consistently on the field and printed previews", (roundness) => {
    const value: PlayDiagram = {
      ...defensePlay,
      zones: [{ id: "rounded", name: "Under", x: 50, y: 40, rx: 18, ry: 10, color: "#8B5CF6", shape: "rectangle", roundness }],
    };
    const { container } = render(<><PlayCanvas play={value} onChange={vi.fn()} /><MiniPlayDiagram play={value} /></>);
    const zone = container.querySelector('[data-testid="zone-bubble-rounded"] rect')!;
    expect(Number(zone.getAttribute("rx"))).toBeCloseTo(180 * roundness / 100);
    expect(Number(zone.getAttribute("ry"))).toBeCloseTo(70 * roundness / 100);
    const previews = [...container.querySelectorAll('rect[stroke="#8B5CF6"]')];
    expect(previews).toHaveLength(2);
    expect(previews.map((rect) => [rect.getAttribute("rx"), rect.getAttribute("ry")])).toEqual([
      [zone.getAttribute("rx"), zone.getAttribute("ry")],
      [zone.getAttribute("rx"), zone.getAttribute("ry")],
    ]);
  });

  it("adjusts zone width and depth via steppers and slider controls", () => {
    const onChange = vi.fn();
    const existingZone = {
      id: "zone_size_test",
      name: "Deep 1/3",
      x: 50,
      y: 35,
      rx: 14,
      ry: 8,
      color: "#3B82F6",
      shape: "rectangle" as const,
    };
    const playWithZone: PlayDiagram = {
      ...defensePlay,
      zones: [existingZone],
    };

    const { container } = render(<PlayCanvas play={playWithZone} onChange={onChange} />);
    fieldSvg();
    const zoneGroup = container.querySelector(`[data-testid="zone-bubble-${existingZone.id}"]`)!;
    fireEvent.pointerDown(zoneGroup, at(50, 35));

    expect(screen.getByTestId("zone-customizer-panel")).toBeInTheDocument();

    // Widen width
    fireEvent.click(screen.getByTestId("zone-width-increase"));
    let updated = onChange.mock.calls[onChange.mock.calls.length - 1][0] as PlayDiagram;
    expect(updated.zones![0].rx).toBe(16);

    // Deepen depth
    fireEvent.click(screen.getByTestId("zone-depth-increase"));
    updated = onChange.mock.calls[onChange.mock.calls.length - 1][0] as PlayDiagram;
    expect(updated.zones![0].ry).toBe(10);

    // Make shallower (8 - 2 = 6)
    fireEvent.click(screen.getByTestId("zone-depth-decrease"));
    updated = onChange.mock.calls[onChange.mock.calls.length - 1][0] as PlayDiagram;
    expect(updated.zones![0].ry).toBe(6);

    // Slider direct update
    fireEvent.change(screen.getByTestId("zone-width-slider"), { target: { value: "24" } });
    updated = onChange.mock.calls[onChange.mock.calls.length - 1][0] as PlayDiagram;
    expect(updated.zones![0].rx).toBe(24);
  });

  it("resizes zone width interactively using on-canvas east resize handle", () => {
    const onChange = vi.fn();
    const existingZone = {
      id: "zone_drag_resize",
      name: "Robber",
      x: 50,
      y: 40,
      rx: 15,
      ry: 10,
      color: "#EC4899",
      shape: "rectangle" as const,
    };
    const playWithZone: PlayDiagram = {
      ...defensePlay,
      zones: [existingZone],
    };

    const { container } = render(<PlayCanvas play={playWithZone} onChange={onChange} />);
    const svg = fieldSvg();

    // Select the zone
    const zoneGroup = container.querySelector(`[data-testid="zone-bubble-${existingZone.id}"]`)!;
    fireEvent.pointerDown(zoneGroup, at(50, 40));

    // Resize handles should be present
    const eastHandle = screen.getByTestId("zone-resize-handle-e");
    expect(eastHandle).toBeInTheDocument();

    onChange.mockClear();

    // Drag the east handle from x=65 (50 + 15) to x=72 (deltaX = +7 => rx becomes 22)
    fireEvent.pointerDown(eastHandle, at(65, 40));
    fireEvent.pointerMove(svg, at(72, 40));
    fireEvent.pointerUp(svg, at(72, 40));

    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as PlayDiagram;
    expect(updated.zones![0].rx).toBe(22);
  });

  it("resizes zone depth interactively using on-canvas south resize handle", () => {
    const onChange = vi.fn();
    const existingZone = {
      id: "zone_south_resize",
      name: "Robber",
      x: 50,
      y: 40,
      rx: 15,
      ry: 10,
      color: "#EC4899",
      shape: "ellipse" as const,
    };
    const playWithZone: PlayDiagram = {
      ...defensePlay,
      zones: [existingZone],
    };

    const { container } = render(<PlayCanvas play={playWithZone} onChange={onChange} />);
    const svg = fieldSvg();

    // Select the zone
    const zoneGroup = container.querySelector(`[data-testid="zone-bubble-${existingZone.id}"]`)!;
    fireEvent.pointerDown(zoneGroup, at(50, 40));

    const southHandle = screen.getByTestId("zone-resize-handle-s");
    expect(southHandle).toBeInTheDocument();

    onChange.mockClear();

    // Drag the south handle from y=50 (40 + 10) to y=55 (deltaY = +5 => ry becomes 15)
    fireEvent.pointerDown(southHandle, at(50, 50));
    fireEvent.pointerMove(svg, at(50, 55));
    fireEvent.pointerUp(svg, at(50, 55));

    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as PlayDiagram;
    expect(updated.zones![0].ry).toBe(15);
  });

  it("resizes both width and depth using the southeast corner handle", () => {
    const onChange = vi.fn();
    const existingZone = {
      id: "zone_se_resize",
      name: "Box Half",
      x: 50,
      y: 35,
      rx: 14,
      ry: 8,
      color: "#10B981",
      shape: "rectangle" as const,
    };
    const playWithZone: PlayDiagram = {
      ...defensePlay,
      zones: [existingZone],
    };

    const { container } = render(<PlayCanvas play={playWithZone} onChange={onChange} />);
    const svg = fieldSvg();

    const zoneGroup = container.querySelector(`[data-testid="zone-bubble-${existingZone.id}"]`)!;
    fireEvent.pointerDown(zoneGroup, at(50, 35));

    const seHandle = screen.getByTestId("zone-resize-handle-se");
    expect(seHandle).toBeInTheDocument();

    onChange.mockClear();

    // Drag SE handle (x: 50 + 14 = 64, y: 35 + 8 = 43) by +6 in x and +4 in y
    fireEvent.pointerDown(seHandle, at(64, 43));
    fireEvent.pointerMove(svg, at(70, 47));
    fireEvent.pointerUp(svg, at(70, 47));

    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as PlayDiagram;
    expect(updated.zones![0].rx).toBe(20);
    expect(updated.zones![0].ry).toBe(12);
  });
});
