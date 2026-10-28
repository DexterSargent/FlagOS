import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminHealth from "@/components/admin/AdminHealth";
import AdminFreeAgents from "@/components/admin/AdminFreeAgents";
import type { PlatformHealthReport } from "@/lib/platformHealth";

// Mock Firebase
const mockGetDocs = vi.fn();
const mockDeleteDoc = vi.fn();
vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  doc: vi.fn((_db, _col, id) => ({ id })),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
}));

describe("AdminHealth Component Suite", () => {
  const dummyReport: PlatformHealthReport = {
    generatedAt: Date.now(),
    scanned: {
      leagues: 5,
      teams: 20,
      players: 150,
      matches: 40,
      plays: 600,
    },
    integrity: [
      {
        code: "player_missing_team",
        message: "Player p_123 has no valid team assignment.",
        targetId: "int_1",
        targetKind: "player",
      },
    ],
    renewals: [
      {
        id: "ren_1",
        kind: "league",
        name: "Apex League",
        renewsAt: Date.now() - 86400000,
        overdue: true,
        adminEmails: ["admin@apex.ca"],
      },
    ],
    newRecords: [
      {
        id: "rec_1",
        kind: "league",
        name: "New League",
        createdAt: Date.now(),
      },
    ],
    unverifiedAdmins: ["unverified@apex.ca"],
    stale: [],
    rollover: [],
    truncated: ["plays"],
  };

  it("renders empty / loading state when report is not provided", () => {
    const onRefresh = vi.fn();
    const { rerender } = render(
      <AdminHealth report={null} loading={true} error="" onRefresh={onRefresh} onReview={vi.fn()} />
    );
    expect(screen.getAllByText(/Scanning platform data/i).length).toBeGreaterThan(0);

    rerender(
      <AdminHealth report={null} loading={false} error="" onRefresh={onRefresh} onReview={vi.fn()} />
    );
    expect(screen.getByText(/Run a health check to see what needs attention/i)).toBeInTheDocument();
    const runBtn = screen.getByRole("button", { name: /Run health check/i });
    fireEvent.click(runBtn);
    expect(onRefresh).toHaveBeenCalled();
  });

  it("renders full health report, warnings, and triggers review callback", () => {
    const onReview = vi.fn();
    const onRefresh = vi.fn();

    render(
      <AdminHealth
        report={dummyReport}
        loading={false}
        error=""
        onRefresh={onRefresh}
        onReview={onReview}
      />
    );

    expect(screen.getByText(/5 leagues, 20 teams, 150 players/i)).toBeInTheDocument();
    expect(screen.getByText(/Player p_123 has no valid team assignment/i)).toBeInTheDocument();
    expect(screen.getByText(/The scan reached its limit for plays/i)).toBeInTheDocument();

    // Click Review button
    const reviewBtn = screen.getAllByRole("button", { name: "Review" })[0];
    fireEvent.click(reviewBtn);
    expect(onReview).toHaveBeenCalledWith("ren_1");

    // Click Re-run button
    const rerunBtn = screen.getByRole("button", { name: /Re-run/i });
    fireEvent.click(rerunBtn);
    expect(onRefresh).toHaveBeenCalled();
  });
});

describe("AdminFreeAgents Component Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and renders free agent interest submissions and handles removal", async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          id: "fa_1",
          data: () => ({
            name: "Jordan Reed",
            email: "jordan@example.com",
            area: "Toronto",
            experience: "3 years competitive",
            notes: "Plays WR and DB",
            createdAt: { toDate: () => new Date("2026-10-25T10:00:00Z") },
          }),
        },
      ],
    });
    mockDeleteDoc.mockResolvedValue(undefined);

    render(<AdminFreeAgents />);

    expect(screen.getByText(/Free Agent Interest/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Jordan Reed")).toBeInTheDocument();
      expect(screen.getByText("jordan@example.com")).toBeInTheDocument();
      expect(screen.getByText(/3 years competitive/i)).toBeInTheDocument();
    });

    // Click initial delete button (triggers confirmation mode)
    const delBtn = screen.getByLabelText(/Delete submission from Jordan Reed/i);
    fireEvent.click(delBtn);

    // Confirm button appears with Delete?
    const confirmBtn = await screen.findByRole("button", { name: "Delete?" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteDoc).toHaveBeenCalledWith(expect.objectContaining({ id: "fa_1" }));
    });
  });

  it("handles loading error gracefully", async () => {
    mockGetDocs.mockRejectedValueOnce(new Error("Network failed"));

    render(<AdminFreeAgents />);

    await waitFor(() => {
      expect(screen.getByText("Network failed")).toBeInTheDocument();
    });
  });
});
