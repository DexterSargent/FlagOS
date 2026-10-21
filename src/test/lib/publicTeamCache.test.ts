import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cachedPublicTeamRequest, invalidatePublicTeamData } from "@/lib/publicTeamCache";

describe("public team request cache", () => {
  beforeEach(() => {
    invalidatePublicTeamData();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("shares an in-flight request and expires 30 seconds after completion", async () => {
    const load = vi.fn().mockResolvedValue({ wins: 6 });
    const first = cachedPublicTeamRequest("team-a:2026", load);
    expect(cachedPublicTeamRequest("team-a:2026", load)).toBe(first);
    await first;
    await vi.advanceTimersByTimeAsync(29_999);
    await cachedPublicTeamRequest("team-a:2026", load);
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2);
    await cachedPublicTeamRequest("team-a:2026", load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("separates team/season keys and invalidates all public data after writes", async () => {
    const load = vi.fn().mockResolvedValue([]);
    await cachedPublicTeamRequest("team-a:2026", load);
    await cachedPublicTeamRequest("team-b:2026", load);
    await cachedPublicTeamRequest("team-a:2025", load);
    expect(load).toHaveBeenCalledTimes(3);
    invalidatePublicTeamData();
    await cachedPublicTeamRequest("team-a:2026", load);
    expect(load).toHaveBeenCalledTimes(4);
  });

  it("does not let an older failed request evict a newer request after invalidation", async () => {
    let rejectOld!: (error: Error) => void;
    const old = cachedPublicTeamRequest("team", () => new Promise((_, reject) => { rejectOld = reject; }));
    invalidatePublicTeamData();
    const load = vi.fn().mockResolvedValue("updated");
    await cachedPublicTeamRequest("team", load);
    rejectOld(new Error("Old request"));
    await expect(old).rejects.toThrow("Old request");
    expect(await cachedPublicTeamRequest("team", load)).toBe("updated");
    expect(load).toHaveBeenCalledTimes(1);
  });
});
