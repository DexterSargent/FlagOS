import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import AdminFinance, { LedgerEntryModal, BillingModal } from "@/components/admin/AdminFinance";
import type { BillingRecord, LedgerEntry } from "@/lib/adminMetrics";

vi.mock("@/components/walkthrough/PageGuideButton", () => ({ default: () => null }));
vi.mock("@/lib/pageGuide", () => ({
  usePageGuide: () => {},
  useActivePageGuide: () => null,
}));

const todayIso = new Date().toISOString().slice(0, 10);

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
    renewsAt: new Date().getTime() + 86400000,
    adminEmails: ["admin@flagleague.ca"],
    createdAt: 1000,
  },
  {
    kind: "team",
    id: "t_1",
    name: "Independent Sharks",
    status: "active",
    paymentMethod: "complimentary",
    monthlyFee: 0,
    renewsAt: null,
    adminEmails: ["sharks@flagleague.ca"],
    createdAt: 2000,
  },
  {
    kind: "team",
    id: "t_2",
    name: "Canceled Team",
    status: "canceled",
    paymentMethod: "paid",
    monthlyFee: 30,
    renewsAt: null,
    adminEmails: ["canceled@flagleague.ca"],
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
    customerKind: "league",
    customerId: "l_1",
    customerName: "Premier Flag League",
    date: todayIso,
    createdAt: 1000,
  },
  {
    id: "entry_2",
    type: "expense",
    amount: 50,
    category: "Software",
    description: "Cloud hosting and database",
    date: todayIso,
    createdAt: 2000,
  },
];

describe("AdminFinance Components", () => {
  describe("AdminFinance Main Dashboard", () => {
    it("renders P&L, MRR, category breakdown, and handles filters & search", () => {
      const onAddEntry = vi.fn();
      const onEditBilling = vi.fn();
      const onDeleteEntry = vi.fn().mockResolvedValue(undefined);

      render(
        <AdminFinance
          records={mockRecords}
          ledger={mockLedger}
          onAddEntry={onAddEntry}
          onEditBilling={onEditBilling}
          onDeleteEntry={onDeleteEntry}
        />
      );

      expect(screen.getAllByText("Premier Flag League").length).toBeGreaterThan(0);
      expect(screen.getByText("May league subscription")).toBeInTheDocument();

      // Search filter
      const searchInput = screen.getByPlaceholderText("Search entries");
      fireEvent.change(searchInput, { target: { value: "Cloud hosting" } });
      expect(screen.getByText("Cloud hosting and database")).toBeInTheDocument();
      expect(screen.queryByText("May league subscription")).not.toBeInTheDocument();

      // Clear search
      fireEvent.change(searchInput, { target: { value: "" } });

      // Add entry button
      fireEvent.click(screen.getByRole("button", { name: /Add entry/i }));
      expect(onAddEntry).toHaveBeenCalledOnce();

      // Edit billing button
      const editBtn = screen.getByLabelText("Edit billing for Premier Flag League");
      fireEvent.click(editBtn);
      expect(onEditBilling).toHaveBeenCalledWith(mockRecords[0]);
    });

    it("confirms and executes deletion of a ledger entry", async () => {
      const onDeleteEntry = vi.fn().mockResolvedValue(undefined);
      render(
        <AdminFinance
          records={mockRecords}
          ledger={mockLedger}
          onAddEntry={vi.fn()}
          onEditBilling={vi.fn()}
          onDeleteEntry={onDeleteEntry}
        />
      );

      const deleteBtn = screen.getByLabelText("Delete entry May league subscription");
      fireEvent.click(deleteBtn);

      // Confirm prompt appears
      const confirmBtn = screen.getByRole("button", { name: "Delete?" });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(onDeleteEntry).toHaveBeenCalledWith(mockLedger[0]);
      });
    });
  });

  describe("LedgerEntryModal", () => {
    it("records an income entry with customer and optional renewal extension", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();

      render(
        <LedgerEntryModal
          records={mockRecords}
          onClose={onClose}
          onSave={onSave}
          prefill={{
            type: "income",
          }}
        />
      );

      const amountInput = screen.getByPlaceholderText("0.00");
      fireEvent.change(amountInput, { target: { value: "150.00" } });

      const descInput = screen.getByPlaceholderText(/e.g. May subscription/i);
      fireEvent.change(descInput, { target: { value: "Paid via e-transfer" } });

      // Select customer
      const customerSelect = screen.getByLabelText(/Customer/i);
      fireEvent.change(customerSelect, { target: { value: "league:l_1" } });

      // Check advance renewal checkbox
      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      fireEvent.click(screen.getByRole("button", { name: /Save entry/i }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledOnce();
        const draft = onSave.mock.calls[0][0];
        expect(draft.type).toBe("income");
        expect(draft.amount).toBe(150);
        expect(draft.advanceRenewal).toBe(true);
      });
    });

    it("switches to expense and displays error on failure", async () => {
      const onSave = vi.fn().mockRejectedValue(new Error("Database write error"));
      render(
        <LedgerEntryModal
          records={mockRecords}
          onClose={vi.fn()}
          onSave={onSave}
        />
      );

      // Click expense radio button
      fireEvent.click(screen.getByRole("radio", { name: "expense" }));

      const amountInput = screen.getByPlaceholderText("0.00");
      fireEvent.change(amountInput, { target: { value: "45.00" } });

      fireEvent.click(screen.getByRole("button", { name: /Save entry/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Database write error");
      });
    });
  });

  describe("BillingModal", () => {
    it("edits league billing parameters and calculates total monthly fee", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();

      const { container } = render(
        <BillingModal
          record={mockRecords[0]}
          onClose={onClose}
          onSave={onSave}
        />
      );

      expect(screen.getByText("Billing · Premier Flag League")).toBeInTheDocument();

      // Change team count
      const teamsInput = container.querySelector('input[type="number"][max="256"]')!;
      fireEvent.change(teamsInput, { target: { value: "10" } });

      // Save billing
      fireEvent.click(screen.getByRole("button", { name: /Save billing/i }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledOnce();
        const draft = onSave.mock.calls[0][0];
        expect(draft.teamCount).toBe(10);
        expect(draft.baseMonthlyFee).toBe(40);
        expect(draft.perTeamMonthlyFee).toBe(20);
      });
    });

    it("edits team monthly fee and handles error", async () => {
      const onSave = vi.fn().mockRejectedValue(new Error("Failed to save billing"));
      const { container } = render(
        <BillingModal
          record={mockRecords[1]}
          onClose={vi.fn()}
          onSave={onSave}
        />
      );

      const feeInput = container.querySelector('input[type="number"]')!;
      fireEvent.change(feeInput, { target: { value: "25.00" } });

      fireEvent.click(screen.getByRole("button", { name: /Save billing/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Failed to save billing");
      });
    });
  });
});
