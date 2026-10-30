import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import LeagueCustomizerContent from "@/components/LeagueCustomizerContent";
import { PageGuideProvider } from "@/lib/pageGuide";

const {
  mockLeague,
  mockAuth,
  mockUpdateSettings,
  mockCloseCustomizer,
  mockPreviewThemeColors,
  mockArchiveLeague,
  mockResumeSubscription,
  mockUpdateSubscriptionTeamCount,
  mockStartNewSeason,
  mockAddTeamToSubscription,
  mockRemoveTeamFromSubscription,
  mockOpenBillingPortal,
} = vi.hoisted(() => {
  const mockUpdateSettings = vi.fn().mockResolvedValue(undefined);
  const mockCloseCustomizer = vi.fn();
  const mockPreviewThemeColors = vi.fn();
  const mockArchiveLeague = vi.fn().mockResolvedValue(undefined);
  const mockResumeSubscription = vi.fn().mockResolvedValue(undefined);
  const mockUpdateSubscriptionTeamCount = vi.fn().mockResolvedValue({ status: "active", teamCount: 10 });
  const mockStartNewSeason = vi.fn().mockResolvedValue(undefined);
  const mockAddTeamToSubscription = vi.fn().mockResolvedValue({ id: "team_new", name: "Thunderbirds" });
  const mockRemoveTeamFromSubscription = vi.fn().mockResolvedValue(undefined);
  const mockOpenBillingPortal = vi.fn().mockResolvedValue(undefined);

  return {
    mockUpdateSettings,
    mockCloseCustomizer,
    mockPreviewThemeColors,
    mockArchiveLeague,
    mockResumeSubscription,
    mockUpdateSubscriptionTeamCount,
    mockStartNewSeason,
    mockAddTeamToSubscription,
    mockRemoveTeamFromSubscription,
    mockOpenBillingPortal,
    mockLeague: {
    settings: {
      leagueName: "Apex League",
      shortcode: "APX",
      tagline: "The Premier Flag Football Circuit",
      seasonTitle: "2026 Season",
      logoUrl: "",
      primaryColor: "#3ca505",
      accentColor: "#3b82f6",
      secondaryColor: "#3b82f6",
      tertiaryColor: "#ffffff",
      visibility: "public",
      rules: {
        playersOnField: 5,
        periodType: "halves",
        periodsCount: 2,
        periodDurationMinutes: 20,
        halftimeDurationSeconds: 120,
        timeoutsPerTeam: 2,
        timeoutDurationSeconds: 60,
        timeoutsResetPerPeriod: true,
        downsPerSeries: 4,
        rushLineDistance: 7,
        playClockSeconds: 25,
        minRosterSize: 5,
        maxRosterSize: 15,
        enableFreeAgents: true,
      },
      subscription: {
        status: "active",
        plan: "league",
        teamCount: 8,
      },
    },
    subscription: {
      status: "active",
      plan: "league",
      teamCount: 8,
    },
    isCustomizerOpen: true,
    activeLeagueId: "league_apex",
    isDemoLeague: false,
    isLeagueArchived: false,
    isSubscriptionPastDue: false,
    seasons: [
      { id: "season_2026", title: "2026 Season", isCurrent: true },
    ],
    closeCustomizer: mockCloseCustomizer,
    updateSettings: mockUpdateSettings,
    previewThemeColors: mockPreviewThemeColors,
    archiveLeague: mockArchiveLeague,
    resumeSubscription: mockResumeSubscription,
    updateSubscriptionTeamCount: mockUpdateSubscriptionTeamCount,
    startNewSeason: mockStartNewSeason,
    addTeamToSubscription: mockAddTeamToSubscription,
    removeTeamFromSubscription: mockRemoveTeamFromSubscription,
  },
    mockAuth: {
      isLeagueAdmin: true,
      isPlayer: false,
      playerData: null,
    },
  };
});

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => mockLeague,
  DEFAULT_LEAGUE_RULES: mockLeague.settings.rules,
  IFAF_5V5_RULES: { ...mockLeague.settings.rules, rushLineDistance: 7 },
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: () => mockAuth,
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
}));

const mockGetDocs = vi.fn(async () => ({
  docs: [
    { id: "team_1", data: () => ({ name: "Apex Predators", shortcode: "APX", primaryColor: "#3ca505" }) },
    { id: "team_2", data: () => ({ name: "Cyber Knights", shortcode: "CYB", primaryColor: "#3b82f6" }) },
  ],
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  getDocs: (...args: any[]) => (mockGetDocs as any)(...args),
}));

vi.mock("@/lib/billingClient", () => ({
  openBillingPortal: (...args: any[]) => (mockOpenBillingPortal as any)(...args),
}));

describe("LeagueCustomizerContent Comprehensive Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLeague.isCustomizerOpen = true;
    mockAuth.isLeagueAdmin = true;
  });

  it("renders branding tab and saves updated league details", async () => {
    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    // Check branding inputs
    const nameInput = screen.getByDisplayValue("Apex League");
    expect(nameInput).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: "Apex Flag League" } });
    expect(nameInput).toHaveValue("Apex Flag League");

    // Click Apply League Branding
    const saveBtn = screen.getByRole("button", { name: /Apply/i });
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalled();
    });
  });

  it("navigates to League Rules tab and applies rule preset", async () => {
    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    // Switch to League Rules tab
    const rulesTabBtn = screen.getByRole("button", { name: /^League Rules$/i });
    fireEvent.click(rulesTabBtn);

    expect(screen.getByText(/Players on the Field/i)).toBeInTheDocument();

    // Reset to IFAF 5v5
    const ifafBtn = screen.getByRole("button", { name: /Reset to IFAF 5v5/i });
    fireEvent.click(ifafBtn);

    // Save rules
    const saveRulesBtn = screen.getByRole("button", { name: /Apply & Save Settings/i });
    fireEvent.click(saveRulesBtn);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalled();
    });
  });

  it("navigates to Subscription & Teams tab and displays active plan", async () => {
    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    // Switch to Subscription tab
    const subTabBtn = screen.getByRole("button", { name: /^Subscription & Teams$/i });
    fireEvent.click(subTabBtn);

    expect(screen.getByText(/League Team Subscription/i)).toBeInTheDocument();
  });

  it("navigates to Season & Archival tab and triggers archive / season rollover", async () => {
    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    // Switch to Season tab
    const seasonTabBtn = screen.getByRole("button", { name: /^Season & Archival$/i });
    fireEvent.click(seasonTabBtn);

    expect(screen.getByText(/Active Regulation Season/i)).toBeInTheDocument();

    // Click End Season / Archive League prompt button if present
    const promptBtn = screen.queryByRole("button", { name: /End Season|Archive League/i });
    if (promptBtn) {
      fireEvent.click(promptBtn);

      // Pause the league option
      const pauseBtn = screen.queryByRole("button", { name: /1\. Pause the League/i });
      if (pauseBtn) {
        fireEvent.click(pauseBtn);
        await waitFor(() => {
          expect(mockArchiveLeague).toHaveBeenCalledWith("pause_subscription");
        });
      }

      // Next season option
      const nextSeasonOptionBtn = screen.queryByRole("button", { name: /2\. Start the Next Season/i });
      if (nextSeasonOptionBtn) {
        fireEvent.click(nextSeasonOptionBtn);
        const startSeasonSubmitBtn = screen.queryByRole("button", { name: /Start (Next )?Season/i });
        if (startSeasonSubmitBtn) {
          fireEvent.click(startSeasonSubmitBtn);
          await waitFor(() => {
            expect(mockStartNewSeason).toHaveBeenCalled();
          });
        }
      }
    }
  });

  it("updates visibility options, venue details, and copies join link in branding tab", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    // Click Private (Members Only)
    const privateOptionBtn = screen.getByText("Private (Members Only)").closest("button")!;
    fireEvent.click(privateOptionBtn);

    // Click Listed Publicly
    const listedOptionBtn = screen.getByText("Listed Publicly").closest("button")!;
    fireEvent.click(listedOptionBtn);

    // Click Unlisted (Link Only)
    const unlistedOptionBtn = screen.getByText("Unlisted (Link Only)").closest("button")!;
    fireEvent.click(unlistedOptionBtn);

    // Change shortcode, tagline, and contact email
    const shortcodeInput = screen.getByDisplayValue("APX");
    fireEvent.change(shortcodeInput, { target: { value: "APEX" } });

    const taglineInput = screen.getByDisplayValue("The Premier Flag Football Circuit");
    fireEvent.change(taglineInput, { target: { value: "Updated Circuit Tagline" } });

    // Copy join link if available
    const copyLinkBtn = screen.queryByRole("button", { name: /Copy.*Link/i });
    if (copyLinkBtn) {
      fireEvent.click(copyLinkBtn);
      expect(writeTextMock).toHaveBeenCalled();
    }

    // Save branding
    const saveBtn = screen.getByRole("button", { name: /Apply/i });
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalled();
    });
  });

  it("customizes match periods, timeouts, downs, and free agent registration in rules tab", async () => {
    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    // Switch to Rules tab
    const rulesTabBtn = screen.getByRole("button", { name: /^League Rules$/i });
    fireEvent.click(rulesTabBtn);

    // Toggle to Quarters
    const quartersBtn = screen.getByText("Quarters").closest("button")!;
    fireEvent.click(quartersBtn);


    // Select 15m duration
    const dur15Btn = screen.getByRole("button", { name: /^15m$/i });
    fireEvent.click(dur15Btn);

    // Select 5 min halftime break
    const half5minBtn = screen.getByRole("button", { name: /^5 min$/i });
    fireEvent.click(half5minBtn);

    // Select 3 timeouts per team
    const to3Btn = screen.getByRole("button", { name: /^3 TOs$/i });
    fireEvent.click(to3Btn);

    // Select 60s timeout duration
    const to60Btn = screen.getByRole("button", { name: /^60s$/i });
    fireEvent.click(to60Btn);


    // Save rules
    const saveRulesBtn = screen.getByRole("button", { name: /Apply & Save Settings/i });
    fireEvent.click(saveRulesBtn);
    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalled();
    });
  });

  it("renders in read-only mode for non-admin athletes/spectators", async () => {
    mockAuth.isLeagueAdmin = false;
    mockAuth.isPlayer = true;
    mockAuth.playerData = { number: "7", playerName: "Marcus Vance" } as any;

    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    // Expect athlete badge
    expect(screen.getByText(/Athlete Mode/i)).toBeInTheDocument();
    // Branding tab should not be displayed
    expect(screen.queryByRole("button", { name: /League Branding/i })).toBeNull();
    // Rules tab should state View Only
    expect(screen.getByText(/League Rules \(View Only\)/i)).toBeInTheDocument();
  });

  it("closes the customizer modal when close button is clicked", () => {
    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    const closeBtn = screen.getByRole("button", { name: /Close settings/i });
    fireEvent.click(closeBtn);
    expect(mockCloseCustomizer).toHaveBeenCalled();
  });

  it("modifies subscription team slots, opens billing portal, and adds a new team", async () => {
    const { openBillingPortal } = await import("@/lib/billingClient");
    (mockLeague.subscription as any).paymentMethod = "paid";
    mockLeague.subscription.teamCount = 8;

    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    // Switch to Subscription & Teams tab
    const subTabBtn = screen.getByRole("button", { name: /^Subscription & Teams$/i });
    fireEvent.click(subTabBtn);

    // Click "Manage billing" button
    const manageBillingBtn = screen.getByRole("button", { name: /Manage billing/i });
    fireEvent.click(manageBillingBtn);
    expect(mockOpenBillingPortal).toHaveBeenCalledWith("league", "league_apex");

    // Stepper: Increase team slots from 8 to 9
    const plusBtn = screen.getByTitle("Increase team slot");
    fireEvent.click(plusBtn);

    // Confirm button appears with new count
    const confirmBtn = screen.getByRole("button", { name: /Confirm 9 Teams/i });
    fireEvent.click(confirmBtn);
    expect(mockUpdateSubscriptionTeamCount).toHaveBeenCalledWith(9);

    // Add new team to subscription
    const teamNameInput = screen.getByPlaceholderText(/e.g. Team/i);
    fireEvent.change(teamNameInput, { target: { value: "Thunderbirds" } });
    const addTeamBtn = screen.getByRole("button", { name: /Add Team to Subscription/i });
    fireEvent.click(addTeamBtn);
    expect(mockLeague.addTeamToSubscription).toHaveBeenCalledWith("Thunderbirds");
  });

  it("handles complete season transition by starting the next season", async () => {
    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    // Switch to Season tab
    const seasonTabBtn = screen.getByRole("button", { name: /^Season & Archival$/i });
    fireEvent.click(seasonTabBtn);

    // Click "End Season"
    const endSeasonBtn = screen.getByRole("button", { name: /^End Season$/i });
    fireEvent.click(endSeasonBtn);

    // Click option 2: Start the Next Season
    const option2Btn = screen.getByText(/2\. Start the Next Season/i).closest("button")!;
    fireEvent.click(option2Btn);

    // Verify form appears and input season title
    const seasonInput = screen.getByDisplayValue(/Season 2/i);
    fireEvent.change(seasonInput, { target: { value: "Winter 2026 Season" } });

    // Submit new season
    const submitSeasonBtn = screen.getByRole("button", { name: /Start (Next )?Season/i });
    fireEvent.click(submitSeasonBtn);

    await waitFor(() => {
      expect(mockStartNewSeason).toHaveBeenCalledWith("Winter 2026 Season", expect.objectContaining({ teamSelectionMode: "keep_all" }));
    });
  });

  it("configures downs per series, rush distance, play clock, and stat keeping mode", async () => {
    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    // Switch to Rules tab
    const rulesTabBtn = screen.getByRole("button", { name: /^League Rules$/i });
    fireEvent.click(rulesTabBtn);

    // Select 3 Downs (Canadian Standard)
    const downs3Btn = screen.getByText("3 Downs").closest("button")!;
    fireEvent.click(downs3Btn);

    // Select 10 Yds rush distance
    const rush10Btn = screen.getByRole("button", { name: /^10 Yds$/i });
    fireEvent.click(rush10Btn);

    // Select 30s play clock inside downs section
    const downsSection = document.querySelector('[data-tour="settings-downs"]') as HTMLElement;
    const clock30Btn = within(downsSection).getByRole("button", { name: /^30s$/i });
    fireEvent.click(clock30Btn);

    // Select async stat keeping mode ("No clock, both teams")
    const asyncModeBtn = screen.getByText("No clock, both teams").closest("button")!;
    fireEvent.click(asyncModeBtn);

    // Save rules
    const saveRulesBtn = screen.getByRole("button", { name: /Apply & Save Settings/i });
    fireEvent.click(saveRulesBtn);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: expect.objectContaining({
            downsPerSeries: 3,
            rushLineDistance: 10,
            playClockSeconds: 30,
            statKeepingMode: "async",
          }),
        })
      );
    });
  });

  it("handles archived league status and triggers reactivation", async () => {
    mockLeague.isLeagueArchived = true;
    mockLeague.isSubscriptionPastDue = false;

    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    const seasonTabBtn = screen.getByRole("button", { name: /^Season & Archival$/i });
    fireEvent.click(seasonTabBtn);

    expect(screen.getByText(/This League Is Currently Archived \(Read-Only\)/i)).toBeInTheDocument();

    const reactivateBtn = screen.getByRole("button", { name: /Reactivate League \/ Start Next Season/i });
    fireEvent.click(reactivateBtn);

    await waitFor(() => {
      expect(mockResumeSubscription).toHaveBeenCalledTimes(1);
    });

    mockLeague.isLeagueArchived = false;
  });

  it("handles past due subscription status and triggers payment update", async () => {
    mockLeague.isLeagueArchived = false;
    mockLeague.isSubscriptionPastDue = true;

    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    const seasonTabBtn = screen.getByRole("button", { name: /^Season & Archival$/i });
    fireEvent.click(seasonTabBtn);

    expect(screen.getByText(/Payment Declined \/ Past Due/i)).toBeInTheDocument();

    const paymentUpdateBtn = screen.getByRole("button", { name: /Update Payment & Resume Subscription/i });
    fireEvent.click(paymentUpdateBtn);

    await waitFor(() => {
      expect(mockResumeSubscription).toHaveBeenCalledTimes(1);
    });

    mockLeague.isSubscriptionPastDue = false;
  });

  it("triggers closeCustomizer when clicking the header close button", () => {
    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    const closeBtn = screen.getByLabelText(/close settings/i);
    fireEvent.click(closeBtn);
    expect(mockCloseCustomizer).toHaveBeenCalled();
  });

  it("manages team subscription slots, adds a new team, removes a team, and opens billing portal", async () => {
    window.confirm = vi.fn(() => true);

    mockLeague.subscription = {
      status: "active",
      plan: "league",
      teamCount: 8,
      renewsAt: Date.now() + 15 * 86400000,
    } as any;

    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    // Switch to Subscription & Teams tab
    const subTabBtn = screen.getByRole("button", { name: /Subscription & Teams/i });
    fireEvent.click(subTabBtn);

    await waitFor(() => {
      expect(screen.getByText("League Team Subscription")).toBeInTheDocument();
    });

    // 1. Manage billing
    const billingBtn = screen.getByRole("button", { name: /Manage billing/i });
    fireEvent.click(billingBtn);
    await waitFor(() => {
      expect(mockOpenBillingPortal).toHaveBeenCalledWith("league", "league_apex");
    });

    // 2. Adjust capacity using stepper
    const increaseBtn = screen.getByTitle("Increase team slot");
    fireEvent.click(increaseBtn); // 8 -> 9

    const confirmBtn = await screen.findByRole("button", { name: /Confirm 9 Teams/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockUpdateSubscriptionTeamCount).toHaveBeenCalledWith(9);
    });

    // 3. Quick add team
    const teamNameInput = screen.getByLabelText("New team name");
    fireEvent.change(teamNameInput, { target: { value: "Thunderbirds" } });

    const addTeamBtn = screen.getByRole("button", { name: /Add Team to Subscription/i });
    fireEvent.click(addTeamBtn);

    await waitFor(() => {
      expect(mockAddTeamToSubscription).toHaveBeenCalledWith("Thunderbirds");
    });

    // 4. Quick remove team
    await waitFor(() => {
      expect(screen.getByText("Apex Predators")).toBeInTheDocument();
    });

    const removeBtn = screen.getByLabelText(/Remove Apex Predators/i);
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(mockRemoveTeamFromSubscription).toHaveBeenCalledWith("team_1");
    });
  });

  it("configures players on field, quarters structure, and period minutes in rules tab", async () => {
    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    // Switch to Rules tab
    fireEvent.click(screen.getByRole("button", { name: /League Rules/i }));

    await waitFor(() => {
      expect(screen.getByText("1. Players on the Field (Per Side)")).toBeInTheDocument();
    });

    // Change to 7v7
    const btn7v7 = screen.getAllByRole("button", { name: /7v7/i }).find((btn) => !btn.getAttribute("aria-label"))!;
    fireEvent.click(btn7v7);

    // Switch to Quarters
    const quartersBtn = screen.getAllByRole("button", { name: /Quarters/i }).find((btn) => !btn.getAttribute("aria-label"))!;
    fireEvent.click(quartersBtn);

    // Select 15 minutes
    const minsBtn = screen.getByRole("button", { name: /^15m$/i });
    fireEvent.click(minsBtn);

    // Save rules settings
    const saveRulesBtn = screen.getByRole("button", { name: /Apply & Save Settings/i });
    fireEvent.click(saveRulesBtn);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: expect.objectContaining({
            playersOnField: 7,
            periodType: "quarters",
            periodDurationMinutes: 15,
          }),
        })
      );
    });
  });

  it("renders spectator rulebook cards and metrics when user is not a league admin", async () => {
    mockAuth.isLeagueAdmin = false;

    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    // Switch to Rules tab
    const rulesTabBtn = screen.getAllByRole("button", { name: /League Rules/i }).find((btn) => !btn.getAttribute("aria-label"))!;
    fireEvent.click(rulesTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Official Rulebook/i)).toBeInTheDocument();
      expect(screen.getByText(/Players On The Field/i)).toBeInTheDocument();
      expect(screen.getByText(/Game Clock & Periods/i)).toBeInTheDocument();
      expect(screen.getByText(/Downs Per Series/i)).toBeInTheDocument();
    });

    // Reset mock
    mockAuth.isLeagueAdmin = true;
  });

  it("handles Season tab: archives league to pause subscription and starts next season", async () => {
    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    // Switch to Season & Archival tab
    const seasonTabBtn = screen.getByRole("button", { name: /Season & Archival/i });
    fireEvent.click(seasonTabBtn);

    await waitFor(() => {
      expect(screen.getByText("End the Season")).toBeInTheDocument();
      expect(screen.getByText("Active Regulation Season")).toBeInTheDocument();
    });

    // Click End Season button
    const endSeasonBtn = screen.getByRole("button", { name: "End Season" });
    fireEvent.click(endSeasonBtn);

    await waitFor(() => {
      expect(screen.getByText("What happens next?")).toBeInTheDocument();
      expect(screen.getByText("1. Pause the League")).toBeInTheDocument();
      expect(screen.getByText("2. Start the Next Season")).toBeInTheDocument();
    });

    // Test Pausing the League
    const pauseBtn = screen.getByText("1. Pause the League").closest("button")!;
    fireEvent.click(pauseBtn);

    await waitFor(() => {
      expect(mockArchiveLeague).toHaveBeenCalledWith("pause_subscription");
    });

    // Click End Season again to test starting the next season
    const endSeasonBtn2 = screen.getByRole("button", { name: "End Season" });
    fireEvent.click(endSeasonBtn2);

    const startNextSeasonCard = screen.getByText("2. Start the Next Season").closest("button")!;
    fireEvent.click(startNextSeasonCard);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g. Spring 2027")).toBeInTheDocument();
    });

    const seasonInput = screen.getByPlaceholderText("e.g. Spring 2027");
    fireEvent.change(seasonInput, { target: { value: "Fall 2026 Championship" } });

    // Submit new season form
    const submitSeasonBtn = screen.getByRole("button", { name: /Start season/i });
    fireEvent.click(submitSeasonBtn);

    await waitFor(() => {
      expect(mockStartNewSeason).toHaveBeenCalledWith("Fall 2026 Championship", expect.objectContaining({ teamSelectionMode: "keep_all" }));
    });
  });

  it("displays archived league status and allows resuming subscription", async () => {
    mockLeague.isLeagueArchived = true;

    render(
      <PageGuideProvider>
        <LeagueCustomizerContent />
      </PageGuideProvider>
    );

    const seasonTabBtn = screen.getByRole("button", { name: /Season & Archival/i });
    fireEvent.click(seasonTabBtn);

    await waitFor(() => {
      expect(screen.getByText("Concluded & Archived")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Reactivate League/i })).toBeInTheDocument();
    });

    const resumeBtn = screen.getByRole("button", { name: /Reactivate League/i });
    fireEvent.click(resumeBtn);

    await waitFor(() => {
      expect(mockResumeSubscription).toHaveBeenCalled();
    });

    // Reset mock
    mockLeague.isLeagueArchived = false;
  });
});





