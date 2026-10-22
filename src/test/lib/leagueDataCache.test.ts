import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cachedLeagueRequest, invalidateLeagueData, notifyDataChanged } from "@/lib/leagueDataCache";

describe("league data cache", () => {
  beforeEach(() => {
    invalidateLeagueData();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shares in-flight requests and caches result for TTL", async () => {
    const loader = vi.fn().mockResolvedValue([{ id: "play_1" }]);
    const firstPromise = cachedLeagueRequest("plays:league_test", loader, 60_000);
    const secondPromise = cachedLeagueRequest("plays:league_test", loader, 60_000);

    expect(secondPromise).toBe(firstPromise);
    const result = await firstPromise;
    expect(result).toEqual([{ id: "play_1" }]);
    expect(loader).toHaveBeenCalledTimes(1);

    // 59 seconds later, still cached
    await vi.advanceTimersByTimeAsync(59_000);
    const cachedResult = await cachedLeagueRequest("plays:league_test", loader, 60_000);
    expect(cachedResult).toEqual([{ id: "play_1" }]);
    expect(loader).toHaveBeenCalledTimes(1);

    // After 60 seconds TTL expires, refetches
    await vi.advanceTimersByTimeAsync(2_000);
    await cachedLeagueRequest("plays:league_test", loader, 60_000);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("invalidates all data or specific league data", async () => {
    const loaderA = vi.fn().mockResolvedValue([{ id: "team_a" }]);
    const loaderB = vi.fn().mockResolvedValue([{ id: "team_b" }]);

    await cachedLeagueRequest("teams:league_a", loaderA, 60_000);
    await cachedLeagueRequest("teams:league_b", loaderB, 60_000);
    expect(loaderA).toHaveBeenCalledTimes(1);
    expect(loaderB).toHaveBeenCalledTimes(1);

    // Invalidate only league_a
    invalidateLeagueData("teams:league_a");
    // Or invalidate all
    invalidateLeagueData();

    await cachedLeagueRequest("teams:league_a", loaderA, 60_000);
    expect(loaderA).toHaveBeenCalledTimes(2);
  });

  it("evicts immediately if loader rejects so errors are not cached", async () => {
    const failingLoader = vi.fn().mockRejectedValue(new Error("Network glitch"));
    await expect(cachedLeagueRequest("err_key", failingLoader, 60_000)).rejects.toThrow("Network glitch");

    const succeedingLoader = vi.fn().mockResolvedValue(["success"]);
    const res = await cachedLeagueRequest("err_key", succeedingLoader, 60_000);
    expect(res).toEqual(["success"]);
    expect(succeedingLoader).toHaveBeenCalledTimes(1);
  });

  it("evicts cache on notifyDataChanged", async () => {
    const loader = vi.fn().mockResolvedValue(["item"]);
    await cachedLeagueRequest("data_key", loader, 60_000);
    expect(loader).toHaveBeenCalledTimes(1);

    notifyDataChanged();
    await cachedLeagueRequest("data_key", loader, 60_000);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
