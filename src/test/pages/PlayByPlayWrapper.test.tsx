import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import PlayByPlayWrapper from "@/app/matches/[id]/play-by-play/page";

const { authState } = vi.hoisted(() => ({
  authState: { isLeagueAdmin: false, loading: false },
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({ ...authState }),
}));

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({ isDemoLeague: true, activeLeagueId: "demo" }),
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
}));

vi.mock("@/lib/demoSandbox", () => ({
  getSandboxMatch: () => ({
    id: "match_demo_101",
    status: "in_progress",
  }),
  getSandboxMatches: () => [],
  subscribeDemoSandbox: () => () => {},
  isDemoMatch: () => true,
}));

vi.mock("@/app/matches/[id]/play-by-play/AdminView", () => ({
  default: () => <div>sync manager</div>,
}));
vi.mock("@/components/AsyncPlayByPlayManager", () => ({
  default: () => <div>async manager</div>,
}));
vi.mock("@/app/matches/[id]/play-by-play/ViewerView", () => ({
  default: () => <div>viewer</div>,
}));

describe("PlayByPlayWrapper role access", () => {
  const params = Promise.resolve({ id: "match_demo_101" });

  it("shows the viewer in an embedded sandbox for non-league-admin roles and updates when the role changes", async () => {
    window.history.replaceState(
      {},
      "",
      "/matches/match_demo_101/play-by-play?embed=true&demo=true&mode=sync"
    );
    authState.isLeagueAdmin = false;

    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        <Suspense fallback={<div>loading</div>}>
          <PlayByPlayWrapper params={params} />
        </Suspense>
      );
    });

    expect(await screen.findByText("viewer")).toBeInTheDocument();

    authState.isLeagueAdmin = true;
    await act(async () => {
      result.rerender(
        <Suspense fallback={<div>loading</div>}>
          <PlayByPlayWrapper params={params} />
        </Suspense>
      );
    });

    expect(await screen.findByText("sync manager")).toBeInTheDocument();
  });

  it("renders the async manager only for league admins", async () => {
    window.history.replaceState(
      {},
      "",
      "/matches/match_demo_101/play-by-play?embed=true&demo=true&mode=async"
    );
    authState.isLeagueAdmin = true;

    await act(async () => {
      render(
        <Suspense fallback={<div>loading</div>}>
          <PlayByPlayWrapper params={params} />
        </Suspense>
      );
    });

    expect(await screen.findByText("async manager")).toBeInTheDocument();
  });
});
