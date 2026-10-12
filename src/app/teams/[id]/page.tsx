"use client";

import { use, useEffect, useState } from "react";
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
  BookOpen
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/lib/authContext";
import { TeamLogo, getTeamShortcode, AVAILABLE_ICONS, isRealTeam } from "@/components/TeamAssets";
import { useLeague } from "@/lib/leagueContext";
import LeagueHeader from "@/components/LeagueHeader";
import LeagueFooter from "@/components/LeagueFooter";
import { renderFlagOS } from "@/components/FlagOSText";
import { getSandboxTeams, updateSandboxTeam, subscribeDemoSandbox } from "@/lib/demoSandbox";

export default function TeamPortalHome({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const teamId = unwrappedParams.id;

  const { canManageTeam, isLeagueAdmin, isTeamAdmin, isAdmin, isPlayer, playerTeamId } = useAuth();
  const isTeamAdminForThisTeam = isTeamAdmin(teamId);
  const isRosteredPlayerOnTeam = isPlayer && playerTeamId === teamId;
  // Playbooks are strictly confidential to team admins and rostered players; hidden from league admins and spectators unless they are also team admins
  const isBlockedLeagueAdmin = isLeagueAdmin && !isTeamAdminForThisTeam;
  const canAccessPlaybook = !isBlockedLeagueAdmin && (isTeamAdminForThisTeam || isRosteredPlayerOnTeam);
  const { settings, isDemoLeague } = useLeague();
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit Team Modal / State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editShortcode, setEditShortcode] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editIcon, setEditIcon] = useState("shield");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTeam = async () => {
      if (isDemoLeague) {
        const tData = getSandboxTeams().find((t) => t.id === teamId);
        if (tData && isRealTeam(tData)) {
          setTeam(tData);
          setEditName(tData.name || "");
          setEditShortcode(getTeamShortcode(tData));
          setEditLogoUrl("");
          setEditIcon("shield");
        }
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "teams", teamId));
        if (snap.exists()) {
          const tData: any = { id: snap.id, ...(snap.data() as any) };
          if (isRealTeam(tData)) {
            setTeam(tData);
            setEditName(tData.name || "");
            setEditShortcode(tData.shortcode || getTeamShortcode(tData));
            setEditLogoUrl(tData.logoUrl || "");
            setEditIcon(tData.icon || "shield");
          }
        }
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
  }, [teamId, isDemoLeague]);

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    setSaving(true);
    try {
      const updatedData = {
        name: editName.trim(),
        shortcode: editShortcode.trim().toUpperCase(),
        logoUrl: editLogoUrl.trim(),
        icon: editIcon,
        updatedAt: new Date().toISOString(),
      };

      if (isDemoLeague) {
        updateSandboxTeam(teamId, editName.trim());
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

  const hasEditAccess = canManageTeam(teamId);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!team || !isRealTeam(team)) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans p-6 text-center">
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

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden relative font-sans flex flex-col">
      {/* Branded League Navigation Bar */}
      <LeagueHeader activePage="teams" />

      {/* Dynamic Background with ambient glows */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[35rem] h-[35rem] bg-cyan-600 rounded-full mix-blend-screen filter blur-[140px] opacity-20 animate-pulse"></div>
        <div className="absolute top-40 -right-40 w-[35rem] h-[35rem] bg-blue-950 rounded-full mix-blend-screen filter blur-[140px] opacity-35 animate-pulse delay-1000"></div>
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
        <div className="text-center space-y-6 max-w-4xl mb-16 mt-12 md:mt-0">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/30 backdrop-blur-md mb-2 shadow-2xl">
            <TeamLogo teamName={team.name} logoUrl={team.logoUrl} icon={team.icon} className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-bold tracking-widest text-cyan-200 uppercase">
              {shortcode} • {renderFlagOS(settings.leagueName)} Member Club
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-sm uppercase">
            {team.name}
          </h1>

          <p className="text-lg md:text-xl text-neutral-400 font-light max-w-2xl mx-auto leading-relaxed mt-4">
            The official portal for the <span className="text-white font-semibold">{team.name}</span>. View roster, schedule, team stats, and more.
          </p>

          {/* Edit Team Access for Team Admin or League Admin */}
          {hasEditAccess && (
            <div className="pt-2">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-all border border-white/10 hover:border-white/30 backdrop-blur-md shadow-lg"
              >
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Edit Team Info</span>
              </button>
            </div>
          )}
        </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400">
                <Edit3 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Edit Team Details</h2>
                <p className="text-xs text-neutral-400">Team Admins can update team name, logo, and shortcode.</p>
              </div>
            </div>

            <form onSubmit={handleSaveTeam} className="space-y-4">
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

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Team Icon / Logo
                </label>
                <div className="grid grid-cols-6 gap-2 mb-3">
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
                          : "bg-neutral-950 border-white/5 text-neutral-400 hover:text-white hover:bg-white/5"
                          }`}
                        title={item.label}
                      >
                        <IconComp className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2">
                  <label className="block text-[11px] text-neutral-400 mb-1">Or Custom Logo Image URL (Optional)</label>
                  <input
                    type="url"
                    value={editLogoUrl}
                    onChange={(e) => setEditLogoUrl(e.target.value)}
                    className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-cyan-400 transition-colors"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)] disabled:opacity-50 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branded League Footer */}
      <LeagueFooter />
    </div>
  );
}
