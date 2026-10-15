import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import RoleSwitcherBar from "@/components/RoleSwitcherBar";
import { AuthProvider, useAuth } from "@/lib/authContext";

vi.mock("@/lib/firebase", () => ({ app: {}, db: {}, auth: {} }));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => {
    void callback(null);
    return vi.fn();
  }),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(async () => null),
  GoogleAuthProvider: vi.fn(() => ({ setCustomParameters: vi.fn() })),
  signOut: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => null })),
  setDoc: vi.fn(),
  collection: vi.fn(() => ({})),
  getDocs: vi.fn(async () => ({ docs: [] })),
  serverTimestamp: vi.fn(() => "server-time"),
}));

vi.mock("@/lib/demoSandbox", () => ({
  getSandboxPlayers: vi.fn(() => []),
  getSandboxTeams: vi.fn(() => [
    { id: "team_apex", name: "Apex Predators" },
    { id: "team_kc", name: "Kansas City" },
  ]),
  subscribeDemoSandbox: vi.fn(() => vi.fn()),
  notifySandboxChange: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/schedule",
}));

function RoleInspector() {
  const { role, isLeagueAdmin, isTeamAdmin, canManageSchedule } = useAuth();
  return (
    <div>
      <span data-testid="auth-role">{role}</span>
      <span data-testid="is-league-admin">{String(isLeagueAdmin)}</span>
      <span data-testid="is-team-admin">{String(isTeamAdmin())}</span>
      <span data-testid="can-manage-schedule">{String(canManageSchedule)}</span>
    </div>
  );
}

describe("RoleSwitcherBar & Auth Lock in Embed Mode", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  it("removes RoleSwitcherBar completely from the interactive demo frame", () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: new URL("http://localhost:3000/schedule?embed=true&demo=true"),
    });

    const { container } = render(
      <AuthProvider>
        <RoleSwitcherBar />
      </AuthProvider>
    );

    // Role switcher should not be rendered in the document
    expect(container.querySelector("nav")).toBeNull();
    expect(screen.queryByText(/Persona Simulator/i)).toBeNull();
    expect(screen.queryByText(/League Admin/i)).toBeNull();
  });

  it("locks user into league_admin role for non-playbook embedded features (e.g. schedule)", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: new URL("http://localhost:3000/schedule?embed=true&demo=true"),
    });

    render(
      <AuthProvider>
        <RoleInspector />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-role").textContent).toBe("league_admin");
      expect(screen.getByTestId("is-league-admin").textContent).toBe("true");
      expect(screen.getByTestId("can-manage-schedule").textContent).toBe("true");
    });
  });

  it("locks user into team_admin role when in playbook embedded feature", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: new URL("http://localhost:3000/teams/team_kc/playbook?embed=true&demo=true"),
    });

    render(
      <AuthProvider>
        <RoleInspector />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-role").textContent).toBe("team_admin");
      expect(screen.getByTestId("is-league-admin").textContent).toBe("false");
      expect(screen.getByTestId("is-team-admin").textContent).toBe("true");
    });
  });
});
