import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import TeamNavBar from "./TeamNavBar";
import TeamStatsCustomizerModal from "./TeamStatsCustomizerModal";
import { calculateTeamComprehensiveStats } from "@/lib/teamStatsCalculator";
import { getReadableTextColor } from "@/lib/teamColors";

vi.mock("next/navigation", () => ({ usePathname: () => "/teams/team_buf/roster" }));
vi.mock("@/lib/authContext", () => ({ useAuth: () => ({
  isTeamAdmin: () => true, isLeagueAdmin: false, userProfile: { managedTeamId: "team_buf" },
}) }));
vi.mock("@/lib/teamColorContext", () => ({ useTeamColors: () => ({
  team: { name: "Buffalo" }, palette: { primary: "#00338D", secondary: "#C60C30", tertiary: "#FFFFFF" },
}) }));
vi.mock("@/lib/leagueContext", () => ({ useLeague: () => ({ isDemoLeague: true }) }));
vi.mock("@/lib/embedState", () => ({ useEmbedState: () => ({ embedQuery: "" }) }));
vi.mock("@/components/SiteControls", () => ({ default: () => null }));
vi.mock("@/components/TeamAssets", () => ({ TeamLogo: () => <span aria-hidden="true" /> }));

afterEach(cleanup);

describe("team portal polish", () => {
  it("keeps all five coach tabs named, with readable mobile labels", () => {
    render(<TeamNavBar teamId="team_buf" />);
    for (const name of ["Overview", "Schedule", "Roster", "Stats", "Playbook"]) {
      const tab = screen.getByRole("link", { name });
      expect(tab.className).toContain("text-[10px]");
      expect(tab.className).not.toContain("text-[9px]");
    }
    expect(screen.getByRole("link", { name: "Roster" })).toHaveAttribute("aria-current", "page");
  });

  it.each(["#00338D", "#008E97", "#203731"])("calculates the save foreground for %s and exposes selectable stats", (primaryColor) => {
    render(<TeamStatsCustomizerModal isOpen onClose={vi.fn()} onSave={vi.fn()}
      teamName="Team" primaryColor={primaryColor} teamStats={calculateTeamComprehensiveStats("team_buf")} />);
    expect(screen.getByRole("button", { name: "Save Stats" })).toHaveStyle({
      backgroundColor: primaryColor, color: getReadableTextColor(primaryColor, "#FFFFFF"),
    });
    const record = screen.getByRole("button", { name: "Record (W-L-T)" });
    expect(record).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(record);
    expect(record).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText(/safely calculated in the background/)).not.toBeInTheDocument();
  });
});
