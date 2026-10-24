import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import RoleSwitcherContent from "@/components/RoleSwitcherContent";

const mocks = vi.hoisted(() => ({ reset: vi.fn(), reload: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/league/default" }));
vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({ user: null, role: "league_admin", isLeagueAdmin: true, setDevRole: vi.fn() }),
}));
vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({ isDemoLeague: true, openCustomizer: vi.fn(), resetDemoSession: mocks.reset }),
}));
vi.mock("@/lib/demoSandbox", () => ({
  getSandboxPlayers: () => [], getSandboxTeams: () => [],
  subscribeDemoSandbox: () => () => {},
}));
vi.mock("@/lib/yorkTeamData", () => ({ isYorkMatch: () => false, isYorkTeam: () => false }));

const originalLocation = window.location;
afterEach(() => Object.defineProperty(window, "location", { configurable: true, value: originalLocation }));

it("waits for lazy sandbox reset before reloading the page", async () => {
  let finish!: () => void;
  mocks.reset.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { hostname: "flagos.app", search: "", reload: mocks.reload },
  });
  render(<RoleSwitcherContent />);
  expect(screen.getByRole("button", { name: "League Admin" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Spectator" })).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(screen.getByRole("button", { name: "Reset session" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm reset session" }));
  expect(mocks.reset).toHaveBeenCalledOnce();
  expect(mocks.reload).not.toHaveBeenCalled();
  await act(async () => { finish(); });
  expect(mocks.reload).toHaveBeenCalledOnce();
});
