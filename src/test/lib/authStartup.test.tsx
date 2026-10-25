import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, clearIdentityLookupCache, useAuth } from "@/lib/authContext";

const mocks = vi.hoisted(() => ({
  callback: null as null | ((user: unknown) => Promise<void>),
  getDoc: vi.fn(), lookup: vi.fn(), setDoc: vi.fn(), sandboxPlayers: vi.fn(),
}));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => { mocks.callback = callback; return vi.fn(); }),
  getRedirectResult: vi.fn(async () => null),
  signInWithPopup: vi.fn(), GoogleAuthProvider: vi.fn(),
  signInWithEmailAndPassword: vi.fn(), createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(), updateProfile: vi.fn(), signOut: vi.fn(),
}));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, collection, id) => ({ collection, id })),
  getDoc: mocks.getDoc, setDoc: mocks.setDoc,
}));
vi.mock("@/lib/secureWrites", () => ({ requestPrivateData: mocks.lookup }));
vi.mock("@/lib/demoSandbox", () => ({ getSandboxPlayers: mocks.sandboxPlayers }));
vi.mock("@/lib/yorkTeamData", () => ({ YORK_LIONS_PLAYERS: [] }));
function Probe() {
  const auth = useAuth();
  return <output>{JSON.stringify({
    uid: auth.userProfile?.uid, role: auth.role, loading: auth.loading,
    playerId: auth.userProfile?.playerId, teamId: auth.managedTeamId,
  })}</output>;
}
const state = () => JSON.parse(screen.getByRole("status").textContent!);
const user = (uid = "verified") => ({ uid, email: `${uid}@example.com`, emailVerified: true });
const profile = (uid = "verified") => ({ exists: () => true, data: () => ({ uid, role: "league_admin" }) });

describe("Parallel auth startup", () => {
  const originalLocation = window.location;
  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });
  beforeEach(() => {
    clearIdentityLookupCache();
    mocks.callback = null;
    mocks.getDoc.mockResolvedValue(profile());
    mocks.lookup.mockResolvedValue({ teams: [], players: [] });
    mocks.sandboxPlayers.mockReturnValue([]);
    localStorage.clear();
  });

  it("paints a cached profile for the same verified uid instantly, then revalidates", async () => {
    localStorage.setItem("flagos_profile_verified", JSON.stringify({
      uid: "verified", email: "verified@example.com", role: "team_admin", managedTeamId: "customer-team",
    }));
    let finishProfile!: (value: unknown) => void;
    mocks.getDoc.mockReturnValue(new Promise((resolve) => { finishProfile = resolve; }));
    render(<AuthProvider><Probe /></AuthProvider>);
    let pending!: Promise<void>;
    act(() => { pending = mocks.callback!(user()); });
    expect(state()).toMatchObject({ uid: "verified", role: "team_admin", teamId: "customer-team", loading: false });
    await act(async () => {
      finishProfile(profile());
      await pending;
    });
    expect(state()).toMatchObject({ role: "user", loading: false });
    expect(JSON.parse(localStorage.getItem("flagos_profile_verified")!)).toMatchObject({ role: "user" });
  });

  it("ignores cached profiles for another uid or an unverified email", async () => {
    localStorage.setItem("flagos_profile_verified", JSON.stringify({ uid: "other", email: "verified@example.com", role: "team_admin" }));
    localStorage.setItem("flagos_profile_unverified", JSON.stringify({ uid: "unverified", email: "unverified@example.com", role: "team_admin" }));
    mocks.getDoc.mockReturnValue(new Promise(() => {}));
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => { void mocks.callback!(user()); });
    expect(state()).toMatchObject({ role: "user", loading: true });
    act(() => { void mocks.callback!({ ...user("unverified"), emailVerified: false }); });
    expect(state()).toMatchObject({ role: "user", loading: true });
  });

  it("starts profile and a single shared identity lookup before either resolves", async () => {
    let finishProfile!: (value: unknown) => void;
    let finishLookup!: (value: unknown) => void;
    mocks.getDoc.mockReturnValue(new Promise((resolve) => { finishProfile = resolve; }));
    mocks.lookup.mockReturnValue(new Promise((resolve) => { finishLookup = resolve; }));
    render(<AuthProvider><Probe /></AuthProvider>);
    let pending!: Promise<void>;
    act(() => { pending = mocks.callback!(user()); });
    expect(mocks.getDoc).toHaveBeenCalledOnce();
    expect(mocks.lookup).toHaveBeenCalledOnce();
    expect(state().loading).toBe(true);
    await act(async () => {
      finishLookup({
        teams: [{ id: "customer-team", name: "Customer Team" }],
        players: [{ id: "customer-player", teamId: "customer-team", email: "verified@example.com" }],
      });
      finishProfile(profile());
      await pending;
    });
    expect(state()).toMatchObject({
      uid: "verified", role: "team_admin", teamId: "customer-team", playerId: "customer-player", loading: false,
    });
    expect(mocks.sandboxPlayers).not.toHaveBeenCalled();
  });

  it("does not perform private identity lookup for an unverified email or trust cached roles", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => { await mocks.callback!({ ...user(), emailVerified: false }); });
    expect(mocks.lookup).not.toHaveBeenCalled();
    expect(state()).toMatchObject({ role: "user", loading: false });
    expect(mocks.sandboxPlayers).not.toHaveBeenCalled();
  });

  it("does not load demo players for a real York route even after a demo session", async () => {
    Object.defineProperty(window, "location", {
      configurable: true, value: new URL("https://flagos.app/teams/york_lions"),
    });
    sessionStorage.setItem("flagos_demo_active", "true");
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => { await mocks.callback!(user()); });
    expect(state()).toMatchObject({ role: "user", loading: false });
    expect(mocks.sandboxPlayers).not.toHaveBeenCalled();
  });

  it("discards stale auth results after sign-out without writing a profile", async () => {
    let finishProfile!: (value: unknown) => void;
    mocks.getDoc.mockReturnValue(new Promise((resolve) => { finishProfile = resolve; }));
    render(<AuthProvider><Probe /></AuthProvider>);
    let pending!: Promise<void>;
    act(() => { pending = mocks.callback!(user()); });
    await act(async () => { await mocks.callback!(null); });
    await act(async () => {
      finishProfile({ exists: () => false });
      await pending;
    });
    expect(state()).toMatchObject({ role: "user", loading: false });
    expect(state().uid).toBeUndefined();
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });

  it("invalidates outstanding work on provider unmount", async () => {
    let finishProfile!: (value: unknown) => void;
    mocks.getDoc.mockReturnValue(new Promise((resolve) => { finishProfile = resolve; }));
    const view = render(<AuthProvider><Probe /></AuthProvider>);
    let pending!: Promise<void>;
    act(() => { pending = mocks.callback!(user()); });
    view.unmount();
    await act(async () => {
      finishProfile({ exists: () => false });
      await pending;
    });
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });
});
