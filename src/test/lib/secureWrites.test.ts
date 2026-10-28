import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  authenticatedPost,
  createSecureRecord,
  requestPrivateData,
  clearPrivateDataCache,
  RequestStatusError,
  THROTTLE_EVENT,
} from "@/lib/secureWrites";
import { auth } from "@/lib/firebase";

vi.mock("@/lib/publicTeamCache", () => ({
  invalidatePublicTeamData: vi.fn(),
}));

describe("secureWrites", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    clearPrivateDataCache();
    (auth as any).currentUser = {
      uid: "user_test_123",
      getIdToken: vi.fn().mockResolvedValue("test_token_abc"),
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("throws if user is not authenticated", async () => {
    (auth as any).currentUser = null;
    await expect(
      authenticatedPost("/api/test", { a: 1 }, "Error fallback")
    ).rejects.toThrow("Sign in before continuing.");
  });

  it("successfully performs an authenticated post request", async () => {
    const mockResponseData = { success: true, count: 5 };
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce(mockResponseData),
    });

    const result = await authenticatedPost("/api/test", { foo: "bar" }, "Error fallback");
    expect(result).toEqual(mockResponseData);
    expect(global.fetch).toHaveBeenCalledWith("/api/test", {
      method: "POST",
      headers: {
        Authorization: "Bearer test_token_abc",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ foo: "bar" }),
    });
  });

  it("throws a RequestStatusError with backend error message on non-ok status", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers(),
      json: vi.fn().mockResolvedValueOnce({ error: "Invalid team parameters" }),
    });

    await expect(
      authenticatedPost("/api/test", {}, "Default error message")
    ).rejects.toThrow("Invalid team parameters");
  });

  it("dispatches THROTTLE_EVENT and retries on 429 status for private reads", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    // First call returns 429, second returns 200
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ "Retry-After": "1" }),
        json: vi.fn().mockResolvedValueOnce({ error: "Too many requests" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce({ data: "retried_success" }),
      });

    const result = await authenticatedPost("/api/security/private", { action: "team" }, "Fallback");
    expect(result).toEqual({ data: "retried_success" });
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: THROTTLE_EVENT,
      })
    );
  });

  it("creates a secure record and returns the new record ID", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({ id: "rec_new_123" }),
    });

    const id = await createSecureRecord("team", { name: "Apex Falcons", leagueId: "league_apex" });
    expect(id).toBe("rec_new_123");
  });

  it("throws if createSecureRecord does not return an id", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValueOnce({}),
    });

    await expect(
      createSecureRecord("team", { name: "Apex Falcons" })
    ).rejects.toThrow("The secure write did not return a record ID.");
  });

  it("caches cacheable private data requests and deduplicates concurrent calls", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: { name: "Falcons" } }),
    });

    const req1 = requestPrivateData("team", { id: "team_falcons" });
    const req2 = requestPrivateData("team", { id: "team_falcons" });

    const [res1, res2] = await Promise.all([req1, req2]);
    expect(res1).toEqual({ name: "Falcons" });
    expect(res2).toEqual({ name: "Falcons" });
    // Should only fetch once because of in-flight / cached request
    expect(global.fetch).toHaveBeenCalledTimes(1);

    clearPrivateDataCache();
    await requestPrivateData("team", { id: "team_falcons" });
    // After clear, fetches again
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
