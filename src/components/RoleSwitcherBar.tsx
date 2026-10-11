"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth, UserRole } from "@/lib/authContext";
import { Crown, Shield, User, X, Settings, RotateCcw, Sparkles } from "lucide-react";
import { useLeague } from "@/lib/leagueContext";
import { getSandboxTeams, getSandboxPlayers, subscribeDemoSandbox } from "@/lib/demoSandbox";
import ThemeToggle from "@/components/ThemeToggle";

export default function RoleSwitcherBar() {
  const pathname = usePathname();
  const { role, managedTeamId, playerId, setDevRole, isLeagueAdmin, isPlayer } = useAuth();
  const { isDemoLeague, openCustomizer, resetDemoSession } = useLeague();
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [players, setPlayers] = useState<Array<{ id: string; teamId: string; playerName: string; number?: string }>>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  // CRITICAL: Role Switcher MUST ONLY render inside the Demo League
  // Never on marketing platform home (/), pricing (/pricing), or real user leagues
  const isEligiblePage = isDemoLeague && pathname !== "/" && pathname !== "/pricing";

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
    if (newRole === "team_admin") {
      const selectedTeam = teamId || managedTeamId || (teams[0] ? teams[0].id : undefined);
      setDevRole("team_admin", selectedTeam);
    } else if (newRole === "player") {
      let selectedTeam = teamId || managedTeamId || (teams[0] ? teams[0].id : undefined);
      let teamPlayers = players.filter((p) => p.teamId === selectedTeam);
      let chosenPlayer = targetPlayerId || (teamPlayers[0] ? teamPlayers[0].id : players[0]?.id);
      if (!teamPlayers[0] && players[0]) {
        selectedTeam = players[0].teamId;
        chosenPlayer = players[0].id;
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
      <aside aria-label="Demo Testing Role Switcher" className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <ThemeToggle size="md" />
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-neutral-900/95 border border-cyan-500/40 text-white shadow-[0_0_25px_rgba(var(--league-primary-rgb),0.35)] backdrop-blur-md hover:border-cyan-400 transition-all text-xs font-bold"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-300">Demo Role:</span>
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
      aria-label="Demo Testing Role Switcher"
      className="sticky top-0 z-50 bg-[#070A11]/95 border-b border-cyan-500/30 px-4 py-2.5 backdrop-blur-md shadow-xl shadow-black/60 text-xs"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Indicator & Demo Badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold">
            <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>DEMO SANDBOX</span>
          </div>
          <span className="hidden lg:inline text-[11px] text-neutral-400 font-medium">
            Test roles freely • Isolated to your session (resets on close)
          </span>
        </div>

        {/* Center: Toggle Buttons */}
        <div className="flex items-center gap-1 bg-black/70 p-1 rounded-xl border border-white/10 shadow-inner">
          {/* League Admin Toggle */}
          <button
            onClick={() => handleSelectRole("league_admin")}
            title="Experience full commissioner control: edit rules, manage schedule & launch play-by-play"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              role === "league_admin"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>League Admin</span>
          </button>

          {/* Team Admin Toggle */}
          <button
            onClick={() => handleSelectRole("team_admin")}
            title="Experience team manager control: franchise portal, independent scheduling & async stat-keeping"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              role === "team_admin"
                ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-black"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Team Admin</span>
          </button>

          {/* Player Toggle */}
          <button
            onClick={() => handleSelectRole("player")}
            title="Experience rostered athlete view: personal box score, athlete profile & team playbook"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              role === "player"
                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-black"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Player</span>
          </button>

          {/* Regular User Toggle */}
          <button
            onClick={() => handleSelectRole("user")}
            title="Experience spectator fan view: public schedule, leaderboards & game box scores"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              role === "user"
                ? "bg-neutral-200 text-black shadow-md font-black"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>Spectator</span>
          </button>
        </div>

        {/* Right: Team / Player Pickers, Settings, Reset Demo & Collapse */}
        <div className="flex items-center gap-2">
          {/* Team Admin Team Selector */}
          {role === "team_admin" && teams.length > 0 && (
            <div className="flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-cyan-300">Franchise:</span>
              <select
                value={managedTeamId || teams[0]?.id || ""}
                onChange={(e) => handleTeamChange(e.target.value)}
                className="bg-transparent text-white font-bold outline-none text-xs cursor-pointer"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id} className="bg-neutral-900 text-white">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Player Selectors (Team + Player) */}
          {role === "player" && (
            <div className="flex items-center gap-2">
              {teams.length > 0 && (
                <div className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-emerald-300">Team:</span>
                  <select
                    value={managedTeamId || teams[0]?.id || ""}
                    onChange={(e) => handleTeamChange(e.target.value)}
                    className="bg-transparent text-white font-bold outline-none text-xs cursor-pointer"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id} className="bg-neutral-900 text-white">
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {playersForActiveTeam.length > 0 ? (
                <div className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-emerald-300">Athlete:</span>
                  <select
                    value={playerId || playersForActiveTeam[0]?.id || ""}
                    onChange={(e) => handlePlayerChange(e.target.value)}
                    className="bg-transparent text-white font-bold outline-none text-xs cursor-pointer"
                  >
                    {playersForActiveTeam.map((p) => (
                      <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                        #{p.number} {p.playerName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-[10px] text-neutral-400 italic">No players on team</span>
              )}
            </div>
          )}

          {/* League Customizer / Settings Button */}
          <button
            onClick={openCustomizer}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-200 font-bold border border-white/20 text-[11px] transition-all shadow-sm cursor-pointer"
            title="Customize demo league rules, colors, and branding"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* Light / Dark Mode Toggle */}
          <ThemeToggle size="sm" />

          {/* Reset Demo Session Button */}
          <button
            onClick={handleResetSession}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-sm cursor-pointer border ${
              resetConfirm
                ? "bg-red-600 text-white border-red-500 animate-pulse font-black"
                : "bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30"
            }`}
            title="Reset this session back to pristine demo state"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{resetConfirm ? "Confirm Reset?" : "Reset Demo"}</span>
          </button>

          {/* Minimize Button */}
          <button
            onClick={() => setIsCollapsed(true)}
            title="Minimize role switcher"
            className="p-1 rounded-md text-neutral-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
