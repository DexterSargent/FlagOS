import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import AdminOverview from "@/components/admin/AdminOverview";
import type { BillingRecord, LedgerEntry, PlatformUser } from "@/lib/adminMetrics";

vi.mock("@/components/walkthrough/PageGuideButton", () => ({ default: () => null }));
vi.mock("@/lib/pageGuide", () => ({ usePageGuide: () => {} }));

const mockRecords: BillingRecord[] = [
  {
    kind: "league",
    id: "l_1",
    name: "Premier Flag League",
    status: "active",
    paymentMethod: "paid",
    monthlyFee: 200,
    baseMonthlyFee: 40,
    perTeamMonthlyFee: 20,
    teamCount: 8,
    renewsAt: Date.now() + 86400000 * 5, // renews in 5 days
    adminEmails: ["admin@premier.ca"],
    createdAt: 1000,
  },
  {
    kind: "team",
    id: "t_past",
    name: "Overdue Panthers",
    status: "past_due",
    paymentMethod: "paid",
    monthlyFee: 40,
    renewsAt: Date.now() - 86400000 * 2, // 2 days ago
    adminEmails: ["coach@panthers.ca"],
    createdAt: 2000,
  },
  {
    kind: "team",
    id: "t_comp",
    name: "Complimentary Free Agents",
    status: "active",
    paymentMethod: "complimentary",
    monthlyFee: 40,
    renewsAt: null,
    adminEmails: ["free@flag.ca"],
    createdAt: 3000,
  },
];

const mockLedger: LedgerEntry[] = [
  {
    id: "entry_1",
    type: "income",
    amount: 200,
    category: "Subscription",
    description: "May league subscription",
    date: new Date().toISOString().slice(0, 10),
  },
];

const mockUsers: PlatformUser[] = [
  {
    uid: "u_1",
    email: "commissioner@league.ca",
    displayName: "Jane Doe",
    emailVerified: true,
    disabled: false,
    createdAt: Date.now() - 86400000,
    lastSignInAt: Date.now(),
    providers: ["password"],
  },
];

const mockCounts = {
  leagues: 4,
  teams: 32,
  players: 240,
  matches: 120,
};

describe("AdminOverview Component", () => {
  it("renders executive KPI cards, charts, customer mix, renewals, and handles navigation actions", () => {
    const onNavigate = vi.fn();
    const onRecordPayment = vi.fn();

    render(
      <AdminOverview
        records={mockRecords}
        snapshot={{
          ledger: mockLedger,
          users: mockUsers,
          counts: mockCounts,
        } as any}
        onNavigate={onNavigate}
        onRecordPayment={onRecordPayment}
      />
    );

    // Banner for complimentary MRR
    expect(screen.getByText(/Mark customers as paid in Finance once they are billed/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open billing" }));
    expect(onNavigate).toHaveBeenCalledWith("finance");

    // Renewals and past due records
    expect(screen.getAllByText("Overdue Panthers").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Premier Flag League").length).toBeGreaterThan(0);

    const recordPaymentBtns = screen.getAllByRole("button", { name: "Record payment" });
    fireEvent.click(recordPaymentBtns[0]);
    expect(onRecordPayment).toHaveBeenCalled();

    // Recent signups navigation
    fireEvent.click(screen.getByRole("button", { name: "All users" }));
    expect(onNavigate).toHaveBeenCalledWith("users");

    // Platform health activity navigation
    fireEvent.click(screen.getByRole("button", { name: "Activity" }));
    expect(onNavigate).toHaveBeenCalledWith("activity");
  });

  it("renders empty state when no renewals or past-due records exist", () => {
    render(
      <AdminOverview
        records={[]}
        snapshot={null}
        onNavigate={vi.fn()}
        onRecordPayment={vi.fn()}
      />
    );

    expect(screen.getByText("No paid renewals due in the next 30 days.")).toBeInTheDocument();
    expect(screen.getByText("No accounts loaded.")).toBeInTheDocument();
  });
});
