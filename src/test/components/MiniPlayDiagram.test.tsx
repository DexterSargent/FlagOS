import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MiniPlayDiagram from "@/components/playbook/MiniPlayDiagram";
import { PlayDiagram } from "@/lib/playbookTypes";

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    settings: { rules: { rushLineDistance: 7 } },
  }),
}));

const manPlay: PlayDiagram = {
  id: "man-preview",
  teamId: "team-test",
  name: "Man Lock",
  type: "defense",
  formation: "Man Lock",
  situation: "Standard",
  losY: 65,
  players: [
    {
      id: "cb",
      side: "defense",
      label: "CB",
      role: "Cornerback",
      x: 20,
      y: 55,
      coverageType: "man",
      manTargetId: "wr",
    },
    {
      id: "wr",
      side: "offense",
      label: "WR",
      role: "Wide Receiver",
      x: 20,
      y: 65,
      route: [{ x: 20, y: 30 }],
    },
  ],
};

describe("MiniPlayDiagram", () => {
  it.each(["dark", "light"] as const)(
    "automatically shows offense, routes, and man-assignment lines in %s previews",
    (theme) => {
      const { container } = render(
        <MiniPlayDiagram play={manPlay} theme={theme} showOpposingSide={false} />
      );

      expect(screen.getByText("CB")).toBeInTheDocument();
      expect(screen.getByText("WR")).toBeInTheDocument();
      expect(container.querySelector('line[stroke="#EC4899"]')).toHaveAttribute("x2", "200");
      expect(container.querySelector('line[stroke="#EC4899"]')).toHaveAttribute("y2", "455");
      expect(container.querySelector('path[d="M 200 455 L 200 210"]')).toBeInTheDocument();
    }
  );

  it("shows offense before a man target is assigned without drawing a target line", () => {
    const play: PlayDiagram = {
      ...manPlay,
      players: manPlay.players.map((player) => ({ ...player, manTargetId: undefined })),
    };
    const { container } = render(<MiniPlayDiagram play={play} />);

    expect(screen.getByText("WR")).toBeInTheDocument();
    expect(container.querySelector('line[stroke="#EC4899"]')).not.toBeInTheDocument();
  });

  it("ignores missing man targets without hiding the offense", () => {
    const play: PlayDiagram = {
      ...manPlay,
      players: manPlay.players.map((player) =>
        player.side === "defense" ? { ...player, manTargetId: "missing" } : player
      ),
    };
    const { container } = render(<MiniPlayDiagram play={play} />);

    expect(screen.getByText("WR")).toBeInTheDocument();
    expect(container.querySelector('line[stroke="#EC4899"]')).not.toBeInTheDocument();
  });

  it("preserves the opponent toggle for defensive plays without man coverage", () => {
    const play: PlayDiagram = {
      ...manPlay,
      players: manPlay.players.map((player) =>
        player.side === "defense" ? { ...player, coverageType: "zone", manTargetId: undefined } : player
      ),
    };
    const { container, rerender } = render(<MiniPlayDiagram play={play} />);

    expect(screen.getByText("CB")).toBeInTheDocument();
    expect(screen.queryByText("WR")).not.toBeInTheDocument();
    expect(container.querySelector('path[d="M 200 455 L 200 210"]')).not.toBeInTheDocument();

    rerender(<MiniPlayDiagram play={play} showOpposingSide />);

    expect(screen.getByText("WR")).toBeInTheDocument();
    expect(container.querySelector('path[d="M 200 455 L 200 210"]')).toBeInTheDocument();
  });

  it("preserves the opponent toggle for offensive plays", () => {
    const play: PlayDiagram = { ...manPlay, type: "offense" };
    const { container, rerender } = render(<MiniPlayDiagram play={play} />);

    expect(screen.getByText("WR")).toBeInTheDocument();
    expect(screen.queryByText("CB")).not.toBeInTheDocument();
    expect(container.querySelector('line[stroke="#EC4899"]')).not.toBeInTheDocument();

    rerender(<MiniPlayDiagram play={play} showOpposingSide />);

    expect(screen.getByText("CB")).toBeInTheDocument();
    expect(container.querySelector('line[stroke="#EC4899"]')).toBeInTheDocument();
  });

  it("darkens half of the receiver badge to indicate defender shade leverage", () => {
    // Inside shade on WR at x: 20 (< 50) -> right half darkened
    const insidePlay: PlayDiagram = {
      ...manPlay,
      players: manPlay.players.map((p) =>
        p.id === "cb" ? { ...p, shade: "inside" } : p
      ),
    };
    const { rerender } = render(<MiniPlayDiagram play={insidePlay} />);
    expect(screen.getByTestId("mini-receiver-shaded-half-wr-right")).toBeInTheDocument();

    // Outside shade on WR at x: 20 (< 50) -> left half darkened
    const outsidePlay: PlayDiagram = {
      ...manPlay,
      players: manPlay.players.map((p) =>
        p.id === "cb" ? { ...p, shade: "outside" } : p
      ),
    };
    rerender(<MiniPlayDiagram play={outsidePlay} />);
    expect(screen.getByTestId("mini-receiver-shaded-half-wr-left")).toBeInTheDocument();
  });
});
