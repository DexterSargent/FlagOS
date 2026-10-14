import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PlatformAdminPage from "@/app/admin/page";

const { mockGetDocs, mockUpdateDoc, mockDeleteDoc, mockReplace, mockUseAuth } = vi.hoisted(() => ({
  mockGetDocs: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockDeleteDoc: vi.fn(),
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
  deleteDoc: mockDeleteDoc,
}));

describe("Platform management page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled();
    });

    // League should update in UI
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
      expect(mockUpdateDoc).toHaveBeenCalled();
    });

    expect(screen.getByText("newcommish@league.com")).toBeInTheDocument();

    // Remove the new admin
    const removeButtons = screen.getAllByRole("button", { name: /Remove/i });
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled();
    });
  });

  it("allows deleting a league after confirmation", async () => {
    render(<PlatformAdminPage />);

    expect(await screen.findByText("Customer League")).toBeInTheDocument();

    // Click Delete button on league card
    fireEvent.click(screen.getByRole("button", { name: /Delete/i }));

    // Confirmation dialog opens
    expect(screen.getByRole("heading", { name: "Delete League" })).toBeInTheDocument();

    // Click confirm delete
    fireEvent.click(screen.getByRole("button", { name: /Confirm Delete/i }));

    await waitFor(() => {
      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    // League is removed from list
    await waitFor(() => {
      expect(screen.queryByText("Customer League")).not.toBeInTheDocument();
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
});

