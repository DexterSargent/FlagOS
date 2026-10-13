import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PlatformAdminPage from "@/app/admin/page";

const { mockGetDocs, mockUpdateDoc, mockReplace, mockUseAuth } = vi.hoisted(() => ({
  mockGetDocs: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockReplace: vi.fn(),
  mockUseAuth: vi.fn(),
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

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_database, collectionName) => ({ collectionName })),
  doc: vi.fn(),
  getDocs: mockGetDocs,
  updateDoc: mockUpdateDoc,
}));

describe("Platform management page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDocs.mockImplementation(async (reference: { collectionName?: string }) => ({
      docs: reference.collectionName === "leagues"
        ? [{ id: "league_customer_1", data: () => ({ leagueName: "Customer League", shortcode: "CFL", visibility: "public" }) }]
        : [{ id: "team_customer_1", data: () => ({ name: "Customer Team", shortcode: "CT", leagueId: "league_customer_1" }) }],
    }));
    mockUseAuth.mockReturnValue({
      user: { uid: "owner-id", email: "owner@example.com" },
      isPlatformAdmin: true,
      loading: false,
    });
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
  });

  it("lists customer leagues and teams and supports managing their visibility", async () => {
    render(<PlatformAdminPage />);

    expect(await screen.findByText("Customer League")).toBeInTheDocument();
    expect(screen.getByText("Customer Team")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Manage league/i })).toHaveAttribute("href", "/league/league_customer_1");
    expect(screen.getByRole("link", { name: /Manage team/i })).toHaveAttribute("href", "/teams/team_customer_1");

    fireEvent.click(screen.getByRole("button", { name: /Make private/i }));
    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalled());
    expect(await screen.findByRole("button", { name: /Make public/i })).toBeInTheDocument();
  });
});
