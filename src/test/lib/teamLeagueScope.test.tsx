import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, renderHook, screen } from "@testing-library/react";
import { TeamLeagueScope, useLeague } from "@/lib/leagueContext";

vi.mock("@/lib/firebase", () => ({ db: {}, auth: {} }));

function Probe() {
  const league = useLeague();
  return <output>{JSON.stringify({
    demo: league.isDemoLeague,
    leagueId: league.activeLeagueId,
    name: league.settings.leagueName,
    rules: league.settings.rules,
    subscription: league.subscription,
    archived: league.isLeagueArchived,
    readOnly: league.isLeagueReadOnly,
  })}</output>;
}

describe("Independent York league scope", () => {
  it.each(["york_lions", "team_york", "york", "yuwffl_lions", "york_wffl"])("isolates %s from the default demo context", (teamId) => {
    render(<TeamLeagueScope teamId={teamId}><Probe /></TeamLeagueScope>);
    const state = JSON.parse(screen.getByRole("status").textContent!);
    expect(state).toMatchObject({
      demo: false, leagueId: "", name: "York Lions Women's Flag Football",
      subscription: null, archived: false, readOnly: false,
      rules: { playersOnField: 5, periodType: "halves", periodsCount: 2, periodDurationMinutes: 20 },
    });
  });

  it("leaves non-York teams in their original league context", () => {
    render(<TeamLeagueScope teamId="team_kc"><Probe /></TeamLeagueScope>);
    expect(JSON.parse(screen.getByRole("status").textContent!)).toMatchObject({ demo: true, leagueId: "default" });
  });

  it("rejects league and demo mutations instead of writing to the selected league", async () => {
    const { result } = renderHook(() => useLeague(), {
      wrapper: ({ children }) => <TeamLeagueScope teamId="york_lions">{children}</TeamLeagueScope>,
    });
    await expect(result.current.updateSettings({ leagueName: "Demo mutation" })).rejects.toThrow("independent team");
    await expect(result.current.updateRules({ playersOnField: 7 })).rejects.toThrow("independent team");
    expect(() => result.current.resetDemoSession()).toThrow("independent team");
  });
});
