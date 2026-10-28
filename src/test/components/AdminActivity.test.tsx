import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import AdminActivity from "@/components/admin/AdminActivity";
import type { AuditEntry, BillingRecord } from "@/lib/adminMetrics";

vi.mock("@/components/walkthrough/PageGuideButton", () => ({ default: () => null }));
vi.mock("@/lib/pageGuide", () => ({ usePageGuide: () => {} }));

const mockEntries: AuditEntry[] = [
  {
    id: "act_1",
    action: "league.created",
    summary: "Created Ontario Flag League",
    actorEmail: "commissioner@ontario.ca",
    actorIsPlatformAdmin: false,
    leagueId: "l_ont",
    createdAt: Date.now() - 3600000,
  },
  {
    id: "act_2",
    action: "subscription.updated",
    summary: "Marked Apex Predators paid",
    actorEmail: "admin@flagos.ca",
    actorIsPlatformAdmin: true,
    teamId: "team_apex",
    createdAt: Date.now() - 7200000,
  },
  {
    id: "act_3",
    action: "user.disabled",
    summary: "Disabled account spam@flagos.ca",
    actorEmail: "admin@flagos.ca",
    actorIsPlatformAdmin: true,
    createdAt: Date.now() - 10800000,
  },
];

const mockLeagues = [
  {
    id: "l_ont",
    name: "Ontario Flag League",
  },
];

describe("AdminActivity Component", () => {
  it("renders activity timeline, applies group, league, account, and search filters", () => {
    render(
      <AdminActivity
        entries={mockEntries}
        total={3}
        leagues={mockLeagues}
      />
    );

    expect(screen.getByText("Created Ontario Flag League")).toBeInTheDocument();
    expect(screen.getByText("Marked Apex Predators paid")).toBeInTheDocument();
    expect(screen.getByText("Customer")).toBeInTheDocument(); // actorIsPlatformAdmin is false

    // Search filter
    const searchInput = screen.getByPlaceholderText("Search activity");
    fireEvent.change(searchInput, { target: { value: "Apex Predators" } });
    expect(screen.getByText("Marked Apex Predators paid")).toBeInTheDocument();
    expect(screen.queryByText("Created Ontario Flag League")).not.toBeInTheDocument();

    // Group filter: Billing & ledger
    fireEvent.change(searchInput, { target: { value: "" } });
    const groupSelect = screen.getByLabelText("Filter activity");
    fireEvent.change(groupSelect, { target: { value: "billing" } });
    expect(screen.getByText("Marked Apex Predators paid")).toBeInTheDocument();

    // League filter
    fireEvent.change(groupSelect, { target: { value: "all" } });
    const leagueSelect = screen.getByLabelText("Filter by league");
    fireEvent.change(leagueSelect, { target: { value: "l_ont" } });
    expect(screen.queryByText("Marked Apex Predators paid")).not.toBeInTheDocument();

    // Account filter
    const accountSelect = screen.getByLabelText("Filter by account");
    fireEvent.change(accountSelect, { target: { value: "commissioner@ontario.ca" } });
    expect(screen.getByText("Created Ontario Flag League")).toBeInTheDocument();
  });

  it("handles pagination when entries exceed PAGE_SIZE", () => {
    const manyEntries: AuditEntry[] = Array.from({ length: 60 }, (_, i) => ({
      id: `act_${i}`,
      action: "league.updated",
      summary: `Activity Event #${i}`,
      actorEmail: "admin@flagos.ca",
      createdAt: Date.now() - i * 10000,
    }));

    render(
      <AdminActivity
        entries={manyEntries}
        total={100}
        leagues={mockLeagues}
      />
    );

    expect(screen.getByText(/Showing 50 of 60/i)).toBeInTheDocument();
    const showMoreBtn = screen.getByRole("button", { name: /Show 10 more/i });
    fireEvent.click(showMoreBtn);

    expect(screen.getByText(/Showing 60 of 60/i)).toBeInTheDocument();
  });

  it("renders empty state when no activity matches", () => {
    render(
      <AdminActivity
        entries={[]}
        total={0}
      />
    );

    expect(screen.getByText(/No activity recorded yet/i)).toBeInTheDocument();
  });
});
