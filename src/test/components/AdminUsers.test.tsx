import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminUsers, { Membership } from "@/components/admin/AdminUsers";
import type { PlatformUser } from "@/lib/adminMetrics";

describe("AdminUsers Component Suite", () => {
  const dummyUsers: PlatformUser[] = [
    {
      uid: "u_admin",
      email: "commissioner@flagos.ca",
      displayName: "Commissioner Dave",
      emailVerified: true,
      disabled: false,
      createdAt: Date.now() - 10 * 86400000,
      lastSignInAt: Date.now() - 86400000,
      providers: ["google.com"],
    },
    {
      uid: "u_player",
      email: "player@flagos.ca",
      displayName: "Marcus Vance",
      emailVerified: false,
      disabled: false,
      createdAt: Date.now() - 40 * 86400000,
      lastSignInAt: Date.now() - 100 * 86400000, // Dormant > 90d
      providers: ["password"],
    },
    {
      uid: "u_disabled",
      email: "banned@flagos.ca",
      displayName: "Banned User",
      emailVerified: true,
      disabled: true,
      createdAt: Date.now() - 60 * 86400000,
      lastSignInAt: Date.now() - 50 * 86400000,
      providers: ["password"],
    },
  ];

  const dummyMemberships = new Map<string, Membership[]>([
    [
      "commissioner@flagos.ca",
      [
        { id: "L1", name: "Apex League", kind: "league" },
        { id: "T1", name: "Predators", kind: "team" },
      ],
    ],
    [
      "player@flagos.ca",
      [{ id: "P1", name: "Predators", kind: "player" }],
    ],
  ]);

  it("renders user accounts, stats cards, and membership badges", () => {
    const onSetDisabled = vi.fn().mockResolvedValue(undefined);

    render(
      <AdminUsers
        users={dummyUsers}
        memberships={dummyMemberships}
        onSetDisabled={onSetDisabled}
      />
    );

    expect(screen.getByText("commissioner@flagos.ca")).toBeInTheDocument();
    expect(screen.getByText("player@flagos.ca")).toBeInTheDocument();
    expect(screen.getByText("banned@flagos.ca")).toBeInTheDocument();

    // Check badges
    expect(screen.getByText("Runs")).toBeInTheDocument();
    expect(screen.getByText("Plays on")).toBeInTheDocument();
    expect(screen.getByText("Unverified")).toBeInTheDocument();
    expect(screen.getAllByText("Disabled").length).toBeGreaterThan(0);
  });

  it("filters users using search box and filter dropdown", () => {
    const onSetDisabled = vi.fn().mockResolvedValue(undefined);

    render(
      <AdminUsers
        users={dummyUsers}
        memberships={dummyMemberships}
        onSetDisabled={onSetDisabled}
      />
    );

    // Search by name
    const searchInput = screen.getByLabelText("Search accounts");
    fireEvent.change(searchInput, { target: { value: "Marcus" } });
    expect(screen.getByText("player@flagos.ca")).toBeInTheDocument();
    expect(screen.queryByText("commissioner@flagos.ca")).toBeNull();

    // Clear search
    fireEvent.change(searchInput, { target: { value: "" } });

    // Filter by unverified
    const filterSelect = screen.getByLabelText("Filter accounts");
    fireEvent.change(filterSelect, { target: { value: "unverified" } });
    expect(screen.getByText("player@flagos.ca")).toBeInTheDocument();
    expect(screen.queryByText("commissioner@flagos.ca")).toBeNull();

    // Filter by disabled
    fireEvent.change(filterSelect, { target: { value: "disabled" } });
    expect(screen.getByText("banned@flagos.ca")).toBeInTheDocument();
    expect(screen.queryByText("player@flagos.ca")).toBeNull();

    // Filter by dormant
    fireEvent.change(filterSelect, { target: { value: "dormant" } });
    expect(screen.getByText("player@flagos.ca")).toBeInTheDocument();
  });

  it("toggles user disabled state and handles export to CSV", async () => {
    const onSetDisabled = vi.fn().mockResolvedValue(undefined);
    const createObjectURLMock = vi.fn().mockReturnValue("blob:mock");
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = vi.fn();

    render(
      <AdminUsers
        users={dummyUsers}
        memberships={dummyMemberships}
        onSetDisabled={onSetDisabled}
      />
    );

    // Click Disable button on player@flagos.ca
    const disableBtn = screen.getByRole("button", { name: /Disable account player@flagos\.ca/i });
    fireEvent.click(disableBtn);
    await waitFor(() => {
      expect(onSetDisabled).toHaveBeenCalledWith(dummyUsers[1], true);
    });

    // Click Enable button on banned@flagos.ca
    const enableBtn = screen.getByRole("button", { name: /Enable account banned@flagos\.ca/i });
    fireEvent.click(enableBtn);
    await waitFor(() => {
      expect(onSetDisabled).toHaveBeenCalledWith(dummyUsers[2], false);
    });

    // Click CSV Export button
    const csvBtn = screen.getByRole("button", { name: /CSV/i });
    fireEvent.click(csvBtn);
    expect(createObjectURLMock).toHaveBeenCalled();
  });

  it("handles pagination when user list exceeds PAGE_SIZE", () => {
    const manyUsers: PlatformUser[] = Array.from({ length: 70 }, (_, i) => ({
      uid: `u_${i}`,
      email: `user_${i}@example.com`,
      displayName: `User ${i}`,
      emailVerified: true,
      disabled: false,
      createdAt: Date.now(),
      lastSignInAt: Date.now(),
      providers: ["password"],
    }));

    render(
      <AdminUsers
        users={manyUsers}
        memberships={new Map()}
        onSetDisabled={vi.fn()}
      />
    );

    expect(screen.getByText(/Showing 50 of 70/i)).toBeInTheDocument();
    const showMoreBtn = screen.getByRole("button", { name: /Show 20 more/i });
    fireEvent.click(showMoreBtn);
    expect(screen.getByText(/Showing 70 of 70/i)).toBeInTheDocument();
  });
});
