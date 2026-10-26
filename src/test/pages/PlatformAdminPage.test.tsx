import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import PlatformAdminPage from "@/app/admin/page";
import { PageGuideProvider, useActivePageGuide } from "@/lib/pageGuide";

function ActiveGuide() {
  const guide = useActivePageGuide();
  return <output data-testid="active-guide">{guide?.id}</output>;
}

const {
  mockGetDocs,
  mockUpdateDoc,
  mockDeleteDoc,
  mockCreateSecureRecord,
  mockReplace,
  mockUseAuth,
  mockRequestPrivateData,
  mockAdminBusinessRequest,
} = vi.hoisted(() => ({
  mockGetDocs: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockDeleteDoc: vi.fn(),
  mockCreateSecureRecord: vi.fn().mockResolvedValue("created-id"),
  mockReplace: vi.fn(),
  mockUseAuth: vi.fn(),
  mockRequestPrivateData: vi.fn(),
  mockAdminBusinessRequest: vi.fn(),
}));

vi.mock("@/lib/adminBusiness", () => ({
  adminBusinessRequest: mockAdminBusinessRequest,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
}));

vi.mock("@/lib/secureWrites", () => ({
  createSecureRecord: mockCreateSecureRecord,
  requestPrivateData: mockRequestPrivateData,
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_database, collectionName) => ({ collectionName })),
  query: vi.fn((reference) => reference),
  limit: vi.fn(),
  doc: vi.fn(),
  getDocs: mockGetDocs,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
}));

const emptyBusiness = {
  ledger: [],
  audit: [],
  users: [],
  counts: { leagues: 1, teams: 1, players: 0, matches: 0, plays: 0 },
  warnings: [],
  generatedAt: 0,
};

describe("Platform management page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The record-management tests below target the Customers tab of the business console.
    window.history.replaceState(null, "", "#customers");
    mockAdminBusinessRequest.mockResolvedValue(emptyBusiness);
    mockRequestPrivateData.mockResolvedValue({
      leagues: { league_customer_1: { adminEmails: ["existing@league.com"] } },
      teams: {},
    });
    mockGetDocs.mockImplementation(async (reference: { collectionName?: string }) => ({
      docs: reference.collectionName === "leagues"
        ? [
            {
              id: "league_customer_1",
              data: () => ({
                leagueName: "Customer League",
                shortcode: "CFL",
                visibility: "public",
                subscription: { status: "active" },
                adminEmails: ["existing@league.com"],
              }),
            },
          ]
        : [
            {
              id: "team_customer_1",
              data: () => ({
                name: "Customer Team",
                shortcode: "CT",
                leagueId: "league_customer_1",
              }),
            },
          ],
    }));
    mockUseAuth.mockReturnValue({
      user: { uid: "owner-id", email: "owner@example.com" },
      isPlatformAdmin: true,
      loading: false,
    });
  });

  it("registers each console tab guide and restores it after a customer dialog closes", async () => {
    render(<PageGuideProvider><PlatformAdminPage /><ActiveGuide /></PageGuideProvider>);
    await screen.findByText("Customer League");
    expect(screen.getByTestId("active-guide")).toHaveTextContent("platform-admin-customers");
    for (const [label, id] of [["Overview", "overview"], ["Finance", "finance"], ["Users", "users"], ["Activity", "activity"], ["Customers", "customers"]]) {
      fireEvent.click(screen.getByRole("tab", { name: new RegExp(`^${label}`) }));
      await waitFor(() => expect(screen.getByTestId("active-guide")).toHaveTextContent(`platform-admin-${id}`));
    }
    fireEvent.click(screen.getByRole("button", { name: /^Edit$/ }));
    await waitFor(() => expect(screen.getByTestId("active-guide")).toHaveTextContent("platform-admin-edit-league"));
    expect(screen.getAllByRole("button", { name: "Open Edit League guided tour" }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.getByTestId("active-guide")).toHaveTextContent("platform-admin-customers"));
  });

  it("keeps a ledger dialog open when Escape dismisses its guide", async () => {
    render(<PageGuideProvider><PlatformAdminPage /><ActiveGuide /></PageGuideProvider>);
    await screen.findByText("Customer League");
    fireEvent.click(screen.getByRole("tab", { name: "Finance" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add entry" }));
    const dialog = screen.getByRole("dialog", { name: "Record income" });
    await waitFor(() => expect(screen.getByTestId("active-guide")).toHaveTextContent("platform-admin-ledger-entry"));
    fireEvent.click(within(dialog).getByTestId("page-guide-button"));
    expect(screen.getByRole("dialog", { name: "Ledger Entry walkthrough" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Ledger Entry walkthrough" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Record income" })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.getByTestId("active-guide")).toHaveTextContent("platform-admin-finance"));
  });

  it("shows an access-denied page to signed-in users outside the owner allowlist", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "other-id", email: "customer@example.com" },
      isPlatformAdmin: false,
      loading: false,
    });

    render(<PlatformAdminPage />);

    expect(screen.getByText("Restricted platform area")).toBeInTheDocument();
    expect(mockGetDocs).not.toHaveBeenCalled();
    expect(mockRequestPrivateData).not.toHaveBeenCalled();
  });

  it("loads server-provided records only once during Strict Mode effect replay", async () => {
    mockRequestPrivateData.mockResolvedValue({
      leagues: { league_customer_1: { adminEmails: ["existing@league.com"] } },
      teams: {},
      records: {
        leagues: [{ id: "league_customer_1", leagueName: "Private League" }],
        teams: [{ id: "team_customer_1", name: "Private Team", leagueId: "league_customer_1" }],
      },
    });
    mockGetDocs.mockRejectedValue(new Error("Client list access denied."));

    render(<StrictMode><PlatformAdminPage /></StrictMode>);

    expect(await screen.findByText("Private League")).toBeInTheDocument();
    expect(screen.getByText("Private Team")).toBeInTheDocument();
    expect(mockRequestPrivateData).toHaveBeenCalledExactlyOnceWith("admin_overview");
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  it("shows the API error and allows retrying after a failed request", async () => {
    mockRequestPrivateData.mockRejectedValueOnce(
      new Error("Private-data request limit reached. Please wait."),
    );

    render(<PlatformAdminPage />);

    expect(await screen.findByText(
      "Could not load leagues and teams. Private-data request limit reached. Please wait.",
    )).toBeInTheDocument();
    expect(mockGetDocs).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Refresh/i }));

    expect(await screen.findByText("Customer League")).toBeInTheDocument();
    expect(mockRequestPrivateData).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/Could not load leagues and teams/)).not.toBeInTheDocument();
  });

  it("lists customer leagues and teams and supports managing their visibility", async () => {
    render(<PlatformAdminPage />);

    expect(await screen.findByText("Customer League")).toBeInTheDocument();
    expect(screen.getByText("Customer Team")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Manage league/i })).toHaveAttribute("href", "/league/league_customer_1");
    expect(screen.getAllByRole("link", { name: /Manage team/i })[0]).toHaveAttribute("href", "/teams/team_customer_1");

    fireEvent.click(screen.getByRole("button", { name: /Make private/i }));
    await waitFor(() => expect(mockCreateSecureRecord).toHaveBeenCalledWith(
      "league_update",
      { leagueId: "league_customer_1", visibility: "private" },
    ));
    expect(await screen.findByRole("button", { name: /Make public/i })).toBeInTheDocument();
  });

  it("cascades parent league subscription to member teams in platform view", async () => {
    render(<PlatformAdminPage />);

    expect(await screen.findByText("Customer League")).toBeInTheDocument();
    // Child team should indicate it is covered by Customer League
    expect(screen.getByText(/Covered by Customer League/i)).toBeInTheDocument();
    expect(screen.getByText(/Cascaded from league/i)).toBeInTheDocument();
  });

  it("allows editing a league and cascades subscription to member teams", async () => {
    render(<PlatformAdminPage />);

    expect(await screen.findByText("Customer League")).toBeInTheDocument();

    // Click edit button
    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

    // Verify modal is displayed
    expect(screen.getByRole("heading", { name: "Edit League" })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/League Name/i);
    fireEvent.change(nameInput, { target: { value: "Updated League Title" } });

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => expect(mockCreateSecureRecord).toHaveBeenCalledWith(
      "league_update",
      expect.objectContaining({ leagueId: "league_customer_1", leagueName: "Updated League Title" }),
    ));
    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalled());
    expect(await screen.findByText("Updated League Title")).toBeInTheDocument();
  });

  it("allows adding and removing admins for a league", async () => {
    render(<PlatformAdminPage />);

    expect(await screen.findByText("Customer League")).toBeInTheDocument();

    // Click admins button
    fireEvent.click(screen.getByRole("button", { name: /Admins/i }));

    // Modal opens
    expect(screen.getByRole("heading", { name: "Manage Admins" })).toBeInTheDocument();
    expect(screen.getByText("existing@league.com")).toBeInTheDocument();

    // Add a new admin
    const emailInput = screen.getByPlaceholderText("admin@example.com");
    fireEvent.change(emailInput, { target: { value: "newcommish@league.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/i }));

    await waitFor(() => {
      expect(mockCreateSecureRecord).toHaveBeenCalledWith(
        "league_private_update",
        expect.objectContaining({
          leagueId: "league_customer_1",
          adminEmails: expect.arrayContaining(["newcommish@league.com"]),
        }),
      );
    });

    expect(screen.getByText("newcommish@league.com")).toBeInTheDocument();

    // Remove the new admin
    const removeButtons = screen.getAllByRole("button", { name: /Remove/i });
    const callCount = mockCreateSecureRecord.mock.calls.length;
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(mockCreateSecureRecord).toHaveBeenCalledTimes(callCount + 1);
    });
  });

  it("allows deleting a league after confirmation", async () => {
    render(<PlatformAdminPage />);

    expect(await screen.findByText("Customer League")).toBeInTheDocument();

    // Click Delete button on league card (the first Delete belongs to the league column)
    fireEvent.click(screen.getAllByRole("button", { name: /^Delete$/i })[0]);

    // Confirmation dialog opens
    expect(screen.getByRole("heading", { name: "Delete League" })).toBeInTheDocument();

    // Click confirm delete
    fireEvent.click(screen.getByRole("button", { name: /Confirm Delete/i }));

    await waitFor(() => {
      expect(mockCreateSecureRecord).toHaveBeenCalledWith(
        "delete_league",
        { leagueId: "league_customer_1" },
      );
    });

    // League is removed from list
    await waitFor(() => {
      expect(screen.queryByText("Customer League")).not.toBeInTheDocument();
    });
  });

  it("permanently deletes a team and its data after confirmation", async () => {
    render(<PlatformAdminPage />);

    expect(await screen.findByText("Customer Team")).toBeInTheDocument();
    const deleteButtons = screen.getAllByRole("button", { name: /^Delete$/i });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    expect(screen.getByRole("heading", { name: "Delete Team" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete Team" }));

    await waitFor(() => {
      expect(mockCreateSecureRecord).toHaveBeenCalledWith(
        "delete_team",
        { teamId: "team_customer_1", purge: true },
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("Customer Team")).not.toBeInTheDocument();
    });
  });

  it("renders member teams as a collapsible dropdown sublist of its parent league", async () => {
    render(<PlatformAdminPage />);

    expect(await screen.findByText("Customer League")).toBeInTheDocument();

    // Member team is visible inside the cascading dropdown sublist initially
    expect(screen.getByText("Customer Team")).toBeInTheDocument();
    expect(screen.getByText("Member Teams Dropdown (1)")).toBeInTheDocument();

    // Click collapse / hide button to collapse the sublist
    const hideBtn = screen.getByRole("button", { name: /Hide sublist/i });
    fireEvent.click(hideBtn);

    // Customer Team should now be collapsed / hidden from the sublist
    expect(screen.queryByText("Customer Team")).not.toBeInTheDocument();

    // Click toggle button to expand the sublist again
    const toggleBtn = screen.getByRole("button", { name: /Toggle teams sublist for Customer League/i });
    fireEvent.click(toggleBtn);

    // Customer Team should be visible again
    expect(await screen.findByText("Customer Team")).toBeInTheDocument();
  });

  it("renders stored independent teams without injecting synthetic records", async () => {
    mockRequestPrivateData.mockResolvedValue({ leagues: {}, teams: {}, records: {
      leagues: [], teams: [{ id: "falcons", name: "Falcons", shortcode: "FAL", subscription: { status: "active" } }],
    } });
    render(<PlatformAdminPage />);
    expect(await screen.findByText("Falcons")).toBeInTheDocument();
    expect(screen.getByText("Independent Teams (1)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Manage team/i })).toHaveAttribute("href", "/teams/falcons");
  });

  it("does not invent an independent team when none is stored", async () => {
    mockRequestPrivateData.mockResolvedValue({ leagues: {}, teams: {}, records: { leagues: [], teams: [] } });
    render(<PlatformAdminPage />);
    await waitFor(() => expect(mockRequestPrivateData).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: /Manage team/i })).not.toBeInTheDocument();
  });
});

describe("Business console", () => {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const records = {
    leagues: [{
      id: "league_paid",
      leagueName: "Paid League",
      subscription: { status: "active", paymentMethod: "paid", baseMonthlyFee: 40, perTeamMonthlyFee: 20, teamCount: 6, totalMonthlyFee: 160 },
    }],
    teams: [
      { id: "team_comp", name: "Comp Team", leagueId: "", subscription: { status: "active", paymentMethod: "complimentary", monthlyFee: 40 } },
      { id: "team_member", name: "Member Team", leagueId: "league_paid" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/admin");
    mockUseAuth.mockReturnValue({ user: { uid: "owner-id", email: "owner@example.com" }, isPlatformAdmin: true, loading: false });
    mockRequestPrivateData.mockResolvedValue({ leagues: { league_paid: { adminEmails: ["boss@league.com"] } }, teams: {}, records });
    mockAdminBusinessRequest.mockImplementation(async (action: string) => action === "load"
      ? {
          ...emptyBusiness,
          ledger: [
            { id: "l1", type: "income", amount: 160, date: `${thisMonth}-02`, category: "Subscription", description: "League dues", customerName: "Paid League" },
            { id: "l2", type: "expense", amount: 25.5, date: `${thisMonth}-03`, category: "Hosting & infrastructure", description: "Firebase" },
          ],
          users: [{ uid: "u1", email: "boss@league.com", displayName: "", emailVerified: true, disabled: false, createdAt: Date.now(), lastSignInAt: Date.now(), providers: ["password"] }],
          audit: [{ id: "a1", action: "league", summary: "Created league Paid League", actorEmail: "owner@example.com", createdAt: Date.now() }],
        }
      : { id: "ok" });
  });

  it("opens on the overview with MRR from paid subscriptions only and ledger profit", async () => {
    render(<PlatformAdminPage />);
    expect(await screen.findByText("MRR (marked paid)")).toBeInTheDocument();
    // League ($160) is paid; the $40 complimentary team is excluded from billed MRR.
    expect(screen.getByText("$1,920")).toBeInTheDocument();
    expect(screen.getByText(/1 complimentary subscription is worth/)).toBeInTheDocument();
    expect(screen.getAllByText("$135").length).toBeGreaterThan(0);
  });

  it("records a payment against a customer from the finance tab", async () => {
    render(<PlatformAdminPage />);
    fireEvent.click(await screen.findByRole("tab", { name: /Finance/ }));
    expect(await screen.findByText("Subscriptions & billing")).toBeInTheDocument();
    expect(screen.queryByText("Member Team")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /Payment/ })[0]);
    expect(screen.getByRole("dialog", { name: "Record income" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Save entry/ }));
    await waitFor(() => expect(mockAdminBusinessRequest).toHaveBeenCalledWith("ledger_add", expect.objectContaining({
      type: "income",
      amount: 160,
      category: "Subscription",
      customerId: "league_paid",
      customerKind: "league",
      advanceRenewal: true,
    })));
  });

  it("edits billing for an independent team", async () => {
    render(<PlatformAdminPage />);
    fireEvent.click(await screen.findByRole("tab", { name: /Finance/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Edit billing for Comp Team" }));
    fireEvent.change(screen.getByLabelText("Billing"), { target: { value: "paid" } });
    fireEvent.click(screen.getByRole("button", { name: /Save billing/ }));
    await waitFor(() => expect(mockAdminBusinessRequest).toHaveBeenCalledWith("subscription_update", expect.objectContaining({
      kind: "team",
      id: "team_comp",
      paymentMethod: "paid",
      monthlyFee: 40,
    })));
  });

  it("lists accounts with the leagues they manage and shows the activity log", async () => {
    render(<PlatformAdminPage />);
    fireEvent.click(await screen.findByRole("tab", { name: /Users/ }));
    expect(await screen.findByText("boss@league.com")).toBeInTheDocument();
    expect(screen.getByText("Paid League")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Activity/ }));
    expect(await screen.findByText("Created league Paid League")).toBeInTheDocument();
  });
});
