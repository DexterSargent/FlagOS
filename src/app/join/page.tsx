"use client";

import { usePageGuide } from "@/lib/pageGuide";
import { JOIN_LEAGUE_WALKTHROUGH } from "@/lib/walkthroughs/public";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { createSecureRecord } from "@/lib/secureWrites";
import { Check, Search, Shield, UserPlus, ArrowRight, Mail, Lock } from "lucide-react";
import { useLeague } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import { renderFlagOS } from "@/components/FlagOSText";
import { getSandboxPlayers, addSandboxPlayer } from "@/lib/demoSandbox";

const POSITIONS = ["QB", "WR", "RB", "C", "DB", "RUSH", "LB", "ATH"];

interface Player {
  id: string;
  playerName: string;
  teamId: string;
}

export default function JoinLeague() {
  usePageGuide(JOIN_LEAGUE_WALKTHROUGH);
  const { settings, isDemoLeague, activeLeagueId } = useLeague();
  const { isPlayer, playerData, isLeagueAdmin, role, canRegisterAsPlayer, managedTeamId } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [experience, setExperience] = useState("Beginner (0-1 years)");
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);

  // Teammate Selection
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<Player[]>([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      if (isDemoLeague) {
        const pData = getSandboxPlayers() as unknown as Player[];
        const filtered = pData.filter(p => p.teamId !== "Free Agent" && p.teamId !== "team_free_agents");
        filtered.sort((a, b) => a.playerName.localeCompare(b.playerName));
        setPlayers(filtered);
        setLoading(false);
        return;
      }
      try {
        const snap = await getDocs(query(
          collection(db, "players"),
          where("leagueId", "==", activeLeagueId),
          limit(1920),
        ));
        const pData = snap.docs.map(d => ({ ...d.data(), id: d.id } as Player));
        // Sort alphabetically and exclude current free agents from the search list
        const filtered = pData.filter(p => p.teamId !== "Free Agent");
        filtered.sort((a, b) => a.playerName.localeCompare(b.playerName));
        setPlayers(filtered);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchPlayers();
  }, [isDemoLeague, activeLeagueId]);

  const handleToggleFriend = (player: Player) => {
    if (selectedFriends.find(p => p.id === player.id)) {
      setSelectedFriends(selectedFriends.filter(p => p.id !== player.id));
    } else {
      if (selectedFriends.length < 5) {
        setSelectedFriends([...selectedFriends, player]);
      }
    }
  };

  const togglePosition = (pos: string) => {
    if (selectedPositions.includes(pos)) {
      setSelectedPositions(selectedPositions.filter((p) => p !== pos));
    } else {
      setSelectedPositions([...selectedPositions, pos]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    if (isDemoLeague) {
      const finalPositions = selectedPositions.length > 0 ? selectedPositions : ["ATH"];
      addSandboxPlayer({
        playerName: name.trim(),
        teamId: "",
        email: email.trim(),
        experience,
        positions: finalPositions,
        position: finalPositions[0] || "ATH",
        preferredTeammateNames: selectedFriends.map(f => f.playerName),
        status: "Free Agent",
      });
      setSubmitting(false);
      setRegistered(true);
      return;
    }

    try {
      const finalPositions = selectedPositions.length > 0 ? selectedPositions : ["ATH"];

      // Add the athlete to the unassigned Free Agent player pool (no team)
      await createSecureRecord("player", {
        playerName: name.trim(),
        teamId: "",
        leagueId: activeLeagueId,
        email: email.trim(),
        emails: email.trim() ? [email.trim().toLowerCase()] : [],
        experience,
        positions: finalPositions,
        position: finalPositions[0] || "ATH",
        preferredTeammates: selectedFriends.map(f => f.id),
        preferredTeammateNames: selectedFriends.map(f => f.playerName),
        status: "Free Agent",
        joinedAt: new Date().toISOString()
      });

      setSubmitting(false);
      setRegistered(true);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const filteredPlayers = players.filter(p => p.playerName.toLowerCase().includes(searchQuery.toLowerCase()));

  if (registered) {
    return (
      <div data-tour="join-success" className="min-h-screen bg-[#07090E] text-white font-sans flex flex-col justify-center items-center px-4">
        <div role="status" className="max-w-md w-full mx-auto p-8 text-center bg-[#0B0F19] border border-emerald-500/30 rounded-3xl shadow-2xl space-y-5 my-20">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Check className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase text-white">You&apos;re Registered</h1>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              {name.trim() || "You"} {name.trim() ? "is" : "are"} now in the {settings.leagueName || "league"} free-agent pool.
              {isDemoLeague ? " (Demo: this is only saved in this browser session.)" : ""}
            </p>
          </div>
          <div className="text-left rounded-2xl bg-white/5 border border-white/10 p-4 text-xs text-neutral-300 space-y-2">
            <div className="font-bold uppercase tracking-wider text-[11px] text-neutral-400">What happens next</div>
            <ol className="list-decimal pl-4 space-y-1">
              <li>The league organizer reviews free agents and places you on a team.</li>
              <li>{email.trim() ? <>You&apos;ll be contacted at <strong>{email.trim()}</strong>.</> : "Your organizer will reach out once you're placed. Adding an email helps them contact you."}</li>
              <li>Once you&apos;re on a roster, sign in with that same email to see your team, schedule and stats.</li>
            </ol>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/schedule" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider">
              View Schedule <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/teams" className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 font-bold text-xs uppercase tracking-wider border border-white/10">
              Browse Teams
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // NOT ELIGIBLE FOR FREE AGENT JOIN (ALREADY AN ADMIN, TEAM ADMIN, OR ROSTERED PLAYER)
  if (!canRegisterAsPlayer) {
    return (
      <div data-tour="join-status" className="min-h-screen bg-[#07090E] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col justify-center items-center">
        <div className="max-w-md mx-auto my-auto p-8 text-center bg-[#0B0F19] border border-cyan-500/30 rounded-3xl shadow-2xl space-y-6 my-20">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Check className="w-8 h-8" />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              {isLeagueAdmin ? "League Administrator" : role === "team_admin" ? "Team Administrator" : "Rostered Player"}
            </span>
            <h1 className="text-2xl font-black uppercase text-white mt-3">
              {isPlayer ? "Already In The League" : "Role Already Assigned"}
            </h1>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              {isPlayer ? (
                <>You are already registered in the league as <strong>#{playerData?.number || "00"} {playerData?.playerName || "Player"}</strong>. You do not need to register again.</>
              ) : isLeagueAdmin ? (
                <>You are currently logged in as the <strong>League Commissioner / Admin</strong>. You do not need to register as a player.</>
              ) : (
                <>You are currently assigned as a <strong>Team Administrator</strong> in the league.</>
              )}
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            {isPlayer && (
              <Link
                href="/profile"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20"
              >
                <span>View Player Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            <Link
              href={managedTeamId ? `/teams/${managedTeamId}` : "/teams"}
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10"
            >
              {managedTeamId ? "Go to My Team" : "Browse Teams"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // REGISTRATION CLOSED NOTICE IF TOGGLED OFF BY ADMIN (Only viewable by league admin if turned off, and viewable to all if turned on)
  if (settings.rules?.enableFreeAgents === false && !isLeagueAdmin) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col justify-center items-center">
        <div className="max-w-md mx-auto my-auto p-8 text-center bg-[#0B0F19] border border-white/10 rounded-3xl shadow-2xl space-y-6 my-20">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              Registration Closed
            </span>
            <h1 data-tour="join-status" className="text-2xl font-black uppercase text-white mt-3">Player Registration Closed</h1>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Online free agent registration is currently disabled by the league commissioner. Please contact the league office or check back for upcoming tournament sign-ups.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/teams"
              className="inline-flex px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg"
            >
              Browse Active Teams
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col justify-between">

      {/* Background Glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-cyan-900/15 rounded-full blur-[200px]"></div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-12 flex-1 relative z-10 flex flex-col justify-center">
        <div className="w-full bg-[#0B0F19] backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="bg-cyan-500/10 border-b border-white/5 p-6 sm:p-8 flex items-center justify-center flex-col text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center bg-transparent mb-4 overflow-hidden p-1"
            >
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.leagueName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              ) : (
                <UserPlus className="w-8 h-8 text-white" />
              )}
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                {settings.seasonTitle || "Active Season"} Registration
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
              Join {renderFlagOS(settings.leagueName)}
            </h1>
            <p className="text-neutral-400 text-xs md:text-sm mt-1 max-w-md">
              {settings.tagline || "Register below so league and team admins can find you in the free-agent pool."}
            </p>
            {settings.contactEmail && (
              <span className="text-[11px] font-mono text-cyan-400 mt-2 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                <span>Contact Commissioner: {settings.contactEmail}</span>
              </span>
            )}

            {settings.rules?.enableFreeAgents === false && isLeagueAdmin && (
              <div className="mt-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3 text-left w-full">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    <strong>Admin Preview Mode:</strong> Player registration is closed. As a league admin, you can still preview this form.
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold shrink-0">
                  Admin Only
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            <div className="space-y-5">
              <div data-tour="join-identity" className="space-y-5">
                <div>
                  <label htmlFor="join-full-name" className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">
                    Full Name *
                  </label>
                  <input
                    id="join-full-name"
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya Jenkinson"
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-base font-semibold focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="join-email-address" className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">
                      Email Address *
                    </label>
                    <input
                      id="join-email-address"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="athlete@example.com"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-cyan-400 transition-colors font-mono text-sm"
                    />
                    <span className="text-[10px] text-neutral-500 mt-1 block">
                      Used to log in as a Player and view your profile & stats.
                    </span>
                  </div>

                  <div>
                    <label htmlFor="join-experience-level" className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">
                      Experience Level
                    </label>
                    <select
                      id="join-experience-level"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer"
                    >
                      <option>Beginner (0-1 years)</option>
                      <option>Intermediate (2-4 years)</option>
                      <option>Advanced (5+ years)</option>
                      <option>Veteran Competitor</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Positions Selection */}
              <div data-tour="join-positions">
                <label className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">
                  Position(s) You Want to Play (Select all that apply)
                </label>
                <div className="flex flex-wrap gap-2">
                  {POSITIONS.map((pos) => {
                    const isSelected = selectedPositions.includes(pos);
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => togglePosition(pos)}
                        className={`min-h-10 min-w-10 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? "bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/20 font-black"
                            : "bg-black/60 text-neutral-400 border-white/10 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {pos}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[10px] text-neutral-500 mt-1.5 block">
                  Select your primary and secondary positions (e.g. WR, DB, Rusher, Center).
                </span>
              </div>
            </div>

            {/* Teammates Selection */}
            <div data-tour="join-teammates" className="pt-6 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                  Preferred Teammates
                </label>
                <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                  {selectedFriends.length} / 5 Selected
                </span>
              </div>
              <p className="text-xs text-neutral-500 mb-4">
                Select up to 5 current players in the league you would like to be paired with on draft day.
              </p>

              <div className="bg-black border border-white/10 rounded-2xl overflow-hidden flex flex-col h-64">
                <div className="flex items-center px-4 border-b border-white/10 bg-neutral-900/50">
                  <Search className="w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    id="join-player-search"
                    aria-label="Search for players"
                    placeholder="Search for players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none px-3 py-3 text-xs focus:outline-none text-white"
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {loading ? (
                    <div className="flex items-center justify-center h-full text-neutral-500 text-xs">
                      Loading players...
                    </div>
                  ) : filteredPlayers.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-neutral-500 text-xs">
                      No players found.
                    </div>
                  ) : (
                    filteredPlayers.map(player => {
                      const isSelected = selectedFriends.find(p => p.id === player.id);
                      const isDisabled = !isSelected && selectedFriends.length >= 5;
                      return (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => handleToggleFriend(player)}
                          disabled={isDisabled}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                            isSelected
                              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                              : isDisabled
                              ? "opacity-40 cursor-not-allowed text-neutral-500"
                              : "hover:bg-white/5 text-neutral-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-white/5'}`}>
                              <Shield className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-semibold">{player.playerName}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div data-tour="join-submit" className="pt-4">
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
              >
                {submitting ? "Registering Free Agent..." : "Submit Registration"}
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}
