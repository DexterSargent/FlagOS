"use client";
import FlagOSLoader from "@/components/FlagOSLoader";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";

import { use, useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  CalendarDays,
  Users,
  Activity,
  Home,
  Settings,
  Edit3,
  Check,
  X,
  ChevronLeft,
  Shield,
  Flame,
  Zap,
  Trophy,
  Archive,
  Crown,
  Star,
  Sword,
  Target,
  BookOpen,
  Upload,
  Palette,
  Sliders,
  UserPlus,
  UserCheck,
  Trash2,
  AlertCircle,
  Mail,
  ShieldCheck,
  Plus,
  CreditCard,
  Calendar,
} from "lucide-react";
import { openBillingPortal } from "@/lib/billingClient";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { rememberTeamRecord } from "@/lib/teamRecord";
import { getCachedLeagueMatches, getCachedLeaguePlays } from "@/lib/leagueDataCache";
import { isPrimaryTeamAdmin, getTeamAdminEmails, getTeamAdminAccounts, isDexterUser, type TeamAdminAccount } from "@/lib/teamAdminRbac";
import { useAuth } from "@/lib/authContext";
import { TeamLogo, getTeamShortcode, AVAILABLE_ICONS, isRealTeam } from "@/components/TeamAssets";
import { useLeague } from "@/lib/leagueContext";
import { useLeagueArchived, isTeamSeasonArchived } from "@/lib/useLeagueArchived";
import { useDemoSandbox } from "@/lib/useDemoSandbox";
import DemoLoadError from "@/components/DemoLoadError";
import { usePrivateLeagueAccess } from "@/lib/usePrivateLeagueAccess";
import { getCachedTeamRecord, loadTeamRecord } from "@/lib/teamRecord";
import { DEFAULT_TEAM_COLOR_PALETTE, resolveTeamColorPalette, getReadableTextColor } from "@/lib/teamColors";
import { createSecureRecord, requestPrivateData } from "@/lib/secureWrites";
import { loadTeamSeasonData } from "@/lib/teamSeasonData";
import {
  TEAM_STAT_DEFINITIONS,
  DEFAULT_VISIBLE_TEAM_STATS,
  calculateTeamComprehensiveStats,
  type TeamComprehensiveStats,
} from "@/lib/teamStatsCalculator";
import { loadTeamSeasonSummary, TeamSeasonSummaryError } from "@/lib/teamSeasonSummary";
import { getTeamSeasons, getCurrentTeamSeasonId, loadTeamSeasonSnapshots, type TeamSeasonSnapshot } from "@/lib/teamSeasons";
import TeamSeasonModal from "@/components/team/TeamSeasonModal";
import TeamSeasonHistoryPanel from "@/components/team/TeamSeasonHistoryPanel";
import { usePageGuide } from "@/lib/pageGuide";
import { TEAM_HUB_WALKTHROUGH, TEAM_EDIT_WALKTHROUGH, TEAM_STAFF_WALKTHROUGH } from "@/lib/walkthroughData";
import TeamNavBar from "@/components/team/TeamNavBar";
import TeamPortalFooter from "@/components/team/TeamPortalFooter";

const TeamStatsCustomizerModal = dynamic(() => import("@/components/team/TeamStatsCustomizerModal"));

const STAT_CATEGORY_ICONS: Record<string, typeof Trophy> = {
  record: Trophy,
  downs: Target,
  pats: Zap,
  offense: Flame,
  defense: Shield,
  discipline: Activity,
};

const STAT_CATEGORY_COLORS: Record<string, string> = {
  record: "text-amber-400",
  downs: "text-cyan-400",
  pats: "text-yellow-400",
  offense: "text-rose-400",
  defense: "text-emerald-400",
  discipline: "text-indigo-400",
};

const COLOR_PRESETS = [
  { name: "Scarlet & White", primary: "#E31837", secondary: "#FFFFFF", tertiary: "#000000" },
  { name: "Crimson & Gold", primary: "#990000", secondary: "#FFCC00", tertiary: "#111111" },
  { name: "Royal Blue & White", primary: "#003366", secondary: "#FFFFFF", tertiary: "#FFBF00" },
  { name: "Emerald & Gold", primary: "#006633", secondary: "#FFCC00", tertiary: "#111111" },
  { name: "Electric Cyan", primary: "#06B6D4", secondary: "#FFFFFF", tertiary: "#0891B2" },
  { name: "Midnight Stealth", primary: "#27272A", secondary: "#E31837", tertiary: "#FFFFFF" },
];

export default function TeamPortalHome({ params }: { params: Promise<{ id: string }> }) {
  usePageGuide(TEAM_HUB_WALKTHROUGH);
  const unwrappedParams = use(params);
  const teamId = unwrappedParams.id;

  const { settings, isDemoLeague, activeLeagueId } = useLeague();
  const { sandbox, error: demoError, retry: retryDemo } = useDemoSandbox(isDemoLeague);
  const { canManageTeam, isLeagueAdmin, isTeamAdmin, isAdmin, isPlayer, playerTeamId, user, userProfile } = useAuth();
  // Playbooks RBAC:
  // - League admins have NO access to opponent customer teams (confidential franchise strategy)
  // - Authorized team admins can access playbooks for their team only
  // - Rostered players can access playbooks for their team only
  // - League admins who are also listed coaches of this team keep their coach access
  const isTeamAdminForThisTeam = isTeamAdmin(teamId);
  const isListedCoach = userProfile?.managedTeamId === teamId || !!userProfile?.managedTeamIds?.includes(teamId);
  const isRosteredPlayerOnTeam = isPlayer && playerTeamId === teamId;
  const canAccessPlaybook = (isTeamAdminForThisTeam && (!isLeagueAdmin || isListedCoach)) || isRosteredPlayerOnTeam;
  const hasEditAccess = canManageTeam(teamId) || isLeagueAdmin;
  const { isDenied, deniedElement } = usePrivateLeagueAccess();
  const [team, setTeam] = useState<any>(() => getCachedTeamRecord(teamId));
  // Archived leagues are read-only, so hide edit controls the server would reject.
  const isTeamLeagueArchived = useLeagueArchived(team?.leagueId);
  const canEditTeam = hasEditAccess && !isTeamLeagueArchived;
  const teamSeasonArchived = isTeamSeasonArchived(team);
  const [archivingSeason, setArchivingSeason] = useState(false);
  const [openingBilling, setOpeningBilling] = useState(false);
  const [loading, setLoading] = useState<boolean>(() => !getCachedTeamRecord(teamId));
  const [matches, setMatches] = useState<any[]>([]);
  const [plays, setPlays] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState<TeamComprehensiveStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [statsReloadKey, setStatsReloadKey] = useState(0);
  const [visibleStatIds, setVisibleStatIds] = useState<string[]>(DEFAULT_VISIBLE_TEAM_STATS);
  const [isStatsCustomizerOpen, setIsStatsCustomizerOpen] = useState(false);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [seasonSnapshots, setSeasonSnapshots] = useState<TeamSeasonSnapshot[]>([]);

  useEffect(() => {
    if (!team) return;
    let cancelled = false;
    const seasons = getTeamSeasons(team);
    loadTeamSeasonSnapshots(teamId, seasons).then((snaps) => {
      if (!cancelled) setSeasonSnapshots(snaps);
    });
    return () => {
      cancelled = true;
    };
  }, [teamId, team?.seasons]);

  // Edit Team Modal / State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const editQueryHandledRef = useRef(false);
  useEffect(() => {
    if (editQueryHandledRef.current || !canEditTeam || !team) return;
    editQueryHandledRef.current = true;
    if (new URLSearchParams(window.location.search).get("edit") === "1") setIsEditModalOpen(true);
  }, [canEditTeam, team]);
  const [editName, setEditName] = useState("");
  const [editShortcode, setEditShortcode] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editIcon, setEditIcon] = useState("shield");
  const [editPrimaryColor, setEditPrimaryColor] = useState(DEFAULT_TEAM_COLOR_PALETTE.primary);
  const [editSecondaryColor, setEditSecondaryColor] = useState(DEFAULT_TEAM_COLOR_PALETTE.secondary);
  const [editTertiaryColor, setEditTertiaryColor] = useState(DEFAULT_TEAM_COLOR_PALETTE.tertiary);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Coaches & Team Admins Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [staffActionError, setStaffActionError] = useState("");
  const [staffActionSuccess, setStaffActionSuccess] = useState("");
  const [savingStaff, setSavingStaff] = useState(false);
  const [privateSettingsReady, setPrivateSettingsReady] = useState(false);

  usePageGuide(isEditModalOpen ? TEAM_EDIT_WALKTHROUGH : null, 2);
  usePageGuide(isStaffModalOpen ? TEAM_STAFF_WALKTHROUGH : null, 2);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditModalOpen) setIsEditModalOpen(false);
        if (isStaffModalOpen) {
          setIsStaffModalOpen(false);
          setStaffActionError("");
          setStaffActionSuccess("");
        }
      }
    };
    if (isEditModalOpen || isStaffModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isEditModalOpen, isStaffModalOpen]);

  const isDexter = isDexterUser(user?.email);
  const isPrimary = isPrimaryTeamAdmin(user?.email, team, isDexter);
  const currentAdminAccounts = getTeamAdminAccounts(team);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert("Please choose an image file under 3MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEditLogoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCoachAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateSettingsReady) {
      setStaffActionError("Coach settings must finish loading before staff can be changed.");
      return;
    }
    const cleanEmail = newAdminEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setStaffActionError("Please enter a valid email address.");
      return;
    }
    const currentList = getTeamAdminEmails(team);
    if (currentList.includes(cleanEmail)) {
      setStaffActionError("This email is already an authorized team admin.");
      return;
    }

    setSavingStaff(true);
    setStaffActionError("");
    const nextList = [...currentList, cleanEmail];

    try {
      if (isDemoLeague) {
        if (!sandbox) throw new Error("The demo is not loaded.");
        sandbox.updateSandboxTeam(teamId, { adminEmails: nextList });
      } else {
        await createSecureRecord("team_private_update", {
          teamId,
          adminEmails: nextList,
        });
      }

      setTeam((prev: any) => ({ ...prev, adminEmails: nextList }));
      setNewAdminEmail("");
      setStaffActionSuccess(`Added ${cleanEmail} as a team admin!`);
      setTimeout(() => setStaffActionSuccess(""), 4500);
    } catch (err) {
      console.error("Failed to add coach as team admin:", err);
      setStaffActionError("Failed to add team admin. Please try again.");
    } finally {
      setSavingStaff(false);
    }
  };

  const handleRemoveCoachAdmin = async (account: TeamAdminAccount) => {
    if (!privateSettingsReady) {
      setStaffActionError("Coach settings must finish loading before staff can be changed.");
      return;
    }
    if (account.primary || account.required) {
      setStaffActionError("The primary admin cannot be removed here.");
      return;
    }
    const currentList = getTeamAdminEmails(team);
    if (!window.confirm(`Remove ${account.name} and all their listed emails from team administration?`)) {
      return;
    }

    setSavingStaff(true);
    setStaffActionError("");
    const nextList = currentList.filter((email) => !account.emails.includes(email));

    try {
      if (isDemoLeague) {
        if (!sandbox) throw new Error("The demo is not loaded.");
        sandbox.updateSandboxTeam(teamId, { adminEmails: nextList });
      } else {
        await createSecureRecord("team_private_update", {
          teamId,
          adminEmails: nextList,
        });
      }

      setTeam((prev: any) => ({ ...prev, adminEmails: nextList }));
      setStaffActionSuccess(`Removed ${account.name} from team admins.`);
      setTimeout(() => setStaffActionSuccess(""), 4500);
    } catch (err) {
      console.error("Failed to remove team admin:", err);
      setStaffActionError("Failed to remove team admin. Please try again.");
    } finally {
      setSavingStaff(false);
    }
  };

  useEffect(() => {
    setSummaryStats(null);
    setStatsError("");
  }, [teamId, statsReloadKey]);

  useEffect(() => {
    if (isEditModalOpen || isStatsCustomizerOpen || isStaffModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isEditModalOpen, isStatsCustomizerOpen, isStaffModalOpen]);

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedTeamRecord(teamId);
    if (cached) {
      setTeam(cached);
      setLoading(false);
    } else {
      setTeam(null);
      setLoading(true);
    }

    setPrivateSettingsReady(false);
    const fetchTeam = async () => {
      if (isDemoLeague) {
        if (!sandbox) return;
        setPrivateSettingsReady(true);
        const { getSandboxTeams, getSandboxMatches, getSandboxPlays } = sandbox;
        const tData = getSandboxTeams().find((t) => t.id === teamId || (teamId === "team_apex" && t.id === "team_kc"));
        if (tData && isRealTeam(tData)) {
          setTeam(tData);
          setEditName(tData.name || "");
          setEditShortcode(getTeamShortcode(tData));
          setEditLogoUrl("");
          setEditIcon("shield");
          const palette = resolveTeamColorPalette(tData);
          setEditPrimaryColor(palette.primary);
          setEditSecondaryColor(palette.secondary);
          setEditTertiaryColor(palette.tertiary);

          setMatches(getSandboxMatches());
          setPlays(getSandboxPlays());

          let customStats: string[] | null = null;
          if (typeof window !== "undefined") {
            const cachedStats = localStorage.getItem(`flagos_team_stats_display_${teamId}`);
            if (cachedStats) {
              try {
                customStats = JSON.parse(cachedStats);
              } catch { }
            }
          }
          if (!customStats && (tData as any).visibleTeamStats) {
            customStats = (tData as any).visibleTeamStats;
          }
          setVisibleStatIds(customStats && Array.isArray(customStats) ? customStats : DEFAULT_VISIBLE_TEAM_STATS);
        }
        setLoading(false);
        return;
      }
      try {
        const tData = await loadTeamRecord(teamId);
        if (cancelled) return;
        // tData resolved via loadTeamRecord with timeout and caching
        const leagueId = typeof tData?.leagueId === "string" ? tData.leagueId : "";
        if (tData) {
          const teamData: any = tData;
          if (isRealTeam(teamData)) {
            setTeam(teamData);
            setEditName(teamData.name || "");
            setEditShortcode(teamData.shortcode || getTeamShortcode(teamData));
            setEditLogoUrl(teamData.logoUrl || "");
            setEditIcon(teamData.icon || "shield");
            const palette = resolveTeamColorPalette(teamData);
            setEditPrimaryColor(palette.primary);
            setEditSecondaryColor(palette.secondary);
            setEditTertiaryColor(palette.tertiary);

            let customStats: string[] | null = null;
            if (typeof window !== "undefined") {
              const cachedStats = localStorage.getItem(`flagos_team_stats_display_${teamId}`);
              if (cachedStats) {
                try {
                  customStats = JSON.parse(cachedStats);
                } catch { }
              }
            }
            if (!customStats && teamData.visibleTeamStats) {
              customStats = teamData.visibleTeamStats;
            }
            setVisibleStatIds(customStats && Array.isArray(customStats) ? customStats : DEFAULT_VISIBLE_TEAM_STATS);
            setLoading(false);
            if (hasEditAccess) {
              requestPrivateData<{ team: Record<string, unknown> }>("team", { teamId })
                .then((privateData) => {
                  if (!cancelled) {
                    setTeam((current: Record<string, unknown>) => ({ ...current, ...privateData.team }));
                    setPrivateSettingsReady(true);
                  }
                }).catch((error: unknown) => {
                  console.error("Unable to load private team settings:", error);
                  if (!cancelled) setStaffActionError("Coach settings could not be loaded. Refresh before changing staff.");
                });
            }
          }
        }
        setStatsLoading(true);
        try {
          const summary = await loadTeamSeasonSummary(teamId);
          if (!cancelled) setSummaryStats(summary.teamStats);
          return;
        } catch (error) {
          if (!(error instanceof TeamSeasonSummaryError) || error.status !== 404) throw error;
          // Private leagues and private independent teams retain their existing Firestore-authorized reads.
        }
        if (!leagueId) {
          const season = await loadTeamSeasonData(teamId);
          if (cancelled) return;
          setMatches(season.matches);
          setPlays(season.plays);
          return;
        }
        const [rawMatches, rawPlays] = await Promise.all([
          getCachedLeagueMatches(leagueId),
          getCachedLeaguePlays(leagueId),
        ]);
        if (cancelled) return;
        setMatches(rawMatches.filter((m) => !m.isHidden && (!m.leagueId || m.leagueId === leagueId)));
        setPlays(rawPlays);
      } catch (e) {
        console.error("Error fetching team:", e);
        if (!cancelled) setStatsError("Season statistics could not be loaded. Please retry.");
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
          setLoading(false);
        }
      }
    };

    fetchTeam();
    if (isDemoLeague && sandbox) {
      const unsub = sandbox.subscribeDemoSandbox(() => fetchTeam());
      return () => { cancelled = true; unsub(); };
    }
    return () => { cancelled = true; };
  }, [teamId, isDemoLeague, hasEditAccess, sandbox, statsReloadKey]);

  const comprehensiveStats = useMemo(() => summaryStats ?? calculateTeamComprehensiveStats(
    teamId, matches, plays,
    team ? { teamName: team.name, teamAliases: [getTeamShortcode(team)] } : undefined,
  ), [summaryStats, teamId, matches, plays, team]);

  const handleSaveVisibleStats = async (newStatIds: string[]) => {
    const updatePayload = {
      visibleTeamStats: newStatIds,
      updatedAt: new Date().toISOString(),
    };
    try {
      if (isDemoLeague) {
        if (!sandbox) throw new Error("The demo is not loaded.");
        sandbox.updateSandboxTeam(teamId, updatePayload);
      }
      else await updateDoc(doc(db, "teams", teamId), updatePayload);
      setVisibleStatIds(newStatIds);
      localStorage.setItem(`flagos_team_stats_display_${teamId}`, JSON.stringify(newStatIds));
      setTeam((prev: any) => ({ ...prev, ...updatePayload }));
    } catch (e) {
      console.error("Error updating team stats display:", e);
      alert("The stats display could not be saved to the server. Please retry.");
      throw e;
    }
  };

  const handleToggleSeasonArchive = async () => {
    const archive = !teamSeasonArchived;
    const message = archive
      ? "Conclude and archive this season?\n\nThe roster, schedule, and game stats become read-only. You can reopen the season at any time."
      : "Reopen this season?\n\nThe roster, schedule, and games become editable again.";
    if (!window.confirm(message)) return;
    const updatePayload = {
      isArchived: archive,
      seasonStatus: archive ? "archived" : "active",
      archivedAt: archive ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };
    setArchivingSeason(true);
    try {
      await updateDoc(doc(db, "teams", teamId), updatePayload);
      rememberTeamRecord({ id: teamId, ...updatePayload });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("flagos_team_updated", { detail: { id: teamId, ...updatePayload } }));
      }
      setTeam((prev: any) => ({ ...prev, ...updatePayload }));
    } catch (e) {
      console.error("Error updating season archive state:", e);
      alert("The season status could not be saved. Please retry.");
    } finally {
      setArchivingSeason(false);
    }
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    if (![editPrimaryColor, editSecondaryColor, editTertiaryColor].every((color) => /^#[0-9A-Fa-f]{6}$/.test(color))) {
      alert("Enter a valid six-digit hex color for each team color.");
      return;
    }

    setSaving(true);
    try {
      const updatedData = {
        name: editName.trim(),
        shortcode: editShortcode.trim().toUpperCase(),
        logoUrl: editLogoUrl.trim(),
        icon: editIcon,
        color: editPrimaryColor,
        primaryColor: editPrimaryColor,
        secondaryColor: editSecondaryColor,
        tertiaryColor: editTertiaryColor,
        updatedAt: new Date().toISOString(),
      };

      if (isDemoLeague) {
        if (!sandbox) throw new Error("The demo is not loaded.");
        sandbox.updateSandboxTeam(teamId, updatedData);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("flagos_team_updated", { detail: updatedData }));
        }
        setTeam((prev: any) => ({ ...prev, ...updatedData }));
        setIsEditModalOpen(false);
        setSaving(false);
        return;
      }

      await updateDoc(doc(db, "teams", teamId), updatedData);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("flagos_team_updated", { detail: updatedData }));
      }
      setTeam((prev: any) => ({ ...prev, ...updatedData }));
      setIsEditModalOpen(false);
    } catch (e) {
      console.error("Error updating team:", e);
      alert("Failed to update team details.");
    }
    setSaving(false);
  };

  if (isDenied) {
    return deniedElement;
  }

  if (demoError) return <DemoLoadError retry={retryDemo} />;
  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-center items-center font-sans">
        <FlagOSLoader />
      </div>
    );
  }

  if (!team || !isRealTeam(team)) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-center items-center font-sans p-6 text-center">
        <h2 className="text-3xl font-black mb-4">Team Not Found</h2>
        <p className="text-neutral-400 mb-6 max-w-md">
          This team could not be found. It may have been removed.
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-neutral-200 hover:bg-white text-black font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)]"
        >
          Return Home
        </Link>
      </div>
    );
  }

  const shortcode = team.shortcode || getTeamShortcode(team);
  const palette = resolveTeamColorPalette(team);
  const isExplicitIndependent = Boolean(team?.isIndependent) || Boolean(team?.isStandalone);
  const isDemoTeamInSandbox = isDemoLeague || teamId.startsWith("team_") || Boolean(sandbox?.getSandboxTeams().some((t) => t.id === teamId));
  const targetLeagueId: string | null = !isExplicitIndependent
    ? (team?.leagueId || (isDemoTeamInSandbox ? (activeLeagueId || "default") : (activeLeagueId && activeLeagueId !== "default" ? activeLeagueId : null)))
    : null;

  const isIndependentTeam = isExplicitIndependent || !targetLeagueId;
  const isStandaloneOrPaidTeam = isIndependentTeam || Boolean(team.subscription && team.subscription.status === "active");

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30 selection:text-[var(--team-ink)] relative font-sans flex flex-col">
      <TeamNavBar teamId={teamId} />

      {/* Dynamic Background with ambient glows styled to team colors */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-15">
        <div
          className="absolute -top-40 -left-40 w-[35rem] h-[35rem] rounded-full mix-blend-screen filter blur-[140px] opacity-25 animate-pulse"
          style={{ backgroundColor: palette.primary }}
        />
        <div
          className="absolute top-40 -right-40 w-[35rem] h-[35rem] rounded-full mix-blend-screen filter blur-[140px] opacity-20 animate-pulse delay-1000"
          style={{ backgroundColor: palette.secondary !== "#FFFFFF" ? palette.secondary : palette.primary }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center flex-1 p-4 sm:p-6 lg:p-10">
        {/* Navigation Buttons */}
        <div className="self-start flex flex-wrap items-center gap-2 mb-4">
          {!isIndependentTeam && targetLeagueId && (
            <Link
              href={`/league/${targetLeagueId}`}
              className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-full border border-white/10 backdrop-blur-md text-sm font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              League Home
            </Link>
          )}
          <Link
            href="/"
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors bg-white/5 px-3.5 py-2.5 rounded-full border border-white/10 backdrop-blur-md text-sm font-semibold"
            title="Home"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>

        {/* Hero Section */}
        <div data-tour="team-header-identity" className="w-full text-center space-y-3 sm:space-y-5 max-w-4xl mb-6 sm:mb-8">
          {/* Dedicated Team Logo Slot / Avatar Container */}
          <div className="flex flex-col items-center justify-center pt-2">
            {team.logoUrl ? (
              <div className="relative group/logo">
                <div
                  className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-3xl p-3 flex items-center justify-center backdrop-blur-xl shadow-2xl transition-all duration-300 group-hover/logo:scale-105 bg-white dark:bg-[#0a0a0a]/80"
                  style={{
                    border: `2px solid ${palette.primary}60`,
                    boxShadow: `0 0 35px ${palette.primary}40`,
                  }}
                >
                  <img
                    src={team.logoUrl}
                    alt={`${team.name} Logo`}
                    className="w-full h-full object-contain filter drop-shadow-md"
                  />
                </div>
                {canEditTeam && (
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white dark:bg-black/90 border border-slate-200 dark:border-white/20 text-slate-800 dark:text-white hover:text-[var(--team-ink)] dark:hover:text-[var(--team-ink)] opacity-90 group-hover/logo:opacity-100 transition-all shadow-lg flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title="Change Logo"
                  >
                    <Edit3 className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                    <span>Change Logo</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => canEditTeam && setIsEditModalOpen(true)}
                disabled={!canEditTeam}
                aria-label={canEditTeam ? `Add ${team.name} logo` : `${team.name} logo`}
                className={`group/placeholder relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-3xl p-2 sm:p-3 flex flex-col items-center justify-center text-center transition-all duration-300 backdrop-blur-xl bg-slate-100 dark:bg-transparent ${canEditTeam ? "hover:scale-105 cursor-pointer" : "cursor-default"}`}
                style={{
                  backgroundColor: `${palette.primary}15`,
                  border: `2px ${canEditTeam ? "dashed" : "solid"} ${palette.primary}80`,
                  boxShadow: `0 0 30px ${palette.primary}20`,
                }}
                title={canEditTeam ? "Click to add team logo" : undefined}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1 text-slate-900 dark:text-white group-hover/placeholder:scale-110 transition-transform">
                  <TeamLogo
                    teamName={team.name}
                    logoUrl=""
                    icon={isDemoLeague ? "football" : team.icon || "shield"}
                    className="w-8 h-8"
                    iconColor={isDemoLeague ? palette.primary : undefined}
                    customColor={palette.primary === "#E31837" ? "text-red-400" : undefined}
                  />
                </div>
                {canEditTeam && (
                  <>
                    <div className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                      <Upload className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                      <span>Add Logo</span>
                    </div>
                    <span className="hidden sm:inline text-[10px] text-slate-700 dark:text-neutral-300 font-mono">Upload logo</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div
            className="inline-flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2 rounded-full backdrop-blur-md mb-2 shadow-2xl border max-w-full"
            style={{
              backgroundColor: palette.secondary,
              borderColor: `${palette.primary}40`,
            }}
          >
            <TeamLogo
              teamName={team.name}
              logoUrl={team.logoUrl}
              icon={isDemoLeague ? "football" : team.icon || "shield"}
              className="w-5 h-5"
              iconColor={palette.primary}
              primaryColor={palette.primary}
            />
            <span
              className="min-w-0 text-[10px] sm:text-sm font-black tracking-wider sm:tracking-widest uppercase break-words"
              style={{ color: getReadableTextColor(palette.secondary, palette.primary) }}
            >
              {shortcode} • {team.tagline ? team.tagline : isStandaloneOrPaidTeam ? "Independent Team Portal" : `${settings.leagueName} Member Club`}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-sm uppercase break-words">
            {team.name}
          </h1>

          <p className="text-sm sm:text-lg md:text-xl text-neutral-400 font-light max-w-2xl mx-auto leading-relaxed">
            {team.bio || `Follow ${team.name}: players, games, and season stats.`}
          </p>

          {/* Coaching Staff Banner */}
          {team.coachName && (
            <div className="inline-flex flex-wrap justify-center items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-300 font-medium">
              <span className="text-white font-bold">Coaching Staff:</span>
              <span>{team.coachName} ({team.coachRole || "Head Coach"})</span>
              {team.defensiveCoordinator && team.defensiveCoordinator !== team.coachName && (
                <>
                  <span className="text-neutral-500">•</span>
                  <span>{team.defensiveCoordinator} ({team.defensiveCoordinatorRole || "Defensive Coordinator"})</span>
                </>
              )}
              {team.assistantCoach && (
                <>
                  <span className="text-neutral-500">•</span>
                  <span>{team.assistantCoach} ({team.assistantCoachRole || "Offensive Coordinator"})</span>
                </>
              )}
              {team.offensiveCoordinator && team.offensiveCoordinator !== team.assistantCoach && (
                <>
                  <span className="text-neutral-500">•</span>
                  <span>{team.offensiveCoordinator} ({team.offensiveCoordinatorRole || "Offensive Coordinator"})</span>
                </>
              )}
            </div>
          )}

          {/* Team Colors Bar & Edit Button */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center justify-center gap-2 sm:gap-3 pt-2 [&>button]:min-h-11 [&>button]:justify-center [&>a]:min-h-11 [&>a]:justify-center max-sm:[&>button]:px-2 max-sm:[&>a]:px-2 max-sm:[&>button]:text-[10px] max-sm:[&>a]:text-[10px]">
            <div className="col-span-2 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-300 backdrop-blur-md">
              <span className="text-white font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[var(--team-ink)]" />
                <span>Colours:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-4 h-4 rounded-full border border-white/30 shadow-sm"
                  style={{ backgroundColor: palette.primary }}
                  title={`Primary: ${palette.primary}`}
                />
                <span
                  className="w-4 h-4 rounded-full border border-white/30 shadow-sm"
                  style={{ backgroundColor: palette.secondary }}
                  title={`Secondary: ${palette.secondary}`}
                />
                <span
                  className="w-4 h-4 rounded-full border border-white/30 shadow-sm"
                  style={{ backgroundColor: palette.tertiary }}
                  title={`Tertiary: ${palette.tertiary}`}
                />
              </div>
            </div>

            {canEditTeam && (
              <>
                {!teamSeasonArchived && (
                  <Link
                    data-tour="team-schedule-game-btn"
                    href={`/teams/${teamId}/schedule?create=1`}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider transition-all border border-emerald-500/30 hover:border-emerald-500/50 backdrop-blur-md shadow-lg cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>Schedule Game</span>
                  </Link>
                )}
                <button
                  type="button"
                  data-tour="team-staff-btn"
                  disabled={!privateSettingsReady}
                  onClick={() => setIsStaffModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-all border border-white/15 hover:border-white/30 backdrop-blur-md shadow-lg cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>Coaches &amp; Admins ({currentAdminAccounts.length})</span>
                </button>
                <button
                  type="button"
                  data-tour="edit-team-btn"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-all border border-white/15 hover:border-white/30 backdrop-blur-md shadow-lg cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <span>Edit Team Info</span>
                </button>
                {isIndependentTeam && !isDemoLeague && (
                  <button
                    type="button"
                    data-tour="team-archive"
                    onClick={() => setIsSeasonModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-all border border-white/15 hover:border-white/30 backdrop-blur-md shadow-lg cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-cyan-300" />
                    <span>Season Management</span>
                  </button>
                )}
                {isIndependentTeam && !isDemoLeague && team.subscription?.paymentMethod === "paid" && (
                  <button
                    type="button"
                    data-tour="team-manage-billing"
                    disabled={openingBilling}
                    onClick={async () => {
                      setOpeningBilling(true);
                      try {
                        await openBillingPortal("team", teamId);
                      } catch (e) {
                        alert(e instanceof Error ? e.message : "Could not open billing.");
                        setOpeningBilling(false);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-all border border-white/15 hover:border-white/30 backdrop-blur-md shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4 text-sky-300" />
                    <span>{openingBilling ? "Opening..." : "Manage Billing"}</span>
                  </button>
                )}
              </>
            )}
          </div>
          {teamSeasonArchived && (
            <div role="status" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
              <Archive className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                This season is archived{team.archivedAt ? ` (${new Date(team.archivedAt).toLocaleDateString()})` : ""}. Roster, schedule, and game stats are read-only.
              </span>
            </div>
          )}
        </div>

        {/* Team Season Stats Banner (Customizable by Team Admin) */}
        {statsError && <div role="alert" className="w-full max-w-6xl mb-4 text-red-300">
          {statsError} <button data-tour="team-stats-retry" type="button" className="underline" onClick={() => setStatsReloadKey((key) => key + 1)}>Retry</button>
        </div>}
        {statsLoading && <div role="status" className="w-full max-w-6xl mb-8 rounded-3xl bg-white/5 p-6 animate-pulse">Loading season statistics...</div>}
        {!statsLoading && !statsError && (() => {
          const stats = comprehensiveStats;

          return (
            <div data-tour="team-record-badge" className="w-full max-w-6xl mb-8">
              <div className="bg-neutral-950/70 border border-white/10 rounded-3xl p-5 md:p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div
                  className="absolute -right-20 -top-20 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none"
                  style={{ backgroundColor: palette.primary }}
                />

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-white/5 relative z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm"
                      style={{ backgroundColor: palette.secondary, borderColor: `${palette.primary}40` }}
                    >
                      <Trophy className="w-5 h-5" style={{ color: getReadableTextColor(palette.secondary, palette.primary) }} />
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-black uppercase tracking-tight text-white">
                        Season Stats
                      </h3>
                      <p className="text-xs text-neutral-400">
                        Season totals from recorded game stats.
                      </p>
                    </div>
                  </div>

                  {canEditTeam && (
                    <button
                      type="button"
                      onClick={() => setIsStatsCustomizerOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-semibold transition-all border border-white/10 hover:border-white/20 cursor-pointer shrink-0"
                      title="Customize Stats"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[var(--team-ink)]" />
                      <span>Customize Stats</span>
                    </button>
                  )}
                </div>

                {/* Stat Cards Grid */}
                {visibleStatIds.length === 0 ? (
                  <div className="py-8 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                    <p className="text-sm text-neutral-400 mb-2">No season stats currently available.</p>
                    {canEditTeam && (
                      <button
                        type="button"
                        onClick={() => setIsStatsCustomizerOpen(true)}
                        className="text-xs text-[var(--team-ink)] hover:underline font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Choose stats to show
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 relative z-10">
                    {visibleStatIds.map((statId) => {
                      const def = TEAM_STAT_DEFINITIONS.find((d) => d.id === statId);
                      if (!def) return null;
                      const value = def.getValue(stats);
                      const CategoryIcon = STAT_CATEGORY_ICONS[def.category] || Activity;
                      const categoryColor = STAT_CATEGORY_COLORS[def.category] || "text-neutral-400";

                      return (
                        <div
                          key={def.id}
                          title={def.description}
                          className="group/card relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/80 p-3.5 sm:p-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-neutral-900 hover:shadow-xl hover:-translate-y-0.5"
                        >
                          {/* Top accent line matching team palette */}
                          <div
                            className="absolute inset-x-0 top-0 h-0.5 transition-opacity opacity-70 group-hover/card:opacity-100"
                            style={{ backgroundColor: palette.primary }}
                            aria-hidden="true"
                          />

                          {/* Subtle ambient hover glow */}
                          <div
                            className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"
                            style={{ background: `linear-gradient(180deg, ${palette.primary}12, transparent 65%)` }}
                          />

                          {/* Header row: Metric acronym + category icon */}
                          <div className="flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-white/5 relative z-10">
                            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-neutral-400 truncate">
                              {def.shortLabel}
                            </span>
                            <CategoryIcon className={`w-3.5 h-3.5 ${categoryColor} shrink-0 opacity-80 group-hover/card:opacity-100 transition-opacity`} />
                          </div>

                          {/* Stat value */}
                          <div className="my-1.5 relative z-10">
                            <div className="font-mono text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-white group-hover/card:text-white transition-colors">
                              {value}
                            </div>
                          </div>

                          {/* Metric description label */}
                          <div className="text-[11px] font-medium leading-snug text-neutral-400 group-hover/card:text-neutral-300 transition-colors relative z-10 pt-1">
                            {def.id === "record" && stats.playoffRecordFormatted
                              ? `Reg. ${stats.regularRecordFormatted} · Playoffs ${stats.playoffRecordFormatted}`
                              : def.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Bento Grid (Schedule, Roster, Stat Leaders, Playbook) */}
        <div data-tour="team-quick-links" className={`grid grid-cols-1 sm:grid-cols-2 ${canAccessPlaybook ? "lg:grid-cols-4 max-w-6xl" : "lg:grid-cols-3 max-w-5xl"} gap-5 w-full`}>
          {/* Bento 1: Schedule */}
          <Link
            href={`/teams/${teamId}/schedule`}
            className="group relative flex flex-col p-6 rounded-3xl bg-neutral-950/60 border border-white/5 backdrop-blur-md hover:bg-neutral-900 transition-all duration-300 overflow-hidden shadow-xl hover:-translate-y-1"
            style={{
              borderColor: undefined,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${palette.primary}80`)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: `linear-gradient(135deg, ${palette.primary}20, transparent)`,
              }}
            />
            <CalendarDays
              className="w-8 h-8 text-white mb-4 transition-colors"
              style={{ color: undefined }}
              onMouseEnter={(e) => (e.currentTarget.style.color = palette.primary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = "")}
            />
            <h3 className="text-xl font-black mb-1.5 uppercase tracking-wide">Schedule</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Upcoming games, box scores, and live game tracking.
            </p>
          </Link>

          {/* Bento 2: Team Roster */}
          <Link
            href={`/teams/${teamId}/roster`}
            className="group relative flex flex-col p-6 rounded-3xl bg-neutral-950/60 border border-white/5 backdrop-blur-md hover:bg-neutral-900 transition-all duration-300 overflow-hidden shadow-xl hover:-translate-y-1"
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${palette.primary}80`)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: `linear-gradient(135deg, ${palette.primary}20, transparent)`,
              }}
            />
            <Users
              className="w-8 h-8 text-white mb-4 transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.color = palette.primary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = "")}
            />
            <h3 className="text-xl font-black mb-1.5 uppercase tracking-wide">Roster</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Players and depth charts.
            </p>
          </Link>

          {/* Bento 3: Stat Leaders */}
          <Link
            href={`/teams/${teamId}/stats`}
            className="group relative flex flex-col p-6 rounded-3xl bg-neutral-950/60 border border-white/5 backdrop-blur-md hover:bg-neutral-900 transition-all duration-300 overflow-hidden shadow-xl hover:-translate-y-1"
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${palette.primary}80`)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: `linear-gradient(135deg, ${palette.primary}20, transparent)`,
              }}
            />
            <Activity
              className="w-8 h-8 text-white mb-4 transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.color = palette.primary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = "")}
            />
            <h3 className="text-xl font-black mb-1.5 uppercase tracking-wide">Stat Leaders</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Top performers in each statistical category.
            </p>
          </Link>

          {/* Bento 4: Interactive Playbook (Restricted to Team Admins and Players of this franchise) */}
          {canAccessPlaybook && (
            <Link
              href={`/teams/${teamId}/playbook`}
              className="group relative flex flex-col p-6 rounded-3xl bg-neutral-950/60 border border-white/5 backdrop-blur-md hover:bg-neutral-900 transition-all duration-300 overflow-hidden shadow-xl hover:-translate-y-1"
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${palette.primary}80`)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: `linear-gradient(135deg, ${palette.primary}20, transparent)`,
                }}
              />
              <BookOpen
                className="w-8 h-8 text-white mb-4 group-hover:scale-110 transition-transform"
                onMouseEnter={(e) => (e.currentTarget.style.color = palette.primary)}
                onMouseLeave={(e) => (e.currentTarget.style.color = "")}
              />
              <h3 className="text-xl font-black mb-1.5 uppercase tracking-wide">Playbooks</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Design and study offensive and defensive playbooks.
              </p>
            </Link>
          )}
        </div>

        {/* Team Franchise History Panel */}
        <div data-tour="team-history-panel" className="w-full max-w-6xl mt-8">
          <TeamSeasonHistoryPanel
            teamName={team.name || "Team"}
            teamId={teamId}
            seasons={getTeamSeasons(team)}
            snapshots={seasonSnapshots}
            currentSeasonId={getCurrentTeamSeasonId(team)}
            liveRecord={comprehensiveStats ? {
              won: comprehensiveStats.wins,
              lost: comprehensiveStats.losses,
              tied: comprehensiveStats.ties,
              pf: comprehensiveStats.pf,
              pa: comprehensiveStats.pa,
            } : undefined}
          />
        </div>
      </div>

      {/* Team Season Management Modal */}
      {isSeasonModalOpen && (
        <TeamSeasonModal
          isOpen={isSeasonModalOpen}
          onClose={() => setIsSeasonModalOpen(false)}
          teamId={teamId}
          teamName={team.name || "Team"}
          teamSeasonArchived={teamSeasonArchived}
          seasons={getTeamSeasons(team)}
          currentSeasonId={getCurrentTeamSeasonId(team)}
          archivingSeason={archivingSeason}
          onArchiveToggled={handleToggleSeasonArchive}
          onSeasonStarted={(newSeasonId, title) => {
            const currentSeasons = getTeamSeasons(team);
            const nextNumber = Math.max(...currentSeasons.map((s) => s.number)) + 1;
            setTeam((prev: any) => ({
              ...prev,
              currentSeasonId: newSeasonId,
              seasonTitle: title,
              seasonStatus: "active",
              isArchived: false,
              seasons: [
                ...currentSeasons.map((s) => ({ ...s, status: "archived" })),
                { id: newSeasonId, title, status: "active", number: nextNumber },
              ],
            }));
            setStatsReloadKey((k) => k + 1);
          }}
        />
      )}

      {/* Edit Team Modal (Accessible to Team Admin & League Admin) */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditModalOpen(false);
          }}
        >
          <div data-tour="team-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="team-edit-modal-title" className="bg-[#0B0F19] border border-cyan-500/30 rounded-3xl max-w-xl w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Pinned Header with permanently accessible Close button */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-[#0B0F19] shrink-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-500/10 rounded-2xl text-[var(--team-ink)] border border-cyan-500/20">
                  <Edit3 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <PageGuideButton />
                  <h2 id="team-edit-modal-title" className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">Edit Team Details</h2>
                  <p className="text-xs text-neutral-400">Team identity, logo emblem, and primary / secondary colours.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="Close"
                className="text-neutral-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form data-tour="team-edit-names" onSubmit={handleSaveTeam} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
                <div>
                  <label htmlFor="team-edit-name" className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                    Team Name
                  </label>
                  <input
                    id="team-edit-name"
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-400 transition-colors"
                    placeholder="e.g. Apex Titans"
                  />
                </div>

                <div>
                  <label htmlFor="team-edit-shortcode" className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                    Shortcode (Abbreviation)
                  </label>
                  <input
                    id="team-edit-shortcode"
                    type="text"
                    maxLength={5}
                    value={editShortcode}
                    onChange={(e) => setEditShortcode(e.target.value.toUpperCase())}
                    className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm uppercase font-mono outline-none focus:border-cyan-400 transition-colors"
                    placeholder="e.g. FLG"
                  />
                  <span className="text-[11px] text-neutral-500 mt-1 block">
                    Used in stat tables, scoreboards, and badges (2-4 characters recommended).
                  </span>
                </div>

                <fieldset data-tour="team-edit-colours" className="space-y-3 rounded-2xl border border-white/10 bg-neutral-950/60 p-4">
                  <legend className="px-2 text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[var(--team-ink)]" />
                    <span>Team Colours</span>
                  </legend>
                  <p className="text-[11px] text-neutral-400">
                    Primary colors the scoreboard, hero glow, and possession marker; secondary colors timeout indicators; tertiary colors wizard highlights.
                  </p>

                  {/* Quick Color Presets */}
                  <div className="pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1.5">
                      Quick Colour Presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setEditPrimaryColor(preset.primary);
                            setEditSecondaryColor(preset.secondary);
                            setEditTertiaryColor(preset.tertiary);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-white/10 hover:border-white/30 text-[10px] font-semibold text-neutral-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title={preset.name}
                        >
                          <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: preset.primary }} />
                          <span>{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    {[
                      { label: "Primary Colour", value: editPrimaryColor, onChange: setEditPrimaryColor },
                      { label: "Secondary Colour", value: editSecondaryColor, onChange: setEditSecondaryColor },
                      { label: "Tertiary Colour", value: editTertiaryColor, onChange: setEditTertiaryColor },
                    ].map((color) => (
                      <label key={color.label} className="flex items-center justify-between gap-3 text-xs font-bold text-neutral-300">
                        <span>{color.label}</span>
                        <span className="flex items-center gap-2">
                          <input
                            type="color"
                            value={color.value}
                            onChange={(event) => color.onChange(event.target.value)}
                            aria-label={`${color.label} team color`}
                            className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
                          />
                          <input
                            type="text"
                            value={color.value}
                            onChange={(event) => color.onChange(event.target.value)}
                            pattern="#[0-9A-Fa-f]{6}"
                            aria-label={`${color.label} team color hex`}
                            className="w-24 rounded-lg border border-white/10 bg-black px-2 py-1.5 font-mono text-xs uppercase text-white"
                          />
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div data-tour="team-edit-logo" className="space-y-3 rounded-2xl border border-white/10 bg-neutral-950/60 p-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Team Logo & Emblem</span>
                    </label>
                    {editLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setEditLogoUrl("")}
                        className="text-[11px] text-red-400 hover:text-red-300 font-bold underline"
                      >
                        Remove Custom Logo
                      </button>
                    )}
                  </div>

                  {/* Live Logo Preview Box */}
                  <div className="p-3.5 bg-neutral-900/90 rounded-2xl border border-white/10 flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-2xl p-2 flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        borderColor: `${editPrimaryColor}60`,
                      }}
                    >
                      <TeamLogo
                        teamName={editName || "Team"}
                        logoUrl={editLogoUrl}
                        icon={editIcon}
                        className="w-full h-full object-contain"
                        customColor={editPrimaryColor === "#E31837" ? "text-red-400" : undefined}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{editName || "Team Name"}</div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {editLogoUrl ? "Custom image logo active" : `Using vector icon (${editIcon})`}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          aria-label="Upload team logo"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-amber-400" />
                          <span>Upload Logo from Device</span>
                        </button>
                        {editLogoUrl && (
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">✓ Ready</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="team-edit-logo-url" className="block text-[11px] text-neutral-400 mb-1">Or Paste Image URL (Optional)</label>
                    <input
                      id="team-edit-logo-url"
                      type="text"
                      value={editLogoUrl}
                      onChange={(e) => setEditLogoUrl(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-cyan-400 transition-colors font-mono"
                      placeholder="https://example.com/logo.png or /your-logo.png"
                    />
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <label className="block text-[11px] text-neutral-400 mb-1.5">Or Choose Vector Icon (when no image uploaded)</label>
                    <div className="grid grid-cols-6 gap-2">
                      {AVAILABLE_ICONS.map((item) => {
                        const IconComp = item.icon;
                        const isSelected = editIcon === item.id && !editLogoUrl;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setEditIcon(item.id);
                              setEditLogoUrl("");
                            }}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${isSelected
                              ? "bg-cyan-500/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                              : "bg-neutral-900 border-white/5 text-neutral-400 hover:text-white hover:bg-white/5"
                              }`}
                            title={item.label}
                            aria-label={`Use ${item.label} icon`}
                            aria-pressed={isSelected}
                          >
                            <IconComp className="w-5 h-5" />
                          </button>
                        );
                      })}
                    </div>
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-[var(--team-ink)]" />
                          <span>Custom Stats Display</span>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          {visibleStatIds.length} stats currently selected to display on team portal.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditModalOpen(false);
                          setIsStatsCustomizerOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-colors border border-white/10 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sliders className="w-3 h-3 text-[var(--team-ink)]" />
                        <span>Customize Stats</span>
                      </button>
                    </div>
                  </div>

                </div>

              </div>

              {/* Pinned Footer with Cancel and Save Changes Buttons */}
              <div data-tour="team-edit-save" className="p-4 sm:p-5 border-t border-white/10 bg-[#0B0F19] flex items-center justify-end gap-3 shrink-0 z-10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500  text-xs font-bold transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  style={{ backgroundColor: palette.primary, color: getReadableTextColor(palette.primary, "#FFFFFF") }}
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Coaches & Admins Management Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-labelledby="team-staff-modal-title" className="w-full max-w-xl rounded-3xl border border-white/15 bg-neutral-900 p-6 sm:p-8 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <PageGuideButton />
                  <h2 id="team-staff-modal-title" className="text-xl font-black">Coaches &amp; Team Admins</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">{team?.name || "Team"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsStaffModalOpen(false);
                  setStaffActionError("");
                  setStaffActionSuccess("");
                }}
                aria-label="Close team staff"
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Explanation card */}
            <div data-tour="team-staff-permissions" className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs text-neutral-300 space-y-1">
              <div className="font-bold text-[var(--team-ink)] uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Team Administrative Permissions</span>
              </div>
              <p>
                Authorized team admins can invite additional coaches. <strong>Only the primary team admin (the first coach)</strong> has permission to delete players, games, and playbooks.
              </p>
              <p>Each person is listed once, with their sign-in addresses below. Coaches who sign in with more than one email can connect them from their account after verifying both sign-ins.</p>
              <Link href="/account" className="inline-block font-bold text-[var(--team-ink)] hover:text-[var(--team-ink)]">Manage my connected emails</Link>
            </div>

            {staffActionSuccess && (
              <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
                <Check className="h-4 w-4 shrink-0 text-emerald-400" /> {staffActionSuccess}
              </div>
            )}

            {staffActionError && (
              <div role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" /> {staffActionError}
              </div>
            )}

            {/* Current Admins List */}
            <div data-tour="team-staff-list" className="mt-5">
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Current Team Admins ({currentAdminAccounts.length})
              </div>
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {currentAdminAccounts.map((account) => {
                  const isFirst = account.primary;
                  return (
                    <div
                      key={account.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-neutral-950/70 p-3.5 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <span className="text-sm text-white font-semibold">{account.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-400">{account.role}</p>
                        <ul className="mt-2 space-y-1">
                          {account.emails.map((email) => <li key={email} className="break-all font-mono text-xs text-neutral-300">{email}</li>)}
                        </ul>
                        <div className="mt-1 flex items-center gap-2">
                          {isFirst ? (
                            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                              Primary Admin (Head Coach)
                            </span>
                          ) : (
                            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--team-ink)]">
                              Team Admin / Coach
                            </span>
                          )}
                          <span className="text-[10px] text-neutral-500">
                            {isFirst ? "Full deletion rights" : "Standard management"}
                          </span>
                        </div>
                      </div>

                      {!isFirst && !account.required && isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCoachAdmin(account)}
                          disabled={savingStaff}
                          className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-xs font-bold transition-colors disabled:opacity-50 shrink-0"
                          title="Remove team admin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add Team Admin Form */}
            <form data-tour="team-staff-invite" onSubmit={handleAddCoachAdmin} className="mt-6 pt-5 border-t border-white/10">
              <label htmlFor="new-coach-email-input" className="block text-xs font-bold uppercase text-neutral-300 mb-1.5">
                Add Coach as Team Admin
              </label>
              <p className="text-[11px] text-neutral-400 mb-3">
                Enter the email address of an assistant coach, coordinator, or team manager.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="new-coach-email-input"
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="coach@example.com"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-cyan-400 focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  disabled={savingStaff || !newAdminEmail.trim()}
                  className="min-h-10 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{savingStaff ? "Adding..." : "Add Admin"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Stats Customizer Modal (Accessible to Team Admins & Staff) */}
      {isStatsCustomizerOpen && <TeamStatsCustomizerModal
        isOpen={isStatsCustomizerOpen}
        onClose={() => setIsStatsCustomizerOpen(false)}
        onSave={handleSaveVisibleStats}
        initialVisibleStats={visibleStatIds}
        teamStats={comprehensiveStats}
        teamName={team?.name || "Team"}
        primaryColor={palette.primary}
        secondaryColor={palette.secondary}
      />}

      {/* Standalone / Paid Team Portal Footer with subtle Powered by FlagOS Disclaimer */}
      <TeamPortalFooter section={team.tagline ? team.tagline : isStandaloneOrPaidTeam ? "Independent Team Portal" : "Team Portal"} />

    </div>
  );
}
