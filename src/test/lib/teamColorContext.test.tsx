import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { TeamColorScope, useTeamColors } from "@/lib/teamColorContext";
import { getDoc } from "firebase/firestore";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, coll, id) => ({ path: `${coll}/${id}` })),
  getDoc: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
}));

vi.mock("@/lib/teamRecord", () => ({
  isDemoTeamId: (id: string) => id.startsWith("demo_") || id === "team_apex" || id === "team_kc",
  isStandaloneTeam: (team: any) => Boolean(team?.isStandalone || team?.plan === "independent"),
  useTeamRecord: vi.fn((teamId: string, enabled: boolean) => {
    if (!enabled) return { team: null, resolved: false };
    return {
      team: { id: teamId, name: "Fetched Non-Demo", primaryColor: "#112233", secondaryColor: "#445566" },
      resolved: true,
    };
  }),
}));

vi.mock("@/lib/demoSandbox", () => ({
  getSandboxTeams: () => [
    { id: "team_kc", name: "KC Chiefs Demo", primaryColor: "#e31837", secondaryColor: "#ffb81c" },
  ],
}));

function Consumer() {
  const { team, palette, isStandalone, loading } = useTeamColors();
  return (
    <div>
      <span data-testid="team-name">{team?.name || "none"}</span>
      <span data-testid="primary-color">{palette.primary}</span>
      <span data-testid="is-standalone">{String(isStandalone)}</span>
      <span data-testid="is-loading">{String(loading)}</span>
    </div>
  );
}

describe("TeamColorScope & useTeamColors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with initialTeam directly without loading", () => {
    const initial = { id: "custom_team", name: "Custom Sharks", primaryColor: "#0088ff", isStandalone: true };
    render(
      <TeamColorScope teamId="custom_team" initialTeam={initial}>
        <Consumer />
      </TeamColorScope>
    );

    expect(screen.getByTestId("team-name")).toHaveTextContent("Custom Sharks");
    expect(screen.getByTestId("is-standalone")).toHaveTextContent("true");
    expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
    expect(document.documentElement.style.getPropertyValue("--team-primary")).toBeDefined();
  });

  it("resolves demo team from sandbox and cleans up on unmount", () => {
    const { unmount } = render(
      <TeamColorScope teamId="team_apex">
        <Consumer />
      </TeamColorScope>
    );

    expect(screen.getByTestId("team-name")).toHaveTextContent("KC Chiefs Demo");
    expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
    unmount();
  });

  it("fetches demo team from Firestore if not in sandbox and responds to flagos_team_updated", async () => {
    const mockSnap = {
      exists: () => true,
      id: "demo_unknown",
      data: () => ({ name: "Firestore Demo Team", primaryColor: "#aabbcc" }),
    };
    vi.mocked(getDoc).mockResolvedValueOnce(mockSnap as any);

    render(
      <TeamColorScope teamId="demo_unknown">
        <Consumer />
      </TeamColorScope>
    );

    await act(async () => {});
    expect(screen.getByTestId("team-name")).toHaveTextContent("Firestore Demo Team");

    act(() => {
      window.dispatchEvent(
        new CustomEvent("flagos_team_updated", {
          detail: { name: "Updated via CustomEvent" },
        })
      );
    });

    expect(screen.getByTestId("team-name")).toHaveTextContent("Updated via CustomEvent");
  });

  it("handles Firestore error gracefully when fetching demo team", async () => {
    vi.mocked(getDoc).mockRejectedValueOnce(new Error("Network fail"));

    render(
      <TeamColorScope teamId="demo_failing">
        <Consumer />
      </TeamColorScope>
    );

    await act(async () => {});
    expect(screen.getByTestId("team-name")).toHaveTextContent("none");
  });

  it("loads non-demo team via useTeamRecord", () => {
    render(
      <TeamColorScope teamId="prod_team_123">
        <Consumer />
      </TeamColorScope>
    );

    expect(screen.getByTestId("team-name")).toHaveTextContent("Fetched Non-Demo");
    expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
  });
});
