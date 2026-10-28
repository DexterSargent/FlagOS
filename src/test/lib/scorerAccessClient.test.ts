import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scorerAccessRequest, useScorerGrant } from "@/lib/scorerAccessClient";
import * as secureWrites from "@/lib/secureWrites";
import * as authContext from "@/lib/authContext";
import * as firestore from "firebase/firestore";

vi.mock("@/lib/secureWrites", () => ({
  authenticatedPost: vi.fn(),
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(),
}));

describe("scorerAccessClient", () => {
  const origLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).location;
    window.location = {
      ...origLocation,
      href: "https://flagos.ca/matches/game_1",
      search: "",
      replace: vi.fn(),
    } as any;
    (authContext.useAuth as any).mockReturnValue({
      user: { uid: "user_scorer_1", email: "scorer@flagos.ca" },
      loading: false,
    });
  });

  afterEach(() => {
    window.location = origLocation as any;
  });

  it("calls authenticatedPost with action and parameters", async () => {
    vi.mocked(secureWrites.authenticatedPost).mockResolvedValueOnce({
      data: { expiresAt: 1750000000 },
    });

    const result = await scorerAccessRequest("redeem", { matchId: "m1", token: "tok123" });
    expect(result).toEqual({ expiresAt: 1750000000 });
    expect(secureWrites.authenticatedPost).toHaveBeenCalledWith(
      "/api/scorer-access",
      { action: "redeem", matchId: "m1", token: "tok123" },
      "Scorer access request failed."
    );
  });

  it("redeems pending scorer token from url when user is logged in", async () => {
    window.location.search = "?scorer=secret_token";
    vi.mocked(secureWrites.authenticatedPost).mockResolvedValueOnce({
      data: { expiresAt: Date.now() + 60_000 },
    });

    renderHook(() => useScorerGrant("game_1", true));

    await waitFor(() => {
      expect(secureWrites.authenticatedPost).toHaveBeenCalledWith(
        "/api/scorer-access",
        { action: "redeem", matchId: "game_1", token: "secret_token" },
        "Scorer access request failed."
      );
    });
  });

  it("indicates needsSignIn when scorer token is present but user is not logged in", () => {
    window.location.search = "?scorer=secret_token";
    (authContext.useAuth as any).mockReturnValue({
      user: null,
      loading: false,
    });

    const { result } = renderHook(() => useScorerGrant("game_1", true));
    expect(result.current.needsSignIn).toBe(true);
    expect(result.current.hasGrant).toBe(false);
  });

  it("subscribes to scorer grant snapshot and updates hasGrant state", async () => {
    const futureTime = Date.now() + 3600_000;
    vi.mocked(firestore.onSnapshot).mockImplementation((_docRef, onNext: any) => {
      onNext({
        exists: () => true,
        get: (field: string) => (field === "expiresAt" ? { toMillis: () => futureTime } : null),
      });
      return vi.fn();
    });

    const { result } = renderHook(() => useScorerGrant("game_1", true));

    await waitFor(() => {
      expect(result.current.hasGrant).toBe(true);
      expect(result.current.expiresAt).toBe(futureTime);
      expect(result.current.loading).toBe(false);
    });
  });
});
