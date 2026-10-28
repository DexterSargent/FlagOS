import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  startCheckout,
  getCheckoutStatus,
  listUnusedPurchases,
  openBillingPortal,
  previewSeatChange,
  applySeatChange,
  formatCad,
  saveCheckoutDraft,
  readCheckoutDraft,
  clearCheckoutDraft,
} from "@/lib/billingClient";
import * as secureWrites from "@/lib/secureWrites";

vi.mock("@/lib/secureWrites", () => ({
  authenticatedPost: vi.fn(),
}));

describe("billingClient", () => {
  const origLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).location;
    window.location = {
      ...origLocation,
      assign: vi.fn(),
    } as any;
  });

  afterEach(() => {
    window.location = origLocation as any;
  });

  it("formats CAD amounts correctly", () => {
    expect(formatCad(4000)).toBe("$40.00");
    expect(formatCad(2050)).toBe("$20.50");
    expect(formatCad(0)).toBe("$0.00");
    expect(formatCad(-1500)).toBe("-$15.00");
  });

  it("starts team checkout and redirects to stripe url", async () => {
    vi.mocked(secureWrites.authenticatedPost).mockResolvedValueOnce({
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
      requestId: "req_team_1",
    });

    await startCheckout("team");

    expect(secureWrites.authenticatedPost).toHaveBeenCalledWith(
      "/api/billing/checkout",
      { kind: "team" },
      "Could not start checkout."
    );
    expect(window.location.assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay/cs_test_123");
  });

  it("starts league checkout with teamCount and redirects", async () => {
    vi.mocked(secureWrites.authenticatedPost).mockResolvedValueOnce({
      url: "https://checkout.stripe.com/c/pay/cs_test_league",
      requestId: "req_league_1",
    });

    await startCheckout("league", 8);

    expect(secureWrites.authenticatedPost).toHaveBeenCalledWith(
      "/api/billing/checkout",
      { kind: "league", teamCount: 8 },
      "Could not start checkout."
    );
    expect(window.location.assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay/cs_test_league");
  });

  it("fetches checkout status for a request ID", async () => {
    const mockStatus = {
      requestId: "req_456",
      status: "paid",
      kind: "team" as const,
      teamCount: 1,
      createdEntityId: "team_789",
    };
    vi.mocked(secureWrites.authenticatedPost).mockResolvedValueOnce(mockStatus);

    const result = await getCheckoutStatus("req_456");
    expect(result).toEqual(mockStatus);
    expect(secureWrites.authenticatedPost).toHaveBeenCalledWith(
      "/api/billing/status",
      { requestId: "req_456" },
      "Could not confirm your payment."
    );
  });

  it("lists unused purchases", async () => {
    const mockUnused = {
      enabled: true,
      unused: [
        {
          requestId: "req_1",
          status: "paid",
          kind: "team" as const,
          teamCount: 1,
          createdEntityId: "",
        },
      ],
    };
    vi.mocked(secureWrites.authenticatedPost).mockResolvedValueOnce(mockUnused);

    const result = await listUnusedPurchases();
    expect(result).toEqual(mockUnused);
    expect(secureWrites.authenticatedPost).toHaveBeenCalledWith(
      "/api/billing/status",
      {},
      "Could not load your purchases."
    );
  });

  it("opens customer billing portal", async () => {
    vi.mocked(secureWrites.authenticatedPost).mockResolvedValueOnce({
      url: "https://billing.stripe.com/p/session/test_session",
    });

    await openBillingPortal("league", "league_apex");

    expect(secureWrites.authenticatedPost).toHaveBeenCalledWith(
      "/api/billing/portal",
      { kind: "league", entityId: "league_apex" },
      "Could not open billing management."
    );
    expect(window.location.assign).toHaveBeenCalledWith("https://billing.stripe.com/p/session/test_session");
  });

  it("previews seat change pricing", async () => {
    const mockPreview = {
      currentTeamCount: 4,
      teamCount: 8,
      currency: "cad",
      amountDueNowCents: 4000,
      newMonthlyCents: 12000,
      prorationDate: 1700000000,
      takesEffect: "after_payment" as const,
    };
    vi.mocked(secureWrites.authenticatedPost).mockResolvedValueOnce(mockPreview);

    const result = await previewSeatChange("league_1", 8);
    expect(result).toEqual(mockPreview);
    expect(secureWrites.authenticatedPost).toHaveBeenCalledWith(
      "/api/billing/seats",
      { leagueId: "league_1", teamCount: 8 },
      "Could not price this change."
    );
  });

  it("applies seat change with optional confirmation", async () => {
    const mockApplied = {
      status: "applied",
      newTeamCount: 10,
    };
    vi.mocked(secureWrites.authenticatedPost).mockResolvedValueOnce(mockApplied);

    const result = await applySeatChange("league_1", 10, 1700000000);
    expect(result).toEqual(mockApplied);
    expect(secureWrites.authenticatedPost).toHaveBeenCalledWith(
      "/api/billing/seats",
      { leagueId: "league_1", teamCount: 10, prorationDate: 1700000000, confirm: true },
      "Could not change the plan."
    );
  });

  it("saves, reads, and clears checkout drafts in sessionStorage", () => {
    const draft = { leagueName: "Apex Flag", teamCount: 8, logoUrl: "https://example.com/logo.png" };
    saveCheckoutDraft(draft);

    expect(readCheckoutDraft()).toEqual(draft);

    clearCheckoutDraft();
    expect(readCheckoutDraft()).toBeNull();
  });
});
