import { describe, it, expect, vi } from "vitest";
import { announceLeagueAccess, LEAGUE_ACCESS_GRANTED_EVENT } from "@/lib/leagueAccess";

describe("leagueAccess", () => {
  it("dispatches LEAGUE_ACCESS_GRANTED_EVENT when grantedLeagueIds are present", () => {
    const handler = vi.fn();
    window.addEventListener(LEAGUE_ACCESS_GRANTED_EVENT, handler);

    announceLeagueAccess({ grantedLeagueIds: ["league_1", "league_2"] });
    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ leagueIds: ["league_1", "league_2"] });

    window.removeEventListener(LEAGUE_ACCESS_GRANTED_EVENT, handler);
  });

  it("ignores non-array or empty results", () => {
    const handler = vi.fn();
    window.addEventListener(LEAGUE_ACCESS_GRANTED_EVENT, handler);

    announceLeagueAccess(null);
    announceLeagueAccess("string");
    announceLeagueAccess({});
    announceLeagueAccess({ grantedLeagueIds: [] });
    announceLeagueAccess({ grantedLeagueIds: [""] });

    expect(handler).not.toHaveBeenCalled();
    window.removeEventListener(LEAGUE_ACCESS_GRANTED_EVENT, handler);
  });
});
