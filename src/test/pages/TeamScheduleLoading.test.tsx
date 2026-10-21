import React, { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { getDocs, getDoc, where } from "firebase/firestore";
import TeamSchedulePage from "@/app/teams/[id]/schedule/page";
import { invalidatePublicTeamData } from "@/lib/publicTeamCache";

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({ isDemoLeague: false, activeLeagueId: "", settings: {} }),
}));
vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({ canManageTeam: () => false, isLeagueAdmin: false, user: null }),
}));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn((_db, name) => name),
  query: vi.fn((...args) => args),
  where: vi.fn((...args) => args),
  limit: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  deleteDoc: vi.fn(),
  setDoc: vi.fn(),
}));

describe("team schedule lean loading", () => {
  beforeEach(() => {
    invalidatePublicTeamData();
    vi.mocked(getDoc).mockResolvedValue({ id: "falcons", exists: () => true, data: () => ({ name: "Falcons", subscription: { status: "active" } }) } as Awaited<ReturnType<typeof getDoc>>);
    vi.mocked(getDocs).mockReset();
  });

  it("shows independent team games using match-only requests, with no play-log query", async () => {
    vi.mocked(getDocs).mockResolvedValue({ docs: [{
      id: "game",
      data: () => ({
        id: "game", homeTeamId: "falcons", awayTeamId: "nipissing",
        homeTeamName: "Falcons", awayTeamName: "Nipissing",
        date: "2026-10-18", time: "10:00", status: "completed",
        homeScore: 35, awayScore: 14,
      }),
    }] } as Awaited<ReturnType<typeof getDocs>>);
    await act(async () => {
      render(<Suspense><TeamSchedulePage params={Promise.resolve({ id: "falcons" })} /></Suspense>);
    });
    expect(await screen.findByText(/Nipissing/)).toBeInTheDocument();
    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledWith("managingTeamId", "==", "falcons");
    expect(where).toHaveBeenCalledWith("isHidden", "==", false);
    expect(vi.mocked(getDocs).mock.calls.every(([request]) => Array.isArray(request) && request[0] === "matches")).toBe(true);
  });

  it("reports failed reads instead of presenting offline fixtures as an official schedule", async () => {
    vi.mocked(getDocs).mockRejectedValue(new Error("Network unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => {
      render(<Suspense><TeamSchedulePage params={Promise.resolve({ id: "falcons" })} /></Suspense>);
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("schedule could not be loaded");
    expect(screen.queryByText(/Nipissing/)).not.toBeInTheDocument();
    log.mockRestore();
  });
});
