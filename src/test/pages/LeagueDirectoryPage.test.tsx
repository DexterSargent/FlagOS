import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LeagueDirectoryPage from "@/app/leagues/page";
import { invalidateLeagueData } from "@/lib/leagueDataCache";

// Mock Firestore
const mockGetDocs = vi.fn();
vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name) => ({ name })),
  query: vi.fn((ref) => ref),
  limit: vi.fn(),
  getDocs: (...args: any[]) => mockGetDocs(...args),
}));

const mockSwitchLeague = vi.fn();

// Mock LeagueContext
vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    activeLeagueId: "league_lakeshore",
    settings: {
      id: "league_lakeshore",
      leagueName: "Lakeshore Flag League",
      shortcode: "FLPC",
      tagline: "The Flag Football Operating System",
      seasonTitle: "2026 Championship",
      visibility: "public",
      rulesFormat: "5v5 Non-Contact",
      division: "Women's Flag",
      defaultLocation: "Metropolitan Sports Complex",
      primaryColor: "#0284c7",
      accentColor: "#38bdf8",
      rules: {
        playersOnField: 5,
        enableFreeAgents: true,
      },
    },
    userLeagues: [
      {
        id: "league_secret",
        name: "Secret Private Circuit",
        visibility: "private",
      },
      {
        id: "league_user_created",
        name: "Metro West Flag League",
        shortcode: "MWFL",
        visibility: "public",
        teamCount: 6,
        rulesFormat: "7v7 Screen",
        division: "Co-Ed",
        primaryColor: "#10b981",
        accentColor: "#059669",
      },
    ],
    switchLeague: mockSwitchLeague,
    subscription: null,
    isDemoLeague: true,
    isLeagueArchived: false,
    isSubscriptionPastDue: false,
    resumeSubscription: vi.fn(),
  }),
}));

// Mock AuthContext
vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({
    user: { uid: "test-user-1", email: "athlete@example.com" },
    role: "user",
    isLeagueAdmin: false,
    isTeamAdmin: () => false,
    isPlayer: false,
    playerData: null,
    canRegisterAsPlayer: true,
    isAuthorized: true,
    playerTeamId: null,
    managedTeamId: null,
  }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/leagues",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("League Directory & Proximity Finder Suite (LeagueDirectoryPage)", () => {
  beforeEach(() => {
    invalidateLeagueData();
    vi.clearAllMocks();
    mockGetDocs.mockResolvedValue({ docs: [] });
  });

  it("renders page hero and live public leagues without any fake mock circuits while excluding private leagues", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    // Public active league and user league are present in directory headings
    expect(screen.getByRole("heading", { name: "Lakeshore Flag League" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Metro West Flag League" })).toBeInTheDocument();

    // Fake mock circuits are completely absent
    expect(screen.queryByText("Toronto Flag League")).toBeNull();
    expect(screen.queryByText("GTA Premier 5v5 Flag Championship")).toBeNull();
    expect(screen.queryByText("Hamilton Steel City Flag Circuit")).toBeNull();

    // The shared demo league is never listed
    expect(screen.queryByText("FlagOS Demo League")).toBeNull();

    // Private leagues must be strictly excluded
    expect(screen.queryByText("Secret Private Circuit")).toBeNull();
  });

  it("fetches and displays real existing leagues from Firestore with FlagOS League badge and team counts", async () => {
    mockGetDocs.mockImplementation(async (ref: { name?: string }) => {
      if (ref?.name === "leagues") {
        return {
          docs: [
            {
              id: "league_ontario_live_1",
              data: () => ({
                leagueName: "Ontario Premier Flag Championship",
                shortcode: "OPFC",
                tagline: "Live Competitive Gridiron",
                seasonTitle: "2026 Live Season",
                visibility: "public",
                directoryListed: true,
                primaryColor: "#e11d48",
                accentColor: "#fb7185",
                rulesFormat: "7v7 Screen",
                division: "Men's Open",
                rules: { playersOnField: 7, contactLevel: "screen" },
                defaultLocation: "Downsview Park Stadium",
              }),
            },
          ],
        };
      }
      if (ref?.name === "teams") {
        return {
          docs: [
            { data: () => ({ leagueId: "league_ontario_live_1" }) },
            { data: () => ({ leagueId: "league_ontario_live_1" }) },
            { data: () => ({ leagueId: "league_ontario_live_1" }) },
            { data: () => ({ leagueId: "league_ontario_live_1" }) },
          ],
        };
      }
      return { docs: [] };
    });

    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Ontario Premier Flag Championship" })).toBeInTheDocument();
    });

    expect(screen.getByText("OPFC")).toBeInTheDocument();
    expect(screen.getByText("Downsview Park Stadium")).toBeInTheDocument();
    expect(screen.getByText("4 Teams")).toBeInTheDocument();
    expect(screen.getAllByText("FlagOS League").length).toBeGreaterThan(0);
  });

  it("allows users to click Explore Hub to navigate directly to league portal", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    const hubLinks = screen.getAllByRole("link", { name: /Explore Hub/i });
    expect(hubLinks.length).toBeGreaterThan(0);
  });

  it("filters directory with two clean tabs: All Leagues vs My Leagues", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    // Check tabs exist
    const allBtns = screen.getAllByRole("button", { name: /All Leagues/i });
    const myLeaguesBtns = screen.getAllByRole("button", { name: /My Leagues/i });
    expect(allBtns.length).toBeGreaterThan(0);
    expect(myLeaguesBtns.length).toBeGreaterThan(0);

    // Click "My Leagues" tab button
    const myLeaguesTabBtn = myLeaguesBtns[myLeaguesBtns.length - 1];
    fireEvent.click(myLeaguesTabBtn);

    // Only user's own leagues appear in card headings
    expect(screen.getByRole("heading", { name: "Metro West Flag League" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Lakeshore Flag League" })).toBeNull();

    // Click back to "All Leagues" tab button
    const allTabBtn = allBtns[allBtns.length - 1];
    fireEvent.click(allTabBtn);

    expect(screen.getByRole("heading", { name: "Lakeshore Flag League" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Metro West Flag League" })).toBeInTheDocument();
  });

  it("does not render quick regions buttons", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    // Quick regions preset buttons are removed
    expect(screen.queryByText(/Quick Regions:/i)).toBeNull();
    expect(screen.queryByRole("button", { name: "Hamilton / Niagara" })).toBeNull();
    expect(screen.queryByRole("button", { name: "London / SW Ontario" })).toBeNull();
  });

  it("filters leagues by multi-select ruleset format dropdown (4v4 to 8v8)", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    // Both 5v5 (FlagOS Live Premier) and 7v7 (Metro West) are present initially
    expect(screen.getByRole("heading", { name: "Lakeshore Flag League" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Metro West Flag League" })).toBeInTheDocument();

    // Open format multi-select dropdown
    const formatBtn = screen.getByRole("button", { name: /Format:/i });
    fireEvent.click(formatBtn);

    // Dropdown listbox should be visible with options 4v4 to 8v8
    const listbox = screen.getByRole("listbox", { name: /Filter by Ruleset Format/i });
    expect(listbox).toBeInTheDocument();
    expect(within(listbox).getByRole("option", { name: /4v4/i })).toBeInTheDocument();
    expect(within(listbox).getByRole("option", { name: /5v5/i })).toBeInTheDocument();
    expect(within(listbox).getByRole("option", { name: /6v6/i })).toBeInTheDocument();
    expect(within(listbox).getByRole("option", { name: /7v7/i })).toBeInTheDocument();
    expect(within(listbox).getByRole("option", { name: /8v8/i })).toBeInTheDocument();

    // Select 7v7 format
    const option7v7 = within(listbox).getByRole("option", { name: /7v7/i });
    fireEvent.click(option7v7);

    // Metro West (7v7) remains, FlagOS Live Premier (5v5) is filtered out
    expect(screen.getByRole("heading", { name: "Metro West Flag League" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Lakeshore Flag League" })).toBeNull();

    // Also select 5v5 format
    const option5v5 = within(listbox).getByRole("option", { name: /5v5/i });
    fireEvent.click(option5v5);

    // Now both 5v5 and 7v7 match
    expect(screen.getByRole("heading", { name: "Metro West Flag League" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Lakeshore Flag League" })).toBeInTheDocument();

    // Click Clear button in dropdown
    const clearBtn = within(listbox).getByRole("button", { name: "Clear" });
    fireEvent.click(clearBtn);

    // All leagues displayed
    expect(screen.getByRole("heading", { name: "Metro West Flag League" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Lakeshore Flag League" })).toBeInTheDocument();
  });

  it("filters circuits by keyword search (league name or location)", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by city/i);
    fireEvent.change(searchInput, { target: { value: "Metro West" } });

    expect(screen.getByRole("heading", { name: "Metro West Flag League" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Lakeshore Flag League" })).toBeNull();
  });

  it("filters by division (e.g. Women's Flag)", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    const divisionSelect = screen.getByDisplayValue("All Divisions");
    fireEvent.change(divisionSelect, { target: { value: "womens" } });

    expect(screen.getByRole("heading", { name: "Lakeshore Flag League" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Metro West Flag League" })).toBeNull();
  });

  it("switches view modes between Cards, Venues, and Compare Table", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    // Switch to Venues view
    const venuesBtn = screen.getByRole("button", { name: /Venues/i });
    fireEvent.click(venuesBtn);
    expect(screen.getAllByText(/Leagues at this venue/i).length).toBeGreaterThan(0);

    // Switch to Compare Table view
    const tableBtn = screen.getByRole("button", { name: /Compare/i });
    fireEvent.click(tableBtn);
    expect(screen.getByText("League & Format")).toBeInTheDocument();
    expect(screen.getByText("Team Fee")).toBeInTheDocument();
  });

  it("opens Contact Commissioner inquiry modal and submits message", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    const inquireBtns = screen.getAllByRole("button", { name: /Inquire/i });
    fireEvent.click(inquireBtns[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Inquire with/i)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Hello Coach\/Commissioner/i);
    fireEvent.change(textarea, { target: { value: "Looking to join as a free agent wide receiver." } });

    const sendBtn = screen.getByRole("button", { name: /Send Inquiry/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/Opening Your Email App/i)).toBeInTheDocument();
    });
  });

  it("displays Contact commissioner for more details when fees or amenities are omitted", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    // Fallback text should be present because mock leagues did not set registrationFeePerTeam/individualFee/amenities
    const fallbacks = screen.getAllByText(/Contact commissioner for more details/i);
    expect(fallbacks.length).toBeGreaterThan(0);
  });

  it("renders Explore Hub links with solid green styling and high contrast text", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    const exploreHubLinks = screen.getAllByRole("link", { name: /Explore Hub/i });
    expect(exploreHubLinks.length).toBeGreaterThan(0);
    expect(exploreHubLinks[0]).toHaveStyle({ backgroundColor: "rgb(43, 125, 4)" });
    expect(exploreHubLinks[0]).toHaveStyle({ color: "rgb(255, 255, 255)" });
  });

  it("opens and cancels contact commissioner dialog", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    const inquireButtons = screen.getAllByRole("button", { name: /Inquire/i });
    expect(inquireButtons.length).toBeGreaterThan(0);
    fireEvent.click(inquireButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Cancel/i })).toBeNull();
    });
  });

  it("handles GPS geolocation success, error, and unsupported browser states", async () => {
    const originalGeolocation = navigator.geolocation;
    const mockGetCurrentPosition = vi.fn();

    Object.defineProperty(global.navigator, "geolocation", {
      value: { getCurrentPosition: mockGetCurrentPosition },
      writable: true,
      configurable: true,
    });

    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    const gpsBtn = screen.getByRole("button", { name: /Use My Location/i });

    // 1. Success case
    mockGetCurrentPosition.mockImplementationOnce((success) => {
      success({ coords: { latitude: 43.7, longitude: -79.4 } });
    });
    fireEvent.click(gpsBtn);

    await waitFor(() => {
      expect(screen.getByText(/Your location/i)).toBeInTheDocument();
    });

    // 2. Error case
    mockGetCurrentPosition.mockImplementationOnce((_success, error) => {
      error({ code: 1, message: "User denied" });
    });
    fireEvent.click(gpsBtn);

    await waitFor(() => {
      expect(screen.getByText(/Unable to retrieve location/i)).toBeInTheDocument();
    });

    // 3. Unsupported case
    Object.defineProperty(global.navigator, "geolocation", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    fireEvent.click(gpsBtn);
    await waitFor(() => {
      expect(screen.getByText(/Geolocation is not supported by your browser/i)).toBeInTheDocument();
    });

    // Restore
    Object.defineProperty(global.navigator, "geolocation", {
      value: originalGeolocation,
      writable: true,
      configurable: true,
    });
  });

  it("clears search query using the clear (X) button and resets all filters using Reset All", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by city/i);
    fireEvent.change(searchInput, { target: { value: "Lakeshore" } });

    // Lakeshore is shown, Metro West is filtered out
    expect(screen.getByRole("heading", { name: "Lakeshore Flag League" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Metro West Flag League" })).toBeNull();

    // Click clear search (X) button
    const clearSearchBtn = searchInput.parentElement?.querySelector("button");
    expect(clearSearchBtn).not.toBeNull();
    fireEvent.click(clearSearchBtn!);

    expect(screen.getByRole("heading", { name: "Metro West Flag League" })).toBeInTheDocument();

    // Now change tier filter to trigger Reset All button
    const tierSelect = screen.getByDisplayValue("All Tiers");
    fireEvent.change(tierSelect, { target: { value: "Premier / Elite" } });

    const resetAllBtn = screen.getByRole("button", { name: /Reset All/i });
    expect(resetAllBtn).toBeInTheDocument();
    fireEvent.click(resetAllBtn);

    expect(screen.queryByRole("button", { name: /Reset All/i })).toBeNull();
  });

  it("toggles categories between All Leagues and My Leagues, and changes radius and sort options", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    // Switch to My Leagues
    const myLeaguesBtn = screen.getAllByRole("button", { name: /My Leagues/i })[0];
    fireEvent.click(myLeaguesBtn);

    // Switch back to All Leagues
    const allLeaguesBtn = screen.getAllByRole("button", { name: /All Leagues/i })[0];
    fireEvent.click(allLeaguesBtn);

    // Change Radius
    const radiusSelect = screen.getByDisplayValue("Any Distance");
    fireEvent.change(radiusSelect, { target: { value: "25" } });
    expect(radiusSelect).toHaveValue("25");

    // Change Sort by Fee and Sort by Name
    const sortSelect = screen.getByDisplayValue("Closest First");
    fireEvent.change(sortSelect, { target: { value: "fee" } });
    expect(sortSelect).toHaveValue("fee");

    fireEvent.change(sortSelect, { target: { value: "name" } });
    expect(sortSelect).toHaveValue("name");
  });

  it("closes format dropdown when clicking outside", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    const formatBtn = screen.getByRole("button", { name: /Format:/i });
    fireEvent.click(formatBtn);

    expect(screen.getByRole("listbox", { name: /Filter by Ruleset Format/i })).toBeInTheDocument();

    // Click outside on hero heading
    fireEvent.mouseDown(screen.getByRole("heading", { name: /Find a Flag Football League/i }));

    expect(screen.queryByRole("listbox", { name: /Filter by Ruleset Format/i })).toBeNull();
  });

  it("handles contact commissioner topic selection and closing modal via X icon", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    const inquireBtns = screen.getAllByRole("button", { name: /Inquire/i });
    fireEvent.click(inquireBtns[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Change topic
    const topicSelect = screen.getByDisplayValue("Looking for a team (Free Agent)");
    fireEvent.change(topicSelect, { target: { value: "Registering an Entire Squad" } });
    expect(topicSelect).toHaveValue("Registering an Entire Squad");

    // Close via X button in header
    const dialog = screen.getByRole("dialog");
    const closeXBtn = dialog.querySelector("button.p-1\\.5");
    expect(closeXBtn).not.toBeNull();
    fireEvent.click(closeXBtn!);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("displays rich league metadata including amenities, deadline, season dates, and game day/time", async () => {
    mockGetDocs.mockImplementation(async (ref: { name?: string }) => {
      if (ref?.name === "leagues") {
        return {
          docs: [
            {
              id: "league_rich_metadata",
              data: () => ({
                leagueName: "Rich Metadata Flag Circuit",
                shortcode: "RMFC",
                tagline: "Premier Flag Circuit",
                seasonTitle: "Summer 2026",
                visibility: "public",
                directoryListed: true,
                gameDay: "Saturday",
                gameTimeWindow: "10:00 AM - 4:00 PM",
                registrationDeadline: "May 15, 2026",
                seasonDates: "June 1 - August 30",
                rulesFormat: "5v5 Non-Contact",
                division: "Co-Ed",
                registrationFeePerTeam: 950,
                amenities: ["Official NFL Flags", "4K Video Replays", "Certified Officials"],
                venue: {
                  name: "Central Sports Dome",
                  city: "Toronto",
                  postalCode: "M5V 2T6",
                  surface: "Indoor Turf",
                  latitude: 43.65,
                  longitude: -79.38,
                },
              }),
            },
          ],
        };
      }
      return { docs: [] };
    });

    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Rich Metadata Flag Circuit" })).toBeInTheDocument();
    });

    expect(screen.getByText("Official NFL Flags")).toBeInTheDocument();
    expect(screen.getByText("4K Video Replays")).toBeInTheDocument();
    expect(screen.getByText("Certified Officials")).toBeInTheDocument();
    expect(screen.getByText("Indoor Turf")).toBeInTheDocument();
    expect(screen.getByText("May 15, 2026")).toBeInTheDocument();
    expect(screen.getByText("June 1 - August 30")).toBeInTheDocument();
  });
});



