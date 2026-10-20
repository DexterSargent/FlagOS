"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, doc, getDocs, updateDoc, query, limit } from "firebase/firestore";
import {
  AlertCircle,
  ArrowLeft,
  LogOut,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Layers,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { db } from "@/lib/firebase";
import { isYorkTeam, YORK_TEAM_ID, getYorkTeamData } from "@/lib/yorkTeamData";
import { createSecureRecord, requestPrivateData } from "@/lib/secureWrites";

export interface ManagedRecord {
  id: string;
  name: string;
  leagueName?: string;
  shortcode: string;
  seasonTitle?: string;
  visibility?: string;
  subscriptionStatus?: string;
  subscription?: {
    status?: string;
    plan?: string;
    baseMonthlyFee?: number;
    perTeamMonthlyFee?: number;
    teamCount?: number;
    totalMonthlyFee?: number;
    renewsAt?: string;
    adminEmails?: string[];
    cascadedFromLeagueId?: string;
    cascadedFromLeagueName?: string;
    [key: string]: unknown;
  };
  adminEmails: string[];
  primaryColor?: string;
  accentColor?: string;
  leagueId?: string;
  [key: string]: unknown;
}

const getText = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value : fallback;

export default function PlatformAdminPage() {
  const router = useRouter();
  const { user, isPlatformAdmin, loading: authLoading, logout } = useAuth();
  const [leagues, setLeagues] = useState<ManagedRecord[]>([]);
  const [teams, setTeams] = useState<ManagedRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const recordsRequestPending = useRef(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [updatingLeagueId, setUpdatingLeagueId] = useState<string | null>(null);

  // Modal states
  const [editingLeague, setEditingLeague] = useState<ManagedRecord | null>(null);
  const [adminManagingLeague, setAdminManagingLeague] = useState<ManagedRecord | null>(null);
  const [deletingLeague, setDeletingLeague] = useState<ManagedRecord | null>(null);

  // Form states for Editing League
  const [editForm, setEditForm] = useState({
    name: "",
    shortcode: "",
    seasonTitle: "",
    visibility: "public",
    subscriptionStatus: "active",
    primaryColor: "#3ca505",
    accentColor: "#3b82f6",
    cascadeSubscription: true,
  });

  // Admin management form
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adminActionError, setAdminActionError] = useState("");
  const [actionInProgress, setActionInProgress] = useState(false);

  const loadRecords = useCallback(async () => {
    // Effect replay must not spend the overview's read budget twice.
    if (recordsRequestPending.current) return;
    recordsRequestPending.current = true;
    setLoadingRecords(true);
    setError("");
    try {
      type RawRecord = { id: string; data: () => Record<string, any> };
      const toDocs = (rows: Array<Record<string, any>>): RawRecord[] =>
        rows.map((row) => ({ id: String(row.id), data: () => row }));
      // The server overview uses the Admin SDK, so private or PII-bearing records
      // that Firestore list rules would reject no longer break the whole page.
      const privateData = await requestPrivateData<{
        leagues: Record<string, { adminEmails?: string[]; subscriptionAdminEmails?: string[]; contactEmail?: string }>;
        teams: Record<string, { adminEmails?: string[]; coachEmail?: string; adminEmail?: string; email?: string }>;
        records?: { leagues: Array<Record<string, any>>; teams: Array<Record<string, any>> };
      }>("admin_overview");
      const leagueSnapshot = {
        docs: privateData.records
          ? toDocs(privateData.records.leagues)
          : (await getDocs(query(collection(db, "leagues"), limit(100)))).docs,
      };
      const teamSnapshot = {
        docs: privateData.records
          ? toDocs(privateData.records.teams)
          : (await getDocs(query(collection(db, "teams"), limit(300)))).docs,
      };
      setLeagues(
        leagueSnapshot.docs.map((record) => {
          const data = record.data();
          const privateLeague = privateData.leagues[record.id];
          const rawAdmins = Array.isArray(privateLeague?.adminEmails)
            ? privateLeague.adminEmails
            : Array.isArray(data.admins)
            ? data.admins
            : Array.isArray(privateLeague?.subscriptionAdminEmails)
            ? privateLeague.subscriptionAdminEmails
            : [];
          const adminEmails = rawAdmins
            .map((e: unknown) => String(e).trim().toLowerCase())
            .filter(Boolean);

          return {
            ...data,
            id: record.id,
            name: getText(data.leagueName ?? data.name, "Untitled league"),
            leagueName: getText(data.leagueName ?? data.name, "Untitled league"),
            shortcode: getText(data.shortcode, ""),
            seasonTitle: getText(data.seasonTitle, "2026 Season"),
            visibility: getText(data.visibility, "public"),
            subscriptionStatus: getText(data.subscription?.status, "Not set"),
            subscription: typeof data.subscription === "object" && data.subscription !== null
              ? (data.subscription as Record<string, unknown>)
              : { status: getText(data.subscription?.status, "Not set") },
            adminEmails,
            contactEmail: privateLeague?.contactEmail || "",
            primaryColor: getText(data.primaryColor, "#3ca505"),
            accentColor: getText(data.accentColor, "#3b82f6"),
          };
        })
      );
      const loadedTeams: ManagedRecord[] = teamSnapshot.docs.map((record) => {
        const data = record.data();
        const privateTeam = privateData.teams[record.id];
        const rawAdmins = Array.isArray(privateTeam?.adminEmails)
          ? privateTeam.adminEmails
          : [privateTeam?.coachEmail, privateTeam?.adminEmail, privateTeam?.email].filter(Boolean);
        const adminEmails = rawAdmins
          .map((e: unknown) => String(e).trim().toLowerCase())
          .filter(Boolean);

        return {
          ...data,
          id: record.id,
          name: getText(data.name ?? data.teamName, "Untitled team"),
          shortcode: getText(data.shortcode, ""),
          leagueId: getText(data.leagueId, ""),
          subscriptionStatus: getText(data.subscription?.status, "Not set"),
          subscription: typeof data.subscription === "object" && data.subscription !== null
            ? (data.subscription as Record<string, unknown>)
            : { status: getText(data.subscription?.status, "Not set") },
          adminEmails,
        };
      });

      // Ensure York Lions is treated like a normal team in platform admin
      const hasYork = loadedTeams.some((t) => t.id === YORK_TEAM_ID || isYorkTeam(t.id));
      if (!hasYork) {
        const yorkData = getYorkTeamData();
        const rawAdmins = Array.isArray(yorkData.adminEmails)
          ? yorkData.adminEmails
          : [yorkData.coachEmail, yorkData.adminEmail, yorkData.email].filter(Boolean);
        const adminEmails = (rawAdmins.length ? rawAdmins : ["dextersargent@gmail.com"])
          .map((e: unknown) => String(e).trim().toLowerCase())
          .filter(Boolean);

        loadedTeams.push({
          ...yorkData,
          id: YORK_TEAM_ID,
          name: getText(yorkData.name ?? yorkData.teamName, "York Lions Women's Flag Football"),
          shortcode: getText(yorkData.shortcode, "YORK"),
          leagueId: getText(yorkData.leagueId, ""),
          subscriptionStatus: getText(yorkData.subscription?.status, "active"),
          subscription: typeof yorkData.subscription === "object" && yorkData.subscription !== null
            ? (yorkData.subscription as Record<string, unknown>)
            : { status: "active", plan: "team_pro" },
          adminEmails,
          primaryColor: getText(yorkData.primaryColor, "#E31837"),
          accentColor: getText(yorkData.secondaryColor, "#FFFFFF"),
        });
      }

      setTeams(loadedTeams);
    } catch (loadError) {
      console.error("Failed to load platform records:", loadError);
      setError(
        loadError instanceof Error && loadError.message
          ? `Could not load leagues and teams. ${loadError.message}`
          : "Could not load leagues and teams. Check the Firebase connection and try again.",
      );
    } finally {
      recordsRequestPending.current = false;
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/admin")}`);
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && isPlatformAdmin) void loadRecords();
  }, [authLoading, isPlatformAdmin, loadRecords]);

  // Flash message timeout
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [successMessage]);

  // Collapsible dropdown state for leagues (key: leagueId, value: true if collapsed)
  // By default, leagues start with their member teams dropdown sublist expanded
  const [collapsedLeagues, setCollapsedLeagues] = useState<Record<string, boolean>>({});

  const toggleLeagueDropdown = useCallback((leagueId: string) => {
    setCollapsedLeagues((prev) => ({
      ...prev,
      [leagueId]: !prev[leagueId],
    }));
  }, []);

  const filteredLeagues = useMemo(
    () =>
      leagues.filter((league) => {
        const query = search.toLowerCase();
        const matchesLeague = `${league.name} ${league.shortcode} ${league.id}`.toLowerCase().includes(query);
        const matchesMemberTeam = teams
          .filter((t) => t.leagueId === league.id)
          .some((t) => `${t.name} ${t.shortcode} ${t.id}`.toLowerCase().includes(query));
        return matchesLeague || matchesMemberTeam;
      }),
    [leagues, teams, search]
  );

  const filteredTeams = useMemo(
    () => teams.filter((team) => `${team.name} ${team.shortcode} ${team.id} ${team.leagueId || ""}`.toLowerCase().includes(search.toLowerCase())),
    [teams, search]
  );

  // Tab for the Teams column: "independent" (teams not in a league) or "all"
  const [teamTab, setTeamTab] = useState<"independent" | "all">("independent");

  const independentTeams = useMemo(
    () => filteredTeams.filter((team) => !team.leagueId || !leagues.some((l) => l.id === team.leagueId)),
    [filteredTeams, leagues]
  );

  const displayedTeams = teamTab === "independent" ? independentTeams : filteredTeams;

  const areAllCollapsed = useMemo(() => {
    if (!filteredLeagues.length) return false;
    return filteredLeagues.every((l) => !!collapsedLeagues[l.id]);
  }, [filteredLeagues, collapsedLeagues]);

  const toggleAllLeagues = useCallback(() => {
    if (areAllCollapsed) {
      setCollapsedLeagues({});
    } else {
      const nextCollapsed: Record<string, boolean> = {};
      filteredLeagues.forEach((l) => {
        nextCollapsed[l.id] = true;
      });
      setCollapsedLeagues(nextCollapsed);
    }
  }, [areAllCollapsed, filteredLeagues]);

  // Helper for cascading team subscription
  const getTeamSubscriptionInfo = useCallback((team: ManagedRecord) => {
    if (team.leagueId) {
      const parentLeague = leagues.find((l) => l.id === team.leagueId);
      if (parentLeague) {
        const parentStatus = parentLeague.subscriptionStatus || "Not set";
        const isCovered = parentStatus.toLowerCase() !== "not set" && parentStatus.toLowerCase() !== "none";
        return {
          isCascaded: true,
          parentLeague,
          status: parentStatus,
          badgeLabel: isCovered
            ? `Covered by ${parentLeague.name} (${parentStatus})`
            : `Uncovered (${parentLeague.name} inactive)`,
          isCovered,
        };
      }
    }
    const standaloneStatus = team.subscriptionStatus || "Not set";
    return {
      isCascaded: false,
      parentLeague: null,
      status: standaloneStatus,
      badgeLabel: standaloneStatus,
      isCovered: standaloneStatus.toLowerCase() === "active" || standaloneStatus.toLowerCase() === "trial",
    };
  }, [leagues]);

  const toggleLeagueVisibility = async (league: ManagedRecord) => {
    const visibility = league.visibility === "private" ? "public" : "private";
    setUpdatingLeagueId(league.id);
    setError("");
    try {
      await updateDoc(doc(db, "leagues", league.id), { visibility });
      setLeagues((current) => current.map((entry) => entry.id === league.id ? { ...entry, visibility } : entry));
      setSuccessMessage(`Visibility for "${league.name}" set to ${visibility}.`);
    } catch (updateError) {
      console.error(`Failed to update visibility for league ${league.id}:`, updateError);
      setError(`Could not update ${league.name}. Try again.`);
    } finally {
      setUpdatingLeagueId(null);
    }
  };

  // Open Edit Modal
  const openEditModal = (league: ManagedRecord) => {
    setEditingLeague(league);
    setEditForm({
      name: league.name,
      shortcode: league.shortcode,
      seasonTitle: league.seasonTitle || "2026 Season",
      visibility: league.visibility || "public",
      subscriptionStatus: league.subscriptionStatus || "active",
      primaryColor: league.primaryColor || "#3ca505",
      accentColor: league.accentColor || "#3b82f6",
      cascadeSubscription: true,
    });
    setError("");
  };

  // Save Edit League
  const handleSaveLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeague) return;

    setActionInProgress(true);
    setError("");

    try {
      const updatedFields = {
        leagueName: editForm.name,
        name: editForm.name,
        shortcode: editForm.shortcode.toUpperCase(),
        seasonTitle: editForm.seasonTitle,
        visibility: editForm.visibility,
        primaryColor: editForm.primaryColor,
        accentColor: editForm.accentColor,
        subscription: {
          ...(typeof editingLeague.subscription === "object" ? editingLeague.subscription : {}),
          status: editForm.subscriptionStatus,
        },
      };

      await updateDoc(doc(db, "leagues", editingLeague.id), updatedFields);

      // Cascade subscription status to member teams if requested
      if (editForm.cascadeSubscription) {
        const memberTeams = teams.filter((t) => t.leagueId === editingLeague.id);
        if (memberTeams.length > 0) {
          await Promise.all(
            memberTeams.map((team) =>
              updateDoc(doc(db, "teams", team.id), {
                subscription: {
                  status: editForm.subscriptionStatus,
                  plan: "team",
                  cascadedFromLeagueId: editingLeague.id,
                  cascadedFromLeagueName: editForm.name,
                },
              })
            )
          );

          // Update local teams state
          setTeams((prev) =>
            prev.map((team) =>
              team.leagueId === editingLeague.id
                ? {
                    ...team,
                    subscriptionStatus: editForm.subscriptionStatus,
                    subscription: {
                      ...team.subscription,
                      status: editForm.subscriptionStatus,
                      cascadedFromLeagueId: editingLeague.id,
                      cascadedFromLeagueName: editForm.name,
                    },
                  }
                : team
            )
          );
        }
      }

      // Update local leagues state
      setLeagues((prev) =>
        prev.map((l) =>
          l.id === editingLeague.id
            ? {
                ...l,
                ...updatedFields,
                subscriptionStatus: editForm.subscriptionStatus,
              }
            : l
        )
      );

      setSuccessMessage(`League "${editForm.name}" updated successfully.`);
      setEditingLeague(null);
    } catch (saveError) {
      console.error("Failed to update league:", saveError);
      setError("Failed to update league. Check console for details.");
    } finally {
      setActionInProgress(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (league: ManagedRecord) => {
    setDeletingLeague(league);
    setError("");
  };

  // Confirm Delete League
  const handleConfirmDelete = async () => {
    if (!deletingLeague) return;

    setActionInProgress(true);
    setError("");

    try {
      await createSecureRecord("delete_league", { leagueId: deletingLeague.id });

      // Dissociate member teams
      const memberTeams = teams.filter((t) => t.leagueId === deletingLeague.id);
      if (memberTeams.length > 0) {
        setTeams((prev) =>
          prev.map((t) =>
            t.leagueId === deletingLeague.id ? { ...t, leagueId: "" } : t
          )
        );
      }

      setLeagues((prev) => prev.filter((l) => l.id !== deletingLeague.id));
      setSuccessMessage(`League "${deletingLeague.name}" deleted.`);
      setDeletingLeague(null);
    } catch (delError) {
      console.error("Failed to delete league:", delError);
      setError("Failed to delete league. Check console for details.");
    } finally {
      setActionInProgress(false);
    }
  };

  // Open Admins Modal
  const openAdminsModal = (league: ManagedRecord) => {
    setAdminManagingLeague(league);
    setNewAdminEmail("");
    setAdminActionError("");
  };

  // Add Admin Email
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminManagingLeague) return;

    const cleanEmail = newAdminEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setAdminActionError("Please enter a valid email address.");
      return;
    }

    if (adminManagingLeague.adminEmails.includes(cleanEmail)) {
      setAdminActionError("This email is already an admin for this league.");
      return;
    }

    setActionInProgress(true);
    setAdminActionError("");

    try {
      const nextAdmins = [...adminManagingLeague.adminEmails, cleanEmail];
      await createSecureRecord("league_private_update", {
        leagueId: adminManagingLeague.id,
        adminEmails: nextAdmins,
      });

      // Update local states
      const updatedLeague = { ...adminManagingLeague, adminEmails: nextAdmins };
      setAdminManagingLeague(updatedLeague);
      setLeagues((prev) =>
        prev.map((l) => (l.id === adminManagingLeague.id ? updatedLeague : l))
      );
      setNewAdminEmail("");
      setSuccessMessage(`Added ${cleanEmail} as admin for "${adminManagingLeague.name}".`);
    } catch (adminError) {
      console.error("Failed to add admin:", adminError);
      setAdminActionError("Could not add admin. Please try again.");
    } finally {
      setActionInProgress(false);
    }
  };

  // Remove Admin Email
  const handleRemoveAdmin = async (emailToRemove: string) => {
    if (!adminManagingLeague) return;

    setActionInProgress(true);
    setAdminActionError("");

    try {
      const nextAdmins = adminManagingLeague.adminEmails.filter((e) => e !== emailToRemove);
      await createSecureRecord("league_private_update", {
        leagueId: adminManagingLeague.id,
        adminEmails: nextAdmins,
      });

      // Update local states
      const updatedLeague = { ...adminManagingLeague, adminEmails: nextAdmins };
      setAdminManagingLeague(updatedLeague);
      setLeagues((prev) =>
        prev.map((l) => (l.id === adminManagingLeague.id ? updatedLeague : l))
      );
      setSuccessMessage(`Removed ${emailToRemove} from "${adminManagingLeague.name}".`);
    } catch (adminError) {
      console.error("Failed to remove admin:", adminError);
      setAdminActionError("Could not remove admin. Please try again.");
    } finally {
      setActionInProgress(false);
    }
  };

  if (authLoading || (!user && !isPlatformAdmin)) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-neutral-950 text-neutral-300">
        <LoaderCircle className="h-6 w-6 animate-spin text-cyan-400" aria-label="Checking access" />
      </main>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-neutral-950 px-6 text-white">
        <section className="max-w-md rounded-3xl border border-amber-500/20 bg-neutral-900 p-8 text-center">
          <LockKeyhole className="mx-auto h-9 w-9 text-amber-400" />
          <h1 className="mt-4 text-xl font-black">Restricted platform area</h1>
          <p className="mt-2 text-sm text-neutral-400">This management page is only available to the FlagOS platform owner.</p>
          <Link href="/" className="mt-6 inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15">
            Return to FlagOS
          </Link>
          {user && (
            <button type="button" onClick={() => void logout()} className="mt-3 block w-full text-xs font-bold text-neutral-400 hover:text-white cursor-pointer">
              Sign out to switch accounts
            </button>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> FlagOS home
            </Link>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Platform management</h1>
            <p className="mt-2 text-sm text-neutral-400">View, edit, and configure customer leagues, team portals, admins, and cascading subscriptions.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadRecords()}
            disabled={loadingRecords}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loadingRecords ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-neutral-300 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
            <Building2 className="h-8 w-8 text-cyan-300" />
            <div>
              <div className="text-2xl font-black">{leagues.length}</div>
              <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Leagues</div>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <Shield className="h-8 w-8 text-emerald-300" />
            <div>
              <div className="text-2xl font-black">{teams.length}</div>
              <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Teams (League & Independent)</div>
            </div>
          </div>
        </div>

        <label className="mt-7 flex max-w-xl items-center gap-3 rounded-xl border border-white/10 bg-neutral-900 px-4 py-3">
          <Search className="h-4 w-4 text-neutral-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search leagues, teams, or IDs"
            className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-600"
          />
        </label>

        {successMessage && (
          <div role="status" className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <Check className="h-4 w-4 shrink-0 text-emerald-400" /> {successMessage}
          </div>
        )}

        {error && (
          <div role="alert" className="mt-5 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {loadingRecords ? (
          <div className="flex items-center justify-center gap-3 py-20 text-sm text-neutral-400">
            <LoaderCircle className="h-5 w-5 animate-spin text-cyan-400" /> Loading platform records…
          </div>
        ) : (
          <div className="mt-8 grid gap-8 xl:grid-cols-2">
            {/* LEAGUES COLUMN */}
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-black">
                  <Building2 className="h-5 w-5 text-cyan-300" /> Leagues ({filteredLeagues.length})
                </h2>
                {filteredLeagues.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllLeagues}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    {areAllCollapsed ? "Expand all sublists" : "Collapse all sublists"}
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {filteredLeagues.map((league) => {
                  const memberTeams = teams.filter((t) => t.leagueId === league.id);
                  const isCollapsed = !!collapsedLeagues[league.id];

                  return (
                    <article key={league.id} className="rounded-2xl border border-white/10 bg-neutral-900 p-5 transition-colors hover:border-white/20">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{ backgroundColor: league.primaryColor || "#3ca505" }}
                              title={`Theme color: ${league.primaryColor}`}
                            />
                            <h3 className="truncate font-bold text-base">{league.name}</h3>
                          </div>
                          <p className="mt-1 text-xs text-neutral-400">
                            {league.shortcode || "No shortcode"} · <span className="font-mono text-neutral-500">{league.id}</span>
                          </p>
                          {league.seasonTitle && (
                            <p className="mt-0.5 text-xs text-neutral-500">Season: {league.seasonTitle}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            league.subscriptionStatus?.toLowerCase() === "active"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : league.subscriptionStatus?.toLowerCase() === "trial"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                              : "border-white/10 bg-white/5 text-neutral-300"
                          }`}>
                            {league.subscriptionStatus}
                          </span>
                          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-neutral-400 font-medium">
                            {league.visibility || "public"}
                          </span>
                        </div>
                      </div>

                      {/* League Metadata stats */}
                      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3 text-xs text-neutral-400">
                        <button
                          type="button"
                          onClick={() => toggleLeagueDropdown(league.id)}
                          className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                          aria-expanded={!isCollapsed}
                          aria-label={`Toggle teams sublist for ${league.name}`}
                        >
                          <Shield className="h-3.5 w-3.5 text-cyan-400" />
                          <span>
                            <strong className="text-white">{memberTeams.length}</strong> {memberTeams.length === 1 ? "member team" : "member teams"}
                          </span>
                          {isCollapsed ? (
                            <ChevronDown className="h-3.5 w-3.5 text-cyan-300" />
                          ) : (
                            <ChevronUp className="h-3.5 w-3.5 text-cyan-300" />
                          )}
                        </button>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-emerald-400" />
                          <span>
                            <strong className="text-white">{league.adminEmails.length}</strong> {league.adminEmails.length === 1 ? "admin" : "admins"}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                        <Link
                          href={`/league/${league.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20"
                        >
                          Manage league <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEditModal(league)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-neutral-200 hover:bg-white/10"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-neutral-400" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openAdminsModal(league)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-neutral-200 hover:bg-white/10"
                        >
                          <UserPlus className="h-3.5 w-3.5 text-neutral-400" /> Admins ({league.adminEmails.length})
                        </button>
                        <button
                          type="button"
                          disabled={updatingLeagueId === league.id}
                          onClick={() => void toggleLeagueVisibility(league)}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-neutral-300 hover:bg-white/5 disabled:opacity-50"
                        >
                          {updatingLeagueId === league.id ? "Saving…" : `Make ${league.visibility === "private" ? "public" : "private"}`}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleLeagueDropdown(league.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/15"
                          aria-expanded={!isCollapsed}
                        >
                          <Shield className="h-3.5 w-3.5" /> Teams ({memberTeams.length}) {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(league)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/15"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>

                      {/* Cascading Member Teams Collapsible Dropdown Sublist */}
                      {!isCollapsed && (
                        <div className="mt-4 border-t border-white/10 pt-3">
                          <div className="mb-2.5 flex items-center justify-between text-xs text-neutral-400">
                            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-cyan-300">
                              <Layers className="h-3.5 w-3.5" />
                              <span>Member Teams Dropdown ({memberTeams.length})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleLeagueDropdown(league.id)}
                              className="text-[11px] text-neutral-400 hover:text-white transition-colors"
                            >
                              Hide sublist
                            </button>
                          </div>

                          {memberTeams.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-white/10 p-3.5 text-xs text-neutral-500">
                              No member teams enrolled in this league yet.
                            </p>
                          ) : (
                            <div className="space-y-2.5 border-l-2 border-cyan-500/30 pl-3">
                              {memberTeams.map((team) => {
                                const subInfo = getTeamSubscriptionInfo(team);
                                return (
                                  <div
                                    key={team.id}
                                    className="rounded-xl border border-white/10 bg-neutral-950/80 p-3.5 transition-colors hover:border-cyan-500/30"
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                                          <h4 className="truncate text-sm font-bold text-white">{team.name}</h4>
                                          {team.shortcode && (
                                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-neutral-300">
                                              {team.shortcode}
                                            </span>
                                          )}
                                        </div>
                                        <p className="mt-0.5 font-mono text-[11px] text-neutral-500">{team.id}</p>
                                      </div>

                                      <div className="flex flex-col items-end gap-1 text-right">
                                        <span
                                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                            subInfo.isCovered
                                              ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                                              : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                          }`}
                                        >
                                          {subInfo.badgeLabel}
                                        </span>
                                        <span className="text-[10px] text-neutral-400 font-medium">
                                          Cascaded from league
                                        </span>
                                      </div>
                                    </div>

                                    <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2 text-xs">
                                      <span className="text-[11px] text-neutral-400">
                                        {team.adminEmails?.length ? (
                                          <span>{team.adminEmails.length} team admin{team.adminEmails.length > 1 ? "s" : ""}</span>
                                        ) : (
                                          <span className="text-neutral-500">No team admins</span>
                                        )}
                                      </span>
                                      <Link
                                        href={`/teams/${team.id}`}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                                      >
                                        Manage team <ExternalLink className="h-3 w-3" />
                                      </Link>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
                {!filteredLeagues.length && <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-neutral-500">No leagues found.</p>}
              </div>
            </section>

            {/* TEAMS COLUMN */}
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-black">
                  <Shield className="h-5 w-5 text-emerald-300" />
                  {teamTab === "independent" ? `Independent Teams (${independentTeams.length})` : `All Teams (${filteredTeams.length})`}
                </h2>
                <div className="flex rounded-lg border border-white/10 bg-neutral-900 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setTeamTab("independent")}
                    className={`rounded-md px-3 py-1 font-bold transition-colors ${
                      teamTab === "independent"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Independent ({independentTeams.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamTab("all")}
                    className={`rounded-md px-3 py-1 font-bold transition-colors ${
                      teamTab === "all"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    All ({filteredTeams.length})
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {displayedTeams.map((team) => {
                  const subInfo = getTeamSubscriptionInfo(team);
                  return (
                    <article key={team.id} className="rounded-2xl border border-white/10 bg-neutral-900 p-5 transition-colors hover:border-white/20">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-base">{team.name}</h3>
                          <p className="mt-1 text-xs text-neutral-400">
                            {team.shortcode || "No shortcode"} · <span className="font-mono text-neutral-500">{team.id}</span>
                          </p>
                          {subInfo.parentLeague ? (
                            <p className="mt-1 flex items-center gap-1 text-xs text-cyan-300">
                              <Building2 className="h-3 w-3" />
                              <span>Parent League: {subInfo.parentLeague.name}</span>
                            </p>
                          ) : team.leagueId ? (
                            <p className="mt-1 text-xs text-neutral-500">League ID: {team.leagueId}</p>
                          ) : (
                            <p className="mt-1 text-xs text-neutral-500 italic">Independent team (No parent league)</p>
                          )}
                        </div>

                        {/* Cascading Subscription status badge */}
                        <div className="flex flex-col items-end gap-1 text-right">
                          {subInfo.isCascaded ? (
                            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              subInfo.isCovered
                                ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                                : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                            }`}>
                              {subInfo.badgeLabel}
                            </span>
                          ) : (
                            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              subInfo.isCovered
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                : "border-white/10 bg-white/5 text-neutral-300"
                            }`}>
                              {subInfo.badgeLabel}
                            </span>
                          )}
                          {subInfo.isCascaded && (
                            <span className="text-[10px] text-neutral-500 font-medium">
                              Cascaded from league
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
                        <span className="text-[11px] text-neutral-400">
                          {team.adminEmails?.length ? (
                            <span>{team.adminEmails.length} team admin{team.adminEmails.length > 1 ? "s" : ""}</span>
                          ) : (
                            <span className="text-neutral-500">No team admins</span>
                          )}
                        </span>
                        <Link
                          href={`/teams/${team.id}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20"
                        >
                          Manage team <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </article>
                  );
                })}

                {!displayedTeams.length && (
                  teamTab === "independent" ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-900/50 p-6 text-center text-sm text-neutral-400">
                      <Shield className="mx-auto h-8 w-8 text-neutral-600 mb-2" />
                      <p className="font-semibold text-neutral-300">No independent teams</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        All teams belong to leagues and cascade in the Leagues dropdown sublists on the left.
                      </p>
                      {filteredTeams.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setTeamTab("all")}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-neutral-300 hover:bg-white/10"
                        >
                          View all teams directory ({filteredTeams.length})
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-neutral-500">No teams found.</p>
                  )
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* EDIT LEAGUE MODAL */}
      {editingLeague && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-labelledby="edit-league-title" className="w-full max-w-lg rounded-3xl border border-white/15 bg-neutral-900 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h2 id="edit-league-title" className="text-xl font-black">Edit League</h2>
              <button
                type="button"
                onClick={() => setEditingLeague(null)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLeague} className="mt-6 space-y-4">
              <div>
                <label htmlFor="edit-league-name" className="block text-xs font-bold uppercase text-neutral-400 mb-1.5">League Name</label>
                <input
                  id="edit-league-name"
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-league-shortcode" className="block text-xs font-bold uppercase text-neutral-400 mb-1.5">Shortcode</label>
                  <input
                    id="edit-league-shortcode"
                    type="text"
                    required
                    value={editForm.shortcode}
                    onChange={(e) => setEditForm((f) => ({ ...f, shortcode: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-sm uppercase text-white placeholder-neutral-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="edit-league-season" className="block text-xs font-bold uppercase text-neutral-400 mb-1.5">Season Title</label>
                  <input
                    id="edit-league-season"
                    type="text"
                    value={editForm.seasonTitle}
                    onChange={(e) => setEditForm((f) => ({ ...f, seasonTitle: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-league-visibility" className="block text-xs font-bold uppercase text-neutral-400 mb-1.5">Visibility</label>
                  <select
                    id="edit-league-visibility"
                    value={editForm.visibility}
                    onChange={(e) => setEditForm((f) => ({ ...f, visibility: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-league-subscription" className="block text-xs font-bold uppercase text-neutral-400 mb-1.5">Subscription Status</label>
                  <select
                    id="edit-league-subscription"
                    value={editForm.subscriptionStatus}
                    onChange={(e) => setEditForm((f) => ({ ...f, subscriptionStatus: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="past_due">Past Due</option>
                    <option value="canceled">Canceled</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-400 mb-1.5">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editForm.primaryColor}
                      onChange={(e) => setEditForm((f) => ({ ...f, primaryColor: e.target.value }))}
                      className="h-9 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={editForm.primaryColor}
                      onChange={(e) => setEditForm((f) => ({ ...f, primaryColor: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-400 mb-1.5">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editForm.accentColor}
                      onChange={(e) => setEditForm((f) => ({ ...f, accentColor: e.target.value }))}
                      className="h-9 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={editForm.accentColor}
                      onChange={(e) => setEditForm((f) => ({ ...f, accentColor: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Cascade subscription option */}
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.cascadeSubscription}
                    onChange={(e) => setEditForm((f) => ({ ...f, cascadeSubscription: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-neutral-900 text-cyan-500 focus:ring-0"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white">Cascade subscription to member teams</span>
                    <p className="mt-0.5 text-neutral-400">
                      Automatically sync this subscription status to all teams registered under this league.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingLeague(null)}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-neutral-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-neutral-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  {actionInProgress ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE ADMINS MODAL */}
      {adminManagingLeague && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-labelledby="manage-admins-title" className="w-full max-w-lg rounded-3xl border border-white/15 bg-neutral-900 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h2 id="manage-admins-title" className="text-xl font-black">Manage Admins</h2>
                <p className="mt-1 text-xs text-neutral-400">{adminManagingLeague.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setAdminManagingLeague(null)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Existing Admins List */}
            <div className="mt-6">
              <label className="block text-xs font-bold uppercase text-neutral-400 mb-2">Current Admins ({adminManagingLeague.adminEmails.length})</label>
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {adminManagingLeague.adminEmails.map((email) => (
                  <div key={email} className="flex items-center justify-between rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Mail className="h-4 w-4 shrink-0 text-cyan-400" />
                      <span className="truncate text-xs font-medium text-neutral-200">{email}</span>
                    </div>
                    <button
                      type="button"
                      disabled={actionInProgress}
                      onClick={() => void handleRemoveAdmin(email)}
                      aria-label={`Remove admin ${email}`}
                      className="ml-2 inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <UserMinus className="h-3 w-3" /> Remove
                    </button>
                  </div>
                ))}
                {!adminManagingLeague.adminEmails.length && (
                  <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-neutral-500">
                    No custom admin emails configured for this league.
                  </p>
                )}
              </div>
            </div>

            {/* Add New Admin Form */}
            <form onSubmit={handleAddAdmin} className="mt-6 border-t border-white/10 pt-4">
              <label className="block text-xs font-bold uppercase text-neutral-400 mb-1.5">Add New Admin</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => {
                    setNewAdminEmail(e.target.value);
                    if (adminActionError) setAdminActionError("");
                  }}
                  placeholder="admin@example.com"
                  className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={actionInProgress || !newAdminEmail.trim()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-neutral-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" /> Add
                </button>
              </div>

              {adminActionError && (
                <p className="mt-2 text-xs text-red-400">{adminActionError}</p>
              )}
            </form>

            <div className="mt-6 flex justify-end border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setAdminManagingLeague(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-neutral-300 hover:bg-white/10"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingLeague && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-league-title" className="w-full max-w-md rounded-3xl border border-red-500/20 bg-neutral-900 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h2 id="delete-league-title" className="text-xl font-black text-white">Delete League</h2>
            </div>

            <p className="mt-4 text-sm text-neutral-300">
              Are you sure you want to permanently delete <strong className="text-white">"{deletingLeague.name}"</strong>?
            </p>

            {teams.filter((t) => t.leagueId === deletingLeague.id).length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
                This league has <strong>{teams.filter((t) => t.leagueId === deletingLeague.id).length} member team(s)</strong>.
                Deleting the league will decouple these teams so they become independent.
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={actionInProgress}
                onClick={() => setDeletingLeague(null)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-neutral-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionInProgress}
                onClick={() => void handleConfirmDelete()}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {actionInProgress ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
