import React from "react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, renderHook, screen } from "@testing-library/react";
import { TeamLeagueScope, useLeague } from "@/lib/leagueContext";

vi.mock("@/lib/firebase", () => ({ db: {}, auth: {} }));

const state = vi.hoisted(() => ({ team: { id: "falcons", name: "Falcons", subscription: { status: "active" } } as Record<string, unknown> }));
vi.mock("@/lib/teamRecord", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/teamRecord")>(),
  useTeamRecord: () => ({ team: state.team, resolved: true }),
}));

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

describe("Independent team league scope", () => {
  beforeEach(() => { state.team = { id: "falcons", name: "Falcons", subscription: { status: "active" } }; });

  it.each(["falcons", "customer-123", "team_live_hawks"])("isolates %s from the default demo context", (teamId) => {
    render(<TeamLeagueScope teamId={teamId}><Probe /></TeamLeagueScope>);
    const state = JSON.parse(screen.getByRole("status").textContent!);
    expect(state).toMatchObject({
      demo: false, leagueId: "", name: "Falcons",
      subscription: null, archived: false, readOnly: false,
      rules: { playersOnField: 5, periodType: "halves", periodsCount: 2, periodDurationMinutes: 20 },
    });
  });

  it("leaves demo teams in their original league context", () => {
    render(<TeamLeagueScope teamId="team_kc"><Probe /></TeamLeagueScope>);
    expect(JSON.parse(screen.getByRole("status").textContent!)).toMatchObject({ demo: true, leagueId: "default" });
  });

  it("preserves the parent context for a stored league-owned customer team", () => {
    state.team = { id: "customer-123", leagueId: "customer-league" };
    render(<TeamLeagueScope teamId="customer-123"><Probe /></TeamLeagueScope>);
    expect(JSON.parse(screen.getByRole("status").textContent!)).toMatchObject({ demo: true, leagueId: "default" });
  });

  it("uses the independent team's stored name and rules", () => {
    state.team = { id: "hawks", name: "Hawks", isStandalone: true, rules: { playersOnField: 7, periodDurationMinutes: 15 } };
    render(<TeamLeagueScope teamId="hawks"><Probe /></TeamLeagueScope>);
    expect(JSON.parse(screen.getByRole("status").textContent!)).toMatchObject({
      demo: false, leagueId: "", name: "Hawks", rules: { playersOnField: 7, periodDurationMinutes: 15 },
    });
  });

  it("rejects league and demo mutations instead of writing to the selected league", async () => {
    const { result } = renderHook(() => useLeague(), {
      wrapper: ({ children }) => <TeamLeagueScope teamId="falcons">{children}</TeamLeagueScope>,
    });
    await expect(result.current.updateSettings({ leagueName: "Demo mutation" })).rejects.toThrow("independent team");
    await expect(result.current.updateRules({ playersOnField: 7 })).rejects.toThrow("independent team");
    expect(() => result.current.resetDemoSession()).toThrow("independent team");
  });
});
