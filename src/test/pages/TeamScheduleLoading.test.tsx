import React, { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { getDocs, getDoc, where } from "firebase/firestore";
import TeamSchedulePage from "@/app/teams/[id]/schedule/page";
import { invalidatePublicTeamData } from "@/lib/publicTeamCache";

let mockCanManage = false;
let mockIsDemoLeague = false;

vi.mock("@/lib/leagueContext", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useLeague: () => ({ isDemoLeague: mockIsDemoLeague, activeLeagueId: "", settings: { defaultLocation: "Field 1" } }),
  };
});


vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({
    canManageTeam: (id: string) => mockCanManage,
    isTeamAdmin: (id: string) => mockCanManage,
    isLeagueAdmin: false,
    user: { uid: "coach_1", email: "head@falcons.com" },
  }),
}));
vi.mock("@/lib/secureWrites", () => ({
  createSecureRecord: vi.fn().mockResolvedValue("match_new_99"),
  requestPrivateData: vi.fn().mockResolvedValue({
    team: { adminEmails: ["head@falcons.com"] },
  }),
}));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, coll, id) => ({ path: `${coll}/${id}`, id })),
  getDoc: vi.fn(),
  collection: vi.fn((_db, name) => name),
  query: vi.fn((...args) => args),
  where: vi.fn((...args) => args),
  limit: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  deleteDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn().mockResolvedValue(undefined),
}));

describe("team schedule lean loading and coach actions", () => {
  beforeEach(() => {
    mockCanManage = false;
    mockIsDemoLeague = false;
    invalidatePublicTeamData();
    vi.mocked(getDoc).mockResolvedValue({
      id: "falcons",
      exists: () => true,
      data: () => ({ name: "Falcons", isStandalone: true, subscription: { status: "active" }, adminEmails: ["head@falcons.com"] }),
    } as Awaited<ReturnType<typeof getDoc>>);
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);
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

  it("allows authorized coach to open scheduling modal and schedule a game", async () => {
    mockCanManage = true;
    const { createSecureRecord } = await import("@/lib/secureWrites");
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

    await act(async () => {
      render(<Suspense><TeamSchedulePage params={Promise.resolve({ id: "falcons" })} /></Suspense>);
    });

    const scheduleBtn = await screen.findByRole("button", { name: /Schedule (First )?Game|New Exhibition/i });
    expect(scheduleBtn).toBeInTheDocument();

    act(() => {
      scheduleBtn.click();
    });

    const oppInput = screen.getByPlaceholderText(/Gotham Rogues/i);
    expect(oppInput).toBeInTheDocument();

    fireEvent.change(oppInput, { target: { value: "Steelers" } });

    const submitBtn = screen.getByRole("button", { name: /Confirm & Schedule Game/i });
    await act(async () => {
      submitBtn.click();
    });

    expect(createSecureRecord).toHaveBeenCalledWith("match", expect.objectContaining({
      homeTeamName: "Falcons",
      managingTeamId: "falcons",
    }));
  });

  it("schedules an away championship exhibition game with custom time and location", async () => {
    mockCanManage = true;
    const { createSecureRecord } = await import("@/lib/secureWrites");
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

    await act(async () => {
      render(<Suspense><TeamSchedulePage params={Promise.resolve({ id: "falcons" })} /></Suspense>);
    });

    const scheduleBtn = await screen.findByRole("button", { name: /Schedule (First )?Game|New Exhibition/i });
    fireEvent.click(scheduleBtn);

    // Set opponent
    const oppInput = screen.getByPlaceholderText(/Gotham Rogues/i);
    fireEvent.change(oppInput, { target: { value: "Raiders" } });

    // Select Away Team
    const awayBtn = screen.getByRole("button", { name: /Away \/ Visiting Team/i });
    fireEvent.click(awayBtn);

    // Select Championship Game
    const gameTypeSelect = screen.getByLabelText(/Game Type/i);
    fireEvent.change(gameTypeSelect, { target: { value: "championship" } });

    // Change location
    const locationInput = screen.getByLabelText(/Field \/ Venue Location/i);
    fireEvent.change(locationInput, { target: { value: "Stadium Field B" } });

    // Submit
    const submitBtn = screen.getByRole("button", { name: /Confirm & Schedule Game/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(createSecureRecord).toHaveBeenCalledWith("match", expect.objectContaining({
      homeTeamName: "Raiders",
      awayTeamName: "Falcons",
      isPlayoff: true,
      playoffRound: "Championship",
      location: "Stadium Field B",
    }));
  });

  it("renders completed games with championship banner and allows authorized coach to delete a game", async () => {
    mockCanManage = true;
    vi.spyOn(window, "confirm").mockReturnValue(true);

    vi.mocked(getDocs).mockResolvedValue({
      docs: [
        {
          id: "champ_game",
          data: () => ({
            id: "champ_game",
            homeTeamId: "falcons",
            awayTeamId: "opp_1",
            homeTeamName: "Falcons",
            awayTeamName: "Titans",
            status: "completed",
            homeScore: 30,
            awayScore: 20,
            playoffRound: "Championship",
            date: "2026-10-20",
            time: "15:00",
            location: "Field 1",
          }),
        },
      ],
    } as any);

    await act(async () => {
      render(<Suspense><TeamSchedulePage params={Promise.resolve({ id: "falcons" })} /></Suspense>);
    });

    expect(await screen.findByText(/Champions 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Past Results & Box Scores/i)).toBeInTheDocument();

    // Delete button
    const deleteBtn = screen.getByTitle(/Delete Event/i);
    expect(deleteBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(deleteBtn);
    });
  });

  it("loads and displays demo league team schedule from sandbox", async () => {
    mockIsDemoLeague = true;
    mockCanManage = false;

    await act(async () => {
      render(<Suspense><TeamSchedulePage params={Promise.resolve({ id: "team_buf" })} /></Suspense>);
    });

    expect((await screen.findAllByText(/Buffalo/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Upcoming Games/i)).toBeInTheDocument();
  });

  it("opens and closes the exhibition match scheduler modal", async () => {
    mockCanManage = true;
    await act(async () => {
      render(<Suspense><TeamSchedulePage params={Promise.resolve({ id: "falcons" })} /></Suspense>);
    });

    const openBtn = await screen.findByRole("button", { name: /Schedule Game/i });
    fireEvent.click(openBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Schedule Exhibition Game/i })).toBeInTheDocument();

    const closeBtn = screen.getByLabelText("Close");
    fireEvent.click(closeBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("toggles host designation and creates exhibition match in modal", async () => {
    mockCanManage = true;
    await act(async () => {
      render(<Suspense><TeamSchedulePage params={Promise.resolve({ id: "falcons" })} /></Suspense>);
    });

    const openBtn = await screen.findByRole("button", { name: /Schedule Game/i });
    fireEvent.click(openBtn);

    const awayBtn = screen.getByRole("button", { name: /Away \/ Visiting Team/i });
    fireEvent.click(awayBtn);

    const gameTypeSelect = screen.getByLabelText(/Game Type/i);
    fireEvent.change(gameTypeSelect, { target: { value: "playoff" } });
    expect(gameTypeSelect).toHaveValue("playoff");

    const opponentInput = screen.getByLabelText(/Opponent Team Name/i);
    fireEvent.change(opponentInput, { target: { value: "Gotham Rogues" } });

    const submitBtn = screen.getByRole("button", { name: /Confirm & Schedule Game/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});






