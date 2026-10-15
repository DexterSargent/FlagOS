"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, UserRole } from "@/lib/authContext";
import { Crown, Whistle, BicepsFlexed, X, Settings, RotateCcw, Sparkles, Eye, ArrowLeft } from "lucide-react";
import { useLeague } from "@/lib/leagueContext";
import { getSandboxTeams, getSandboxPlayers, subscribeDemoSandbox } from "@/lib/demoSandbox";
import ThemeToggle from "@/components/ThemeToggle";

export default function RoleSwitcherBar() {
  const pathname = usePathname();
  const { user, role, managedTeamId, playerId, setDevRole, isLeagueAdmin, isPlayer } = useAuth();
  const { isDemoLeague, openCustomizer, resetDemoSession } = useLeague();
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [players, setPlayers] = useState<Array<{ id: string; teamId: string; playerName: string; number?: string }>>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const roleSwitcherRef = useRef<HTMLElement>(null);

  const isEmbed = typeof window !== "undefined" && (
    (window.self !== window.top && window.location.search.includes("embed=true")) ||
    new URLSearchParams(window.location.search).get("embed") === "true"
  );

  const [isLocalOrEmbed] = useState(() => {
    if (typeof window !== "undefined") {
      const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.endsWith(".local") ||
        window.location.hostname.startsWith("192.168.") ||
        window.location.hostname.startsWith("10.");
      const isDemo =
        window.location.search.includes("demo=true") ||
        sessionStorage.getItem("flagos_demo_active") === "true";
      return isLocal || isDemo;
    }
    return false;
  });

  const isPlatformOwner = user?.email?.trim().toLowerCase() === "dextersargent@gmail.com";
  const isEligibleHost = !isEmbed && (isLocalOrEmbed || isPlatformOwner || isDemoLeague);
  const isEligiblePage =
    !isEmbed && isEligibleHost && pathname !== "/" && pathname !== "/pricing" && pathname !== "/login";

  useEffect(() => {
    const root = document.documentElement;
    const element = roleSwitcherRef.current;
    if (!isEligiblePage || isCollapsed || !element) {
      root.style.setProperty("--role-switcher-height", "0px");
      return () => root.style.removeProperty("--role-switcher-height");
    }

    const updateHeight = () => {
      root.style.setProperty("--role-switcher-height", `${Math.ceil(element.getBoundingClientRect().height)}px`);
    };
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    updateHeight();

    return () => {
      observer.disconnect();
      root.style.removeProperty("--role-switcher-height");
    };
  }, [isEligiblePage, isCollapsed]);

  useEffect(() => {
    if (!isEligiblePage) return;

    const loadData = () => {
      try {
        const tList = getSandboxTeams().map((t) => ({ id: t.id, name: t.name }));
        tList.sort((a, b) => a.name.localeCompare(b.name));
        setTeams(tList);

        const pList = getSandboxPlayers().map((p) => ({
          id: p.id,
          teamId: p.teamId,
          playerName: p.playerName || "Unnamed Athlete",
          number: p.number || "00",
        }));
        pList.sort((a, b) => a.playerName.localeCompare(b.playerName));
        setPlayers(pList);
      } catch (err) {
        console.error("Failed to load demo data for role switcher:", err);
      }
    };

    loadData();
    const unsub = subscribeDemoSandbox(() => loadData());
    return () => unsub();
  }, [isEligiblePage]);

  if (!isEligiblePage) {
    return null;
  }

  const handleSelectRole = (newRole: UserRole, teamId?: string, targetPlayerId?: string) => {
    const fallbackTeams = teams.length > 0 ? teams : getSandboxTeams().map((t) => ({ id: t.id, name: t.name }));
    if (newRole === "team_admin") {
      const selectedTeam = teamId || managedTeamId || fallbackTeams[0]?.id || "team_bears";
      setDevRole("team_admin", selectedTeam);
    } else if (newRole === "player") {
      const fallbackPlayers =
        players.length > 0
          ? players
          : getSandboxPlayers().map((p) => ({
              id: p.id,
              teamId: p.teamId,
              playerName: p.playerName || "Unnamed Athlete",
              number: p.number || "00",
            }));
      let selectedTeam = teamId || managedTeamId || fallbackTeams[0]?.id || "team_bears";
      let teamPlayers = fallbackPlayers.filter((p) => p.teamId === selectedTeam);
      let chosenPlayer = targetPlayerId || (teamPlayers[0] ? teamPlayers[0].id : fallbackPlayers[0]?.id);
      if (!teamPlayers[0] && fallbackPlayers[0]) {
        selectedTeam = fallbackPlayers[0].teamId;
        chosenPlayer = fallbackPlayers[0].id;
      }
      setDevRole("player", selectedTeam, chosenPlayer);
    } else {
      setDevRole(newRole);
    }
  };

  const handleTeamChange = (newTeamId: string) => {
    if (role === "player") {
      const teamPlayers = players.filter((p) => p.teamId === newTeamId);
      const chosenPlayer = teamPlayers[0] ? teamPlayers[0].id : undefined;
      setDevRole("player", newTeamId, chosenPlayer);
    } else {
      setDevRole("team_admin", newTeamId);
    }
  };

  const handlePlayerChange = (newPlayerId: string) => {
    const targetPlayer = players.find((p) => p.id === newPlayerId);
    if (targetPlayer) {
      setDevRole("player", targetPlayer.teamId, targetPlayer.id);
    }
  };

  const handleResetSession = () => {
    if (resetConfirm) {
      resetDemoSession();
      setResetConfirm(false);
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } else {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 4000);
    }
  };

  const currentTeamName = teams.find((t) => t.id === managedTeamId)?.name || (teams[0]?.name ?? "Assigned Team");
  const currentPlayer = players.find((p) => p.id === playerId);
  const playersForActiveTeam = players.filter((p) => p.teamId === (managedTeamId || teams[0]?.id));

  if (isCollapsed) {
    return (
      <aside aria-label="Role Switcher" className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <ThemeToggle size="md" />
        {isDemoLeague && (
          <Link
            href="/"
            title="Exit Demo and return to FlagOS Home"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-black uppercase tracking-wider shadow-lg transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        )}
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-neutral-900/95 border border-cyan-500/40 text-white shadow-[0_0_25px_rgba(var(--league-primary-rgb),0.35)] backdrop-blur-md hover:border-cyan-400 transition-all text-xs font-bold"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-300">Active Role:</span>
          <span>
            {role === "player" || isPlayer
              ? `Player (${currentPlayer?.playerName || "Athlete"})`
              : role === "team_admin"
              ? `Team Admin (${currentTeamName})`
              : isLeagueAdmin
              ? "League Admin"
              : "Spectator"}
          </span>
          <span className="text-neutral-400 text-[10px] uppercase font-mono">(Switch)</span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Role Switcher"
      ref={roleSwitcherRef}
      className="sticky top-0 flex flex-row z-[60] bg-[#070A11]/95 border-b border-cyan-500/30 px-1 sm:px-3 lg:px-4 py-1 backdrop-blur-md shadow-xl shadow-black/60 text-xs overflow-hidden"
    >
      <div className="w-full max-w-[1700px] mx-auto flex flex-nowrap items-center justify-between gap-0.5 sm:gap-2 xl:gap-3 min-w-0">
        {/* Left: Indicator & Role Badge */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 px-0.5 sm:px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[9px] sm:text-[10px] font-bold shrink-0">
            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-400 animate-pulse" />
            <span className="hidden sm:inline tracking-wide">ROLE SWITCHER</span>
          </div>
          {isDemoLeague && (
            <Link
              href="/"
              title="Exit Demo League and return to FlagOS Home"
              className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] sm:text-[11px] transition-colors shrink-0"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Exit Demo</span>
            </Link>
          )}
          <span className="hidden 2xl:inline text-[11px] text-neutral-400 font-medium truncate">
            Switch League Context • Session Isolated
          </span>
        </div>

        {/* Center: Toggle Buttons */}
        <div className="grid grid-cols-4 flex-1 items-center gap-0 bg-slate-100 dark:bg-black/70 p-0.5 rounded-lg sm:rounded-xl border border-slate-200 dark:border-white/10 shadow-inner min-w-0">
          {/* League Admin Toggle */}
          <button
            onClick={() => handleSelectRole("league_admin")}
            title="Commissioner view: configure rules, manage schedule & launch play-by-play"
            aria-label="League Admin"
            className={`flex min-w-0 items-center justify-center gap-0.5 sm:gap-1 px-0.5 sm:px-2 lg:px-2.5 py-1 rounded-md sm:rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap text-[10px] sm:text-xs ${
              role === "league_admin"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black"
                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5"
            }`}
          >
            <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="hidden lg:inline truncate">League Admin</span>
          </button>

          {/* Team Admin Toggle */}
          <button
            onClick={() => handleSelectRole("team_admin")}
            title="Team manager view: franchise portal, exhibition games & async stat tracking"
            aria-label="Team Admin"
            className={`flex min-w-0 items-center justify-center gap-0.5 sm:gap-1 px-0.5 sm:px-2 lg:px-2.5 py-1 rounded-md sm:rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap text-[10px] sm:text-xs ${
              role === "team_admin"
                ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-black"
                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5"
            }`}
          >
            <Whistle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="hidden lg:inline truncate">Team Admin</span>
          </button>

          {/* Player Toggle */}
          <button
            onClick={() => handleSelectRole("player")}
            title="Rostered athlete view: personal stats, player profile & team playbook"
            aria-label="Player"
            className={`flex min-w-0 items-center justify-center gap-0.5 sm:gap-1 px-0.5 sm:px-2 lg:px-2.5 py-1 rounded-md sm:rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap text-[10px] sm:text-xs ${
              role === "player"
                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-black"
                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5"
            }`}
          >
            <BicepsFlexed className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="hidden lg:inline truncate">Player</span>
          </button>

          {/* Regular User Toggle */}
          <button
            onClick={() => handleSelectRole("user")}
            title="Spectator view: public schedule, standings & game box scores"
            aria-label="Spectator"
            className={`flex min-w-0 items-center justify-center gap-0.5 sm:gap-1 px-0.5 sm:px-2 lg:px-2.5 py-1 rounded-md sm:rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap text-[10px] sm:text-xs ${
              role === "user"
                ? "bg-slate-300 dark:bg-neutral-200 text-black shadow-md font-black"
                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5"
            }`}
          >
            <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="hidden lg:inline truncate">Spectator</span>
          </button>
        </div>

        {/* Right: Team / Player Pickers, Settings, Reset Demo & Collapse */}
        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink min-w-0">
          {/* Team Admin Team Selector */}
          {role === "team_admin" && teams.length > 0 && (
            <div className="flex items-center gap-0.5 sm:gap-1 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-500/30 px-0.5 sm:px-2 py-0.5 rounded-lg shrink min-w-0 overflow-hidden">
              <span className="hidden lg:inline text-[10px] uppercase font-bold text-cyan-800 dark:text-cyan-300">Franchise:</span>
              <select
                value={managedTeamId || teams[0]?.id || ""}
                onChange={(e) => handleTeamChange(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white font-bold outline-none text-[8px] sm:text-xs cursor-pointer w-8 sm:w-12 lg:w-auto max-w-[100px] lg:max-w-[150px] min-w-0 truncate"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id} className="bg-white text-slate-900 dark:bg-neutral-900 dark:text-white">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Player Selectors (Team + Player) */}
          {role === "player" && (
            <div className="flex items-center gap-0.5 sm:gap-1.5 shrink min-w-0">
              {teams.length > 0 && (
                  <div className="flex items-center gap-0.5 sm:gap-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 px-0.5 sm:px-2 py-0.5 rounded-lg shrink min-w-0 overflow-hidden">
                    <span className="hidden lg:inline text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">Team:</span>
                  <select
                    value={managedTeamId || teams[0]?.id || ""}
                    onChange={(e) => handleTeamChange(e.target.value)}
                    className="bg-transparent text-slate-900 dark:text-white font-bold outline-none text-[8px] sm:text-xs cursor-pointer w-8 sm:w-12 lg:w-auto max-w-[90px] lg:max-w-[130px] min-w-0 truncate"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id} className="bg-white text-slate-900 dark:bg-neutral-900 dark:text-white">
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {playersForActiveTeam.length > 0 ? (
                <div className="flex items-center gap-0.5 sm:gap-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 px-0.5 sm:px-2 py-0.5 rounded-lg shrink min-w-0 overflow-hidden">
                  <span className="hidden lg:inline text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">Athlete:</span>
                  <select
                    value={playerId || playersForActiveTeam[0]?.id || ""}
                    onChange={(e) => handlePlayerChange(e.target.value)}
                    className="bg-transparent text-slate-900 dark:text-white font-bold outline-none text-[8px] sm:text-xs cursor-pointer w-8 sm:w-12 lg:w-auto max-w-[100px] lg:max-w-[140px] min-w-0 truncate"
                  >
                    {playersForActiveTeam.map((p) => (
                      <option key={p.id} value={p.id} className="bg-white text-slate-900 dark:bg-neutral-900 dark:text-white">
                        #{p.number} {p.playerName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="hidden sm:inline text-[10px] text-slate-500 dark:text-neutral-400 italic">No players</span>
              )}
            </div>
          )}

          {/* League Customizer / Settings Button */}
          <button
            onClick={openCustomizer}
            aria-label="League settings"
            className="flex items-center gap-1 px-0.5 sm:px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-neutral-200 font-bold border border-slate-200 dark:border-white/20 text-[11px] transition-all shadow-sm cursor-pointer shrink-0"
            title="Configure league rules, colors, and branding"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden lg:inline">Settings</span>
          </button>

          {/* Light / Dark Mode Toggle */}
          <div className="shrink-0">
            <ThemeToggle size="sm" />
          </div>

          {/* Reset Session Button */}
          <button
            onClick={handleResetSession}
            aria-label={resetConfirm ? "Confirm reset session" : "Reset session"}
            className={`flex items-center gap-0.5 sm:gap-1 px-0.5 sm:px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all shadow-sm cursor-pointer border shrink-0 whitespace-nowrap ${
              resetConfirm
                ? "bg-red-600 text-white border-red-500 animate-pulse font-black"
                : "bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30"
            }`}
            title="Reset current session to original defaults"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden lg:inline">{resetConfirm ? "Confirm Reset?" : "Reset Session"}</span>
          </button>

          {/* Minimize Button */}
          <button
            onClick={() => setIsCollapsed(true)}
            title="Minimize role switcher"
            className="p-1 rounded-md text-neutral-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
