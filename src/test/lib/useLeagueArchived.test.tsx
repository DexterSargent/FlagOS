import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import {
  useLeagueArchived,
  isTeamSeasonArchived,
  useTeamSeasonArchived,
} from "@/lib/useLeagueArchived";
import { getDoc } from "firebase/firestore";

const mockAuth = { user: { uid: "u1" } as any };
const mockLeague = { activeLeagueId: "active_league", isLeagueArchived: true };

vi.mock("@/lib/authContext", () => ({
  useAuth: () => mockAuth,
}));

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => mockLeague,
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, coll, id) => ({ path: `${coll}/${id}` })),
  getDoc: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
}));

function LeagueArchivedConsumer({ leagueId }: { leagueId?: string | null }) {
  const archived = useLeagueArchived(leagueId);
  return <div data-testid="league-archived">{String(archived)}</div>;
}

function TeamSeasonArchivedConsumer({ teamId }: { teamId?: string | null }) {
  const archived = useTeamSeasonArchived(teamId);
  return <div data-testid="team-archived">{String(archived)}</div>;
}

describe("useLeagueArchived & useTeamSeasonArchived", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.user = { uid: "u1" };
    mockLeague.activeLeagueId = "active_league";
    mockLeague.isLeagueArchived = true;
  });

  it("evaluates isTeamSeasonArchived correctly for various shapes", () => {
    expect(isTeamSeasonArchived(null)).toBe(false);
    expect(isTeamSeasonArchived(undefined)).toBe(false);
    expect(isTeamSeasonArchived({})).toBe(false);
    expect(isTeamSeasonArchived({ isArchived: true })).toBe(true);
    expect(isTeamSeasonArchived({ seasonStatus: "archived" })).toBe(true);
  });

  it("returns active league archived state immediately if matching activeLeagueId", () => {
    render(<LeagueArchivedConsumer leagueId="active_league" />);
    expect(screen.getByTestId("league-archived")).toHaveTextContent("true");
    expect(getDoc).not.toHaveBeenCalled();
  });

  it("returns false when leagueId is falsy", () => {
    render(<LeagueArchivedConsumer leagueId={null} />);
    expect(screen.getByTestId("league-archived")).toHaveTextContent("false");
  });

  it("fetches other league document and reflects archived flag", async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ seasonStatus: "archived" }),
    } as any);

    render(<LeagueArchivedConsumer leagueId="other_league" />);

    expect(screen.getByTestId("league-archived")).toHaveTextContent("false");
    await act(async () => {});
    expect(screen.getByTestId("league-archived")).toHaveTextContent("true");
  });

  it("handles Firestore error when fetching league", async () => {
    vi.mocked(getDoc).mockRejectedValueOnce(new Error("Network fail"));

    render(<LeagueArchivedConsumer leagueId="failing_league" />);
    await act(async () => {});
    expect(screen.getByTestId("league-archived")).toHaveTextContent("false");
  });

  it("fetches team document and reflects season archive state", async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ isArchived: true }),
    } as any);

    render(<TeamSeasonArchivedConsumer teamId="team_123" />);
    expect(screen.getByTestId("team-archived")).toHaveTextContent("false");

    await act(async () => {});
    expect(screen.getByTestId("team-archived")).toHaveTextContent("true");
  });

  it("handles Firestore error when fetching team archive state", async () => {
    vi.mocked(getDoc).mockRejectedValueOnce(new Error("Fetch failed"));

    render(<TeamSeasonArchivedConsumer teamId="team_fail" />);
    await act(async () => {});
    expect(screen.getByTestId("team-archived")).toHaveTextContent("false");
  });

  it("returns false for useTeamSeasonArchived when teamId is null", () => {
    render(<TeamSeasonArchivedConsumer teamId={null} />);
    expect(screen.getByTestId("team-archived")).toHaveTextContent("false");
  });
});
