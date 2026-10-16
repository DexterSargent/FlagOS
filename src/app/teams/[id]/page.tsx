"use client";

import { use, useEffect, useState, useRef } from "react";
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
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { isPrimaryTeamAdmin, getTeamAdminEmails, isDexterUser } from "@/lib/teamAdminRbac";
import { useAuth } from "@/lib/authContext";
import { TeamLogo, getTeamShortcode, AVAILABLE_ICONS, isRealTeam } from "@/components/TeamAssets";
import { useLeague } from "@/lib/leagueContext";
import { FlagOSText } from "@/components/FlagOSText";
import {
  getSandboxTeams,
  updateSandboxTeam,
  subscribeDemoSandbox,
  getSandboxMatches,
  getSandboxPlays,
} from "@/lib/demoSandbox";
import { usePrivateLeagueAccess } from "@/lib/usePrivateLeagueAccess";
import { DEFAULT_TEAM_COLOR_PALETTE, resolveTeamColorPalette } from "@/lib/teamColors";
import {
  isYorkTeam,
  getYorkTeamData,
  YORK_TEAM_ID,
  YORK_LIONS_TEAM,
  getYorkTeamMatches,
  getYorkTeamPlays,
} from "@/lib/yorkTeamData";
import {
  TEAM_STAT_DEFINITIONS,
  DEFAULT_VISIBLE_TEAM_STATS,
  calculateTeamComprehensiveStats,
} from "@/lib/teamStatsCalculator";
import TeamStatsCustomizerModal from "@/components/team/TeamStatsCustomizerModal";

const COLOR_PRESETS = [
  { name: "York Lions (Varsity)", primary: "#E31837", secondary: "#FFFFFF", tertiary: "#000000" },
  { name: "Crimson & Gold", primary: "#990000", secondary: "#FFCC00", tertiary: "#111111" },
  { name: "Royal Blue & White", primary: "#003366", secondary: "#FFFFFF", tertiary: "#FFBF00" },
  { name: "Emerald & Gold", primary: "#006633", secondary: "#FFCC00", tertiary: "#111111" },
  { name: "Electric Cyan", primary: "#06B6D4", secondary: "#FFFFFF", tertiary: "#0891B2" },
  { name: "Midnight Stealth", primary: "#27272A", secondary: "#E31837", tertiary: "#FFFFFF" },
];

export default function TeamPortalHome({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const teamId = unwrappedParams.id;
  const isYork = isYorkTeam(teamId);

  const { settings, isDemoLeague } = useLeague();
  const { canManageTeam, isLeagueAdmin, isTeamAdmin, isAdmin, isPlayer, playerTeamId, user } = useAuth();
  // Playbooks RBAC:
  // - League admins have NO access to opponent customer teams (confidential franchise strategy)
  // - Authorized team admins can access playbooks for their team only
  // - Rostered players can access playbooks for their team only
  // - York Lions Varsity Portal: Fully unlocked for Dexter, team coaches, and rostered players
  const isTeamAdminForThisTeam = isTeamAdmin(teamId);
  const isRosteredPlayerOnTeam = isPlayer && (playerTeamId === teamId || (isYork && isYorkTeam(playerTeamId)));
  const canAccessPlaybook = isYork || (!isLeagueAdmin && (isTeamAdminForThisTeam || isRosteredPlayerOnTeam));
  const hasEditAccess = canManageTeam(teamId) || isYork || isDemoLeague || isLeagueAdmin;
  const { isDenied, deniedElement } = usePrivateLeagueAccess();
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [plays, setPlays] = useState<any[]>([]);
  const [visibleStatIds, setVisibleStatIds] = useState<string[]>(DEFAULT_VISIBLE_TEAM_STATS);
  const [isStatsCustomizerOpen, setIsStatsCustomizerOpen] = useState(false);

  // Edit Team Modal / State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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

  const isDexter = isDexterUser(user?.email);
  const isPrimary = isPrimaryTeamAdmin(user?.email, team, isDexter);
  const currentAdminEmails = getTeamAdminEmails(team);

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
      if (isYork) {
        if (typeof window !== "undefined") {
          const cached = localStorage.getItem("flagos_york_team_custom");
          const parsed = cached ? JSON.parse(cached) : {};
          localStorage.setItem("flagos_york_team_custom", JSON.stringify({ ...parsed, adminEmails: nextList }));
        }
        YORK_LIONS_TEAM.adminEmails = nextList;
        try {
          await setDoc(doc(db, "teams", teamId), { adminEmails: nextList }, { merge: true });
        } catch (e) {
          console.warn("Could not sync York admin emails to remote Firestore:", e);
        }
      } else if (isDemoLeague) {
        updateSandboxTeam(teamId, { adminEmails: nextList });
      } else {
        await setDoc(doc(db, "teams", teamId), { adminEmails: nextList }, { merge: true });
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

  const handleRemoveCoachAdmin = async (emailToRemove: string) => {
    const cleanEmail = emailToRemove.trim().toLowerCase();
    const currentList = getTeamAdminEmails(team);
    if (currentList[0]?.toLowerCase() === cleanEmail) {
      alert("The primary team admin (head coach) cannot be removed.");
      return;
    }
    if (!window.confirm(`Are you sure you want to remove ${cleanEmail} as a team admin?`)) {
      return;
    }

    setSavingStaff(true);
    setStaffActionError("");
    const nextList = currentList.filter((e) => e.toLowerCase() !== cleanEmail);

    try {
      if (isYork) {
        if (typeof window !== "undefined") {
          const cached = localStorage.getItem("flagos_york_team_custom");
          const parsed = cached ? JSON.parse(cached) : {};
          localStorage.setItem("flagos_york_team_custom", JSON.stringify({ ...parsed, adminEmails: nextList }));
        }
        YORK_LIONS_TEAM.adminEmails = nextList;
        try {
          await setDoc(doc(db, "teams", teamId), { adminEmails: nextList }, { merge: true });
        } catch (e) {
          console.warn("Could not sync York admin emails to remote Firestore:", e);
        }
      } else if (isDemoLeague) {
        updateSandboxTeam(teamId, { adminEmails: nextList });
      } else {
        await setDoc(doc(db, "teams", teamId), { adminEmails: nextList }, { merge: true });
      }

      setTeam((prev: any) => ({ ...prev, adminEmails: nextList }));
      setStaffActionSuccess(`Removed ${cleanEmail} from team admins.`);
      setTimeout(() => setStaffActionSuccess(""), 4500);
    } catch (err) {
      console.error("Failed to remove team admin:", err);
      setStaffActionError("Failed to remove team admin. Please try again.");
    } finally {
      setSavingStaff(false);
    }
  };

  // Prevent background main page from scrolling when modal is open
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
    const fetchTeam = async () => {
      // 1. Check York Lions standalone varsity team portal
      if (isYork) {
        let yData: any = { ...getYorkTeamData() };
        if (typeof window !== "undefined") {
          const cached = localStorage.getItem("flagos_york_team_custom");
          if (cached) {
            try {
              yData = { ...yData, ...JSON.parse(cached) };
            } catch {}
          }
        }
        try {
          const snap = await getDoc(doc(db, "teams", teamId));
          if (snap.exists()) {
            yData = { ...yData, ...(snap.data() as any) };
          }
        } catch (e) {
          console.warn("Using offline/seed York Lions team profile:", e);
        }
        setTeam(yData);
        setEditName(yData.name || "");
        setEditShortcode(yData.shortcode || "YORK");
        setEditLogoUrl(yData.logoUrl || "");
        setEditIcon(yData.icon || "cat");
        const palette = resolveTeamColorPalette(yData);
        setEditPrimaryColor(palette.primary);
        setEditSecondaryColor(palette.secondary);
        setEditTertiaryColor(palette.tertiary);

        // Load York Matches & Plays
        setMatches(getYorkTeamMatches());
        setPlays(getYorkTeamPlays());

        // Check custom stats display preference (defaulting to DEFAULT_VISIBLE_TEAM_STATS)
        let customStats: string[] | null = null;
        if (typeof window !== "undefined") {
          const cachedStats = localStorage.getItem(`flagos_team_stats_display_${teamId}`);
          if (cachedStats) {
            try {
              customStats = JSON.parse(cachedStats);
            } catch {}
          }
        }
        if (!customStats && yData.visibleTeamStats) {
          customStats = yData.visibleTeamStats;
        }
        setVisibleStatIds(customStats && Array.isArray(customStats) ? customStats : DEFAULT_VISIBLE_TEAM_STATS);

        setLoading(false);
        return;
      }

      if (isDemoLeague) {
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
              } catch {}
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
        const [snap, matchesSnap, playsSnap] = await Promise.all([
          getDoc(doc(db, "teams", teamId)),
          getDocs(collection(db, "matches")),
          getDocs(collection(db, "plays")),
        ]);
        if (snap.exists()) {
          const tData: any = { id: snap.id, ...(snap.data() as any) };
          if (isRealTeam(tData)) {
            setTeam(tData);
            setEditName(tData.name || "");
            setEditShortcode(tData.shortcode || getTeamShortcode(tData));
            setEditLogoUrl(tData.logoUrl || "");
            setEditIcon(tData.icon || "shield");
            const palette = resolveTeamColorPalette(tData);
            setEditPrimaryColor(palette.primary);
            setEditSecondaryColor(palette.secondary);
            setEditTertiaryColor(palette.tertiary);

            let customStats: string[] | null = null;
            if (typeof window !== "undefined") {
              const cachedStats = localStorage.getItem(`flagos_team_stats_display_${teamId}`);
              if (cachedStats) {
                try {
                  customStats = JSON.parse(cachedStats);
                } catch {}
              }
            }
            if (!customStats && tData.visibleTeamStats) {
              customStats = tData.visibleTeamStats;
            }
            setVisibleStatIds(customStats && Array.isArray(customStats) ? customStats : DEFAULT_VISIBLE_TEAM_STATS);
          }
        }
        setMatches(matchesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setPlays(playsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      } catch (e) {
        console.error("Error fetching team:", e);
      }
      setLoading(false);
    };

    fetchTeam();
    if (isDemoLeague) {
      const unsub = subscribeDemoSandbox(() => fetchTeam());
      return () => unsub();
    }
  }, [teamId, isDemoLeague, isYork]);

  const handleSaveVisibleStats = async (newStatIds: string[]) => {
    setVisibleStatIds(newStatIds);
    if (typeof window !== "undefined") {
      localStorage.setItem(`flagos_team_stats_display_${teamId}`, JSON.stringify(newStatIds));
    }
    const updatePayload = {
      visibleTeamStats: newStatIds,
      updatedAt: new Date().toISOString(),
    };
    if (isYork) {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("flagos_york_team_custom");
        const parsed = cached ? JSON.parse(cached) : {};
        localStorage.setItem("flagos_york_team_custom", JSON.stringify({ ...parsed, ...updatePayload }));
      }
      Object.assign(YORK_LIONS_TEAM, updatePayload);
      try {
        await updateDoc(doc(db, "teams", teamId), updatePayload);
      } catch (e) {
        console.warn("Could not save stats display to remote Firestore:", e);
      }
      setTeam((prev: any) => ({ ...prev, ...updatePayload }));
      return;
    }
    if (isDemoLeague) {
      updateSandboxTeam(teamId, updatePayload);
      setTeam((prev: any) => ({ ...prev, ...updatePayload }));
      return;
    }
    try {
      await updateDoc(doc(db, "teams", teamId), updatePayload);
      setTeam((prev: any) => ({ ...prev, ...updatePayload }));
    } catch (e) {
      console.error("Error updating team stats display:", e);
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

      if (isYork) {
        if (typeof window !== "undefined") {
          localStorage.setItem("flagos_york_team_custom", JSON.stringify(updatedData));
        }
        Object.assign(YORK_LIONS_TEAM, updatedData);
        try {
          await updateDoc(doc(db, "teams", teamId), updatedData);
        } catch (e) {
          console.warn("Could not save to remote Firestore, updating local state:", e);
        }
        setTeam((prev: any) => ({ ...prev, ...updatedData }));
        setIsEditModalOpen(false);
        setSaving(false);
        return;
      }

      if (isDemoLeague) {
        updateSandboxTeam(teamId, updatedData);
        setTeam((prev: any) => ({ ...prev, ...updatedData }));
        setIsEditModalOpen(false);
        setSaving(false);
        return;
      }

      await updateDoc(doc(db, "teams", teamId), updatedData);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-center items-center font-sans">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!team || !isRealTeam(team)) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-center items-center font-sans p-6 text-center">
        <h2 className="text-3xl font-black mb-4">Team Not Found</h2>
        <p className="text-neutral-400 mb-6 max-w-md">
          The requested franchise does not exist or has been removed. Free agents are an unassigned draft pool, not a franchise.
        </p>
        <Link
          href="/teams"
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)]"
        >
          Back to Teams
        </Link>
      </div>
    );
  }

  const shortcode = team.shortcode || getTeamShortcode(team);
  const palette = resolveTeamColorPalette(team);
  const isStandaloneOrPaidTeam = isYork || Boolean(team.isStandalone) || Boolean(team.subscription && team.subscription.status === "active");

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30 selection:text-cyan-200 relative font-sans flex flex-col">

      {/* Dynamic Background with ambient glows styled to team colors */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
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
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 p-6 md:p-20">
        {/* Navigation Buttons */}
        <div className="absolute top-8 left-8 flex items-center gap-3">
          <Link
            href="/teams"
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors bg-white/5 px-4 py-2.5 rounded-full border border-white/10 backdrop-blur-md text-sm font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            All Teams
          </Link>
          <Link
            href="/"
            className="flex items-center text-neutral-400 hover:text-white transition-colors bg-white/5 p-2.5 rounded-full border border-white/10 backdrop-blur-md"
            title="Home"
          >
            <Home className="w-4 h-4" />
          </Link>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-4xl mb-12 mt-12 md:mt-0">
          {/* Dedicated Team Logo Slot / Avatar Container */}
          <div className="flex flex-col items-center justify-center pt-2">
            {team.logoUrl ? (
              <div className="relative group/logo">
                <div 
                  className="w-28 h-28 md:w-32 md:h-32 rounded-3xl p-3 flex items-center justify-center backdrop-blur-xl shadow-2xl transition-all duration-300 group-hover/logo:scale-105 bg-white dark:bg-[#0a0a0a]/80"
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
                {hasEditAccess && (
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white dark:bg-black/90 border border-slate-200 dark:border-white/20 text-slate-800 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 opacity-90 group-hover/logo:opacity-100 transition-all shadow-lg flex items-center gap-1 cursor-pointer"
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
                onClick={() => setIsEditModalOpen(true)}
                className="group/placeholder relative w-28 h-28 md:w-32 md:h-32 rounded-3xl p-3 flex flex-col items-center justify-center text-center transition-all duration-300 hover:scale-105 cursor-pointer backdrop-blur-xl bg-slate-100 dark:bg-transparent"
                style={{
                  backgroundColor: `${palette.primary}15`,
                  border: `2px dashed ${palette.primary}80`,
                  boxShadow: `0 0 30px ${palette.primary}20`,
                }}
                title="Click to add team logo"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1 text-slate-900 dark:text-white group-hover/placeholder:scale-110 transition-transform">
                  <TeamLogo
                    teamName={team.name}
                    logoUrl=""
                    icon={team.icon || (isYork ? "cat" : "shield")}
                    className="w-8 h-8"
                    customColor={palette.primary === "#E31837" ? "text-red-400" : undefined}
                  />
                </div>
                <div className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                  <Upload className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  <span>Add Logo</span>
                </div>
                <span className="text-[9px] text-slate-500 dark:text-neutral-400 font-mono">Click to Upload</span>
              </button>
            )}
          </div>

          <div 
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-md mb-2 shadow-2xl"
            style={{
              backgroundColor: `${palette.primary}20`,
              border: `1px solid ${palette.primary}40`,
            }}
          >
            <TeamLogo teamName={team.name} logoUrl={team.logoUrl} icon={team.icon || (isYork ? "cat" : "shield")} className="w-5 h-5 text-red-400" />
            <span 
              className="text-sm font-bold tracking-widest uppercase text-slate-800 dark:text-white"
              style={{ color: palette.secondary === "#FFFFFF" || palette.secondary === "#ffffff" ? undefined : palette.secondary }}
            >
              {shortcode} • {isYork ? "Varsity Club Team Portal" : isStandaloneOrPaidTeam ? "Independent Team Portal" : `${settings.leagueName} Member Club`}
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-sm uppercase">
            {team.name}
          </h1>

          <p className="text-lg md:text-xl text-neutral-400 font-light max-w-2xl mx-auto leading-relaxed mt-4">
            {team.bio || `The official portal for the ${team.name}. View roster, schedule, team stats, and more.`}
          </p>

          {/* Coaching Staff Banner */}
          {(isYork || team.coachName) && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-300 font-medium">
              <span className="text-white font-bold">Coaching Staff:</span>
              <span>{team.coachName || "Dexter Sargent"} ({team.coachRole || "Head Coach & Defensive Coordinator"})</span>
              {team.assistantCoach && (
                <>
                  <span className="text-neutral-500">•</span>
                  <span>{team.assistantCoach} ({team.assistantCoachRole || "Offensive Coordinator"})</span>
                </>
              )}
            </div>
          )}

          {/* Team Colors Bar & Edit Button */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-300 backdrop-blur-md">
              <span className="text-white font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
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

            {hasEditAccess && (
              <>
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-all border border-white/15 hover:border-white/30 backdrop-blur-md shadow-lg cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>Coaches &amp; Admins ({currentAdminEmails.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-all border border-white/15 hover:border-white/30 backdrop-blur-md shadow-lg cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <span>Edit Team Info</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Standalone Pro Team Subscription Banner (for York Lions and standalone subscribers) */}
        {(isYork || team.isStandalone || team.subscription) && (
          <div className="w-full max-w-5xl mb-10 bg-gradient-to-r from-red-950/40 via-neutral-900/60 to-black border border-red-500/30 rounded-3xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-bold border border-emerald-500/30">
                    Active Subscription (Complimentary Lifetime)
                  </span>
                  <span className="text-neutral-500 text-xs">•</span>
                  <span className="text-xs text-neutral-300 font-semibold">Tier: Pro Team Portal ($0/mo)</span>
                </div>
                <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span>York Lions Varsity Digital Headquarters</span>
                </h3>
                <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
                  Full standalone autonomy enabled: private depth charts, unlimited tournament &amp; scrimmage stat logging via the Play-by-Play Wizard, and up to 5 custom playbooks with pre-snap motion.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href={`/teams/${teamId}/playbook`}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Open Playbook</span>
                </Link>
                <Link
                  href={`/teams/${teamId}/roster`}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all border border-white/10"
                >
                  <Users className="w-4 h-4" />
                  <span>Roster</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Team Season Stats Banner (Customizable by Team Admin) */}
        {(() => {
          const stats = calculateTeamComprehensiveStats(
            teamId,
            matches,
            plays,
            team ? { teamName: team.name, teamAliases: [shortcode] } : undefined
          );

          return (
            <div className="w-full max-w-6xl mb-8">
              <div className="bg-neutral-950/70 border border-white/10 rounded-3xl p-5 md:p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div
                  className="absolute -right-20 -top-20 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none"
                  style={{ backgroundColor: palette.primary }}
                />

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-white/5 relative z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/10"
                      style={{ backgroundColor: `${palette.primary}25` }}
                    >
                      <Trophy className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base md:text-lg font-black uppercase tracking-tight text-white">
                          Season Team Stats
                        </h3>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/5 text-neutral-300 border border-white/10">
                          {visibleStatIds.length} ACTIVE
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">
                        Official season metrics tracked live via the Play-by-Play Wizard.
                      </p>
                    </div>
                  </div>

                  {hasEditAccess && (
                    <button
                      type="button"
                      onClick={() => setIsStatsCustomizerOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider transition-all border border-white/10 hover:border-cyan-500/50 shadow-md cursor-pointer shrink-0"
                    >
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Customize Stats</span>
                    </button>
                  )}
                </div>

                {/* Stat Cards Grid */}
                {visibleStatIds.length === 0 ? (
                  <div className="py-8 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                    <p className="text-sm text-neutral-400 mb-2">No team stats currently selected for display.</p>
                    {hasEditAccess && (
                      <button
                        onClick={() => setIsStatsCustomizerOpen(true)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider"
                      >
                        Click here to customize stats display
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 relative z-10">
                    {visibleStatIds.map((statId) => {
                      const def = TEAM_STAT_DEFINITIONS.find((d) => d.id === statId);
                      if (!def) return null;
                      const value = def.getValue(stats);

                      return (
                        <div
                          key={def.id}
                          className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 hover:border-white/15 transition-all flex flex-col justify-between group/card relative overflow-hidden"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-neutral-400 truncate">
                              {def.shortLabel}
                            </span>
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-white/5 text-neutral-400">
                              {def.category}
                            </span>
                          </div>
                          <div className="my-1">
                            <div className="text-xl md:text-2xl font-black font-mono tracking-tight text-white group-hover/card:text-cyan-300 transition-colors">
                              {value}
                            </div>
                          </div>
                          <div className="text-[11px] text-neutral-400 font-medium line-clamp-1" title={def.description}>
                            {def.label}
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
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${canAccessPlaybook ? "lg:grid-cols-4 max-w-6xl" : "lg:grid-cols-3 max-w-5xl"} gap-5 w-full`}>
          {/* Bento 1: Schedule */}
          <Link
            href={`/teams/${teamId}/schedule`}
            className="group relative flex flex-col p-6 rounded-3xl bg-neutral-950/60 border border-white/5 backdrop-blur-md hover:bg-neutral-900 transition-all duration-300 hover:border-cyan-500/50 overflow-hidden shadow-xl hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CalendarDays className="w-8 h-8 text-white mb-4 group-hover:text-cyan-400 transition-colors" />
            <h3 className="text-xl font-black mb-1.5 uppercase tracking-wide">Schedule</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Upcoming games, box scores, and live game tracking.
            </p>
          </Link>

          {/* Bento 2: Team Roster */}
          <Link
            href={`/teams/${teamId}/roster`}
            className="group relative flex flex-col p-6 rounded-3xl bg-neutral-950/60 border border-white/5 backdrop-blur-md hover:bg-neutral-900 transition-all duration-300 hover:border-cyan-500/50 overflow-hidden shadow-xl hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Users className="w-8 h-8 text-white mb-4 group-hover:text-cyan-400 transition-colors" />
            <h3 className="text-xl font-black mb-1.5 uppercase tracking-wide">Team</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Official roster and team stats.
            </p>
          </Link>

          {/* Bento 3: Stat Leaders */}
          <Link
            href={`/teams/${teamId}/stats`}
            className="group relative flex flex-col p-6 rounded-3xl bg-neutral-950/60 border border-white/5 backdrop-blur-md hover:bg-neutral-900 transition-all duration-300 hover:border-cyan-500/50 overflow-hidden shadow-xl hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Activity className="w-8 h-8 text-white mb-4 group-hover:text-cyan-400 transition-colors" />
            <h3 className="text-xl font-black mb-1.5 uppercase tracking-wide">Stat Leaders</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Top performers in each statistical category.
            </p>
          </Link>

          {/* Bento 4: Interactive Playbook (Restricted to Team Admins and Players of this franchise) */}
          {canAccessPlaybook && (
            <Link
              href={`/teams/${teamId}/playbook`}
              className="group relative flex flex-col p-6 rounded-3xl bg-neutral-950/60 border border-white/5 backdrop-blur-md hover:bg-neutral-900 transition-all duration-300 hover:border-cyan-500/50 overflow-hidden shadow-xl hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <BookOpen className="w-8 h-8 text-white mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-black mb-1.5 uppercase tracking-wide">Playbooks</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Design and study offensive and defensive playbooks.
              </p>
            </Link>
          )}
        </div>

        {/* Footer info & Admin login */}
        <div className="mt-16 flex items-center justify-center gap-6">
          <Link
            href="/login"
            className="text-neutral-600 hover:text-neutral-400 text-sm transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Role Settings & Login
          </Link>
        </div>
      </main>

      {/* Edit Team Modal (Accessible to Team Admin & League Admin) */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditModalOpen(false);
          }}
        >
          <div className="bg-[#0B0F19] border border-cyan-500/30 rounded-3xl max-w-xl w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Pinned Header with permanently accessible Close button */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-[#0B0F19] shrink-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400 border border-cyan-500/20">
                  <Edit3 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">Edit Team Details</h2>
                  <p className="text-xs text-neutral-400">Team identity, logo emblem, and primary / secondary colours.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-neutral-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
                <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-400 transition-colors"
                  placeholder="e.g. Apex Titans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Shortcode (Abbreviation)
                </label>
                <input
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

              <fieldset className="space-y-3 rounded-2xl border border-white/10 bg-neutral-950/60 p-4">
                <legend className="px-2 text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-cyan-400" />
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

              <div className="space-y-3 rounded-2xl border border-white/10 bg-neutral-950/60 p-4">
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
                  <label className="block text-[11px] text-neutral-400 mb-1">Or Paste Image URL (Optional)</label>
                  <input
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
                        >
                          <IconComp className="w-5 h-5" />
                        </button>
                      );
                    })}
                  </div>
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
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
                    <Sliders className="w-3 h-3 text-cyan-400" />
                    <span>Customize Stats</span>
                  </button>
                </div>
              </div>

              </div>

              </div>

              {/* Pinned Footer with Cancel and Save Changes Buttons */}
              <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0B0F19] flex items-center justify-end gap-3 shrink-0 z-10">
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
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Explanation card */}
            <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs text-neutral-300 space-y-1">
              <div className="font-bold text-cyan-300 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Team Administrative Permissions</span>
              </div>
              <p>
                Authorized team admins can invite additional coaches. <strong>Only the primary team admin (the first coach)</strong> has permission to delete players, games, and playbooks.
              </p>
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
            <div className="mt-5">
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Current Team Admins ({currentAdminEmails.length})
              </div>
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {currentAdminEmails.map((email, idx) => {
                  const isFirst = idx === 0;
                  return (
                    <div
                      key={email}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-neutral-950/70 p-3.5 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <span className="font-mono text-xs text-white truncate font-semibold">{email}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          {isFirst ? (
                            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                              Primary Admin (Head Coach)
                            </span>
                          ) : (
                            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                              Team Admin / Coach
                            </span>
                          )}
                          <span className="text-[10px] text-neutral-500">
                            {isFirst ? "Full deletion rights" : "Standard management"}
                          </span>
                        </div>
                      </div>

                      {!isFirst && isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCoachAdmin(email)}
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
            <form onSubmit={handleAddCoachAdmin} className="mt-6 pt-5 border-t border-white/10">
              <label htmlFor="new-coach-email-input" className="block text-xs font-bold uppercase text-neutral-300 mb-1.5">
                Add Coach as Team Admin
              </label>
              <p className="text-[11px] text-neutral-400 mb-3">
                Enter the email address of an assistant coach, coordinator, or team manager.
              </p>
              <div className="flex gap-2">
                <input
                  id="new-coach-email-input"
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="coach@example.com"
                  className="flex-1 rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-cyan-400 focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  disabled={savingStaff || !newAdminEmail.trim()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
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
      <TeamStatsCustomizerModal
        isOpen={isStatsCustomizerOpen}
        onClose={() => setIsStatsCustomizerOpen(false)}
        onSave={handleSaveVisibleStats}
        initialVisibleStats={visibleStatIds}
        teamStats={calculateTeamComprehensiveStats(
          teamId,
          matches,
          plays,
          team ? { teamName: team.name, teamAliases: [shortcode] } : undefined
        )}
        teamName={team?.name || "Team"}
        primaryColor={palette.primary}
      />

      {/* Standalone / Paid Team Portal Footer with subtle Powered by FlagOS Disclaimer */}
      <footer className="relative z-10 w-full border-t border-white/10 bg-black/80 backdrop-blur-md py-8 px-6 text-xs text-neutral-400 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white uppercase">{team.name}</span>
            <span>•</span>
            <span>{isYork ? "Varsity Club Team Portal" : isStandaloneOrPaidTeam ? "Independent Team Portal" : "Official Team Portal"}</span>
            <span>•</span>
            <span>{settings.seasonTitle || "2026"}</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-400 font-medium">
            <span>Powered by</span>
            <FlagOSText />
          </div>
        </div>
      </footer>

    </div>
  );
}
