import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RoleSwitcherBar from "@/components/RoleSwitcherBar";

const state = vi.hoisted(() => ({ pathname: "/schedule", league: { isDemoLeague: true, loading: false } }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("next/dynamic", () => ({ default: () => () => <div>Persona simulator</div> }));
vi.mock("@/lib/leagueContext", () => ({ useLeague: () => state.league }));
vi.mock("@/lib/embedState", () => ({ useEmbedState: () => ({ embedQuery: false }) }));

describe("Role switcher visibility", () => {
  beforeEach(() => {
    state.pathname = "/schedule";
    state.league = { isDemoLeague: true, loading: false };
  });

  it.each(["/schedule", "/stats", "/teams", "/league/default", "/teams/team_kc"])(
    "shows on demo league page %s",
    (path) => {
      state.pathname = path;
      render(<RoleSwitcherBar />);
      expect(screen.getByText("Persona simulator")).toBeInTheDocument();
    },
  );

  it.each(["/schedule", "/league/york", "/stats"])("hides on %s when a real league is active", (path) => {
    state.pathname = path;
    state.league = { isDemoLeague: false, loading: false };
    render(<RoleSwitcherBar />);
    expect(screen.queryByText("Persona simulator")).toBeNull();
  });

  it.each(["/profile", "/account", "/leagues", "/admin", "/", "/pricing"])("hides on non-league page %s", (path) => {
    state.pathname = path;
    render(<RoleSwitcherBar />);
    expect(screen.queryByText("Persona simulator")).toBeNull();
  });

  it("hides while the active league is still resolving", () => {
    state.league = { isDemoLeague: true, loading: true };
    render(<RoleSwitcherBar />);
    expect(screen.queryByText("Persona simulator")).toBeNull();
  });
});
