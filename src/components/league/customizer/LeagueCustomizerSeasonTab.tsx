"use client";

import React, { memo, useEffect, useState } from "react";
import {
  Calendar,
  Archive,
  AlertTriangle,
  Users,
} from "lucide-react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isRealTeam } from "@/components/TeamAssets";
import { isDemoLeague, getSandboxTeams } from "@/lib/demoSandbox";
import type { LeagueSettings, LeagueSubscriptionInfo } from "@/lib/leagueContext";
import type { LeagueSeason } from "@/lib/leagueSeasons";

export interface LeagueCustomizerSeasonTabProps {
  settings: LeagueSettings;
  subscription?: LeagueSubscriptionInfo | null;
  isSubscriptionPastDue: boolean;
  isLeagueArchived: boolean;
  seasonStartedMsg: string;
  setSeasonStartedMsg: (val: string) => void;
  showArchivePrompt: boolean;
  setShowArchivePrompt: (val: boolean) => void;
  archivingInProgress: boolean;
  setArchivingInProgress: (val: boolean) => void;
  archiveLeague: (action: "pause_subscription") => Promise<unknown>;
  newSeasonTitle: string | null;
  setNewSeasonTitle: (val: string | null) => void;
  seasons: LeagueSeason[];
  startNewSeason: (
    title: string,
    options?: { teamSelectionMode?: "keep_all" | "select_teams" | "new_teams"; retainedTeamIds?: string[] }
  ) => Promise<unknown>;
  resumeSubscription: () => Promise<unknown>;
  leagueId?: string;
  setSaveError: (val: string) => void;
  describeSaveError: (err: unknown) => string;
}

interface LeagueTeamOption {
  id: string;
  name: string;
  shortcode?: string;
  primaryColor?: string;
}

export const LeagueCustomizerSeasonTab = memo(function LeagueCustomizerSeasonTab({
  settings,
  subscription,
  isSubscriptionPastDue,
  isLeagueArchived,
  seasonStartedMsg,
  setSeasonStartedMsg,
  showArchivePrompt,
  setShowArchivePrompt,
  archivingInProgress,
  setArchivingInProgress,
  archiveLeague,
  newSeasonTitle,
  setNewSeasonTitle,
  seasons,
  startNewSeason,
  resumeSubscription,
  leagueId,
  setSaveError,
  describeSaveError,
}: LeagueCustomizerSeasonTabProps) {
  const [teamSelectionMode, setTeamSelectionMode] = useState<"keep_all" | "select_teams" | "new_teams">("keep_all");
  const [leagueTeams, setLeagueTeams] = useState<LeagueTeamOption[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Load league teams when new season workflow is active
  useEffect(() => {
    if (!leagueId || newSeasonTitle === null) return;
    let cancelled = false;

    async function loadTeams() {
      setLoadingTeams(true);
      try {
        if (isDemoLeague(leagueId)) {
          const demoTeams = (getSandboxTeams() as unknown as LeagueTeamOption[]).filter(isRealTeam);
          if (!cancelled) {
            setLeagueTeams(demoTeams);
            setSelectedTeamIds(demoTeams.map((t) => t.id));
          }
        } else {
          const snap = await getDocs(
            query(collection(db, "teams"), where("leagueId", "==", leagueId), limit(64))
          );
          if (!cancelled) {
            const list: LeagueTeamOption[] = snap.docs
              .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
              .filter(isRealTeam);
            setLeagueTeams(list);
            setSelectedTeamIds(list.map((t) => t.id));
          }
        }
      } catch (err) {
        console.warn("Failed to load league teams for season rollover:", err);
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    }

    void loadTeams();
    return () => {
      cancelled = true;
    };
  }, [leagueId, newSeasonTitle]);

  const toggleTeamSelected = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const selectAllTeams = () => setSelectedTeamIds(leagueTeams.map((t) => t.id));
  const deselectAllTeams = () => setSelectedTeamIds([]);

  return (
    <div className="space-y-6">
      {/* Header / Current Season Status Card */}
      <div data-tour="settings-season-status" className="p-5 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                {settings.seasonTitle || "Current Season"}
              </h3>
              <p className="text-xs text-slate-600 dark:text-neutral-400">
                Save season results, pause the league or start the next season
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSubscriptionPastDue ? (
              <span className="px-3 py-1 rounded-full text-xs font-black font-mono bg-amber-500/20 border border-amber-400/40 text-amber-700 dark:text-amber-300">
                Payment Past Due
              </span>
            ) : isLeagueArchived ? (
              <span className="px-3 py-1 rounded-full text-xs font-black font-mono bg-neutral-500/20 border border-neutral-400/40 text-neutral-700 dark:text-neutral-300">
                Concluded &amp; Archived
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-black font-mono bg-emerald-500/20 border border-emerald-400/40 text-emerald-700 dark:text-emerald-300">
                Active Regulation Season
              </span>
            )}
          </div>
        </div>

        {/* Status details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/5 shadow-xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-neutral-400">Subscription Status</div>
            <div className="text-sm font-black text-slate-900 dark:text-white capitalize mt-0.5">{subscription?.status || "Active"}</div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/5 shadow-xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-neutral-400">Monthly Licensing</div>
            <div className="text-sm font-black text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">
              {subscription?.paymentMethod === "complimentary" ? "Complimentary" : `$${subscription?.totalMonthlyFee || 40 + (subscription?.teamCount || 8) * 20}/mo`}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/5 shadow-xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-neutral-400">Access Mode</div>
            <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
              {isLeagueArchived || isSubscriptionPastDue ? "Read-Only (Viewer)" : "Full Read/Write"}
            </div>
          </div>
        </div>
      </div>

      {/* Archival Actions */}
      {seasonStartedMsg && (
        <p role="status" className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          {seasonStartedMsg}
        </p>
      )}
      {!isLeagueArchived && !isSubscriptionPastDue && (
        <div data-tour="settings-archive" className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
              <Archive className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">End the Season</h4>
              <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                When the championship game is final, end the season. Final standings, box scores, player stats and the champion are saved permanently, and everyone in the league can browse them under Stats &gt; History and on player profiles.
              </p>
            </div>
          </div>

          {!showArchivePrompt ? (
            <button
              type="button"
              onClick={() => { setShowArchivePrompt(true); setSeasonStartedMsg(""); }}
              className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
            >
              End Season
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-purple-500/[0.06] border border-purple-500/30 space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <div className="text-xs font-black uppercase text-slate-900 dark:text-white">
                  What happens next?
                </div>
                <p className="text-xs text-slate-600 dark:text-neutral-300">
                  Pause the league until you&apos;re ready, or start the next season right away.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={archivingInProgress}
                  onClick={async () => {
                    setArchivingInProgress(true);
                    setSaveError("");
                    try {
                      await archiveLeague("pause_subscription");
                      setShowArchivePrompt(false);
                    } catch (err) {
                      setSaveError(describeSaveError(err));
                    }
                    setArchivingInProgress(false);
                  }}
                  className="p-3.5 rounded-xl bg-white dark:bg-black/60 border border-slate-200 dark:border-white/10 hover:border-purple-400 text-left transition-all cursor-pointer group shadow-xs"
                >
                  <div className="text-xs font-black uppercase text-slate-900 dark:text-white">
                    1. Pause the League
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 leading-relaxed">
                    Makes the league read-only and stops monthly charges. Everything stays viewable. When you resume, you can start the next season from here.
                  </div>
                </button>

                <button
                  type="button"
                  disabled={archivingInProgress}
                  onClick={() => {
                    setSaveError("");
                    setNewSeasonTitle(`Season ${seasons.length + 1}`);
                  }}
                  aria-expanded={newSeasonTitle !== null}
                  className={`p-3.5 rounded-xl bg-white dark:bg-black/60 border text-left transition-all cursor-pointer group shadow-xs ${
                    newSeasonTitle !== null ? "border-cyan-500 ring-2 ring-cyan-500/20" : "border-slate-200 dark:border-cyan-500/30 hover:border-cyan-500"
                  }`}
                >
                  <div className="text-xs font-black uppercase text-slate-900 dark:text-white">
                    2. Start the Next Season
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 leading-relaxed">
                    Saves this season&apos;s final standings, stats and champion to League History, then starts a fresh season. You choose whether to keep current teams or add new ones.
                  </div>
                </button>
              </div>

              {newSeasonTitle !== null && (
                <form
                  data-tour="settings-new-season"
                  className="p-4 rounded-xl bg-slate-50 dark:bg-black/40 border border-cyan-500/30 space-y-4"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const title = newSeasonTitle.trim();
                    if (!title) {
                      setSaveError("Give the new season a name.");
                      return;
                    }
                    if (teamSelectionMode === "select_teams" && selectedTeamIds.length === 0) {
                      setSaveError("Select at least one returning team, or choose 'Start Fresh With New Teams'.");
                      return;
                    }

                    setArchivingInProgress(true);
                    setSaveError("");
                    try {
                      await startNewSeason(title, {
                        teamSelectionMode,
                        retainedTeamIds: teamSelectionMode === "select_teams" ? selectedTeamIds : undefined,
                      });
                      setNewSeasonTitle(null);
                      setShowArchivePrompt(false);
                      setSeasonStartedMsg(`${title} has started. Past seasons are permanently saved in Stats > History.`);
                    } catch (err) {
                      setSaveError(describeSaveError(err));
                    }
                    setArchivingInProgress(false);
                  }}
                >
                  {/* Season Name */}
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300">New season name</span>
                    <input
                      type="text"
                      value={newSeasonTitle}
                      maxLength={80}
                      onChange={(event) => setNewSeasonTitle(event.target.value)}
                      placeholder="e.g. Spring 2027"
                      className="w-full rounded-lg bg-white dark:bg-neutral-950 border border-slate-300 dark:border-white/15 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                  </label>

                  {/* Team Continuity Options Prompt */}
                  <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        Team Continuity for New Season
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-neutral-400">
                      Do you want to use the same teams in the new season or bring in new teams?
                    </p>

                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {/* Option 1: Keep All */}
                      <label
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          teamSelectionMode === "keep_all"
                            ? "bg-cyan-500/10 border-cyan-500 text-slate-900 dark:text-white ring-1 ring-cyan-500/30"
                            : "bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-700 dark:text-neutral-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="teamSelectionMode"
                          value="keep_all"
                          checked={teamSelectionMode === "keep_all"}
                          onChange={() => setTeamSelectionMode("keep_all")}
                          className="mt-0.5 text-cyan-600 focus:ring-cyan-500"
                        />
                        <div className="space-y-0.5">
                          <div className="text-xs font-black uppercase">Keep All Teams (Recommended)</div>
                          <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                            Carries over all {leagueTeams.length || subscription?.teamCount || 8} current teams and rosters into the new season.
                          </div>
                        </div>
                      </label>

                      {/* Option 2: Select Returning Teams */}
                      <label
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          teamSelectionMode === "select_teams"
                            ? "bg-cyan-500/10 border-cyan-500 text-slate-900 dark:text-white ring-1 ring-cyan-500/30"
                            : "bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-700 dark:text-neutral-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="teamSelectionMode"
                          value="select_teams"
                          checked={teamSelectionMode === "select_teams"}
                          onChange={() => setTeamSelectionMode("select_teams")}
                          className="mt-0.5 text-cyan-600 focus:ring-cyan-500"
                        />
                        <div className="space-y-0.5 flex-1">
                          <div className="text-xs font-black uppercase">Select Returning Teams</div>
                          <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                            Choose which existing teams are returning. Unselected teams leave the active league, while their past achievements stay in history.
                          </div>
                        </div>
                      </label>

                      {/* Checklist if Select Returning Teams is active */}
                      {teamSelectionMode === "select_teams" && (
                        <div className="ml-6 p-3 rounded-xl bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-white/10 space-y-2">
                          <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-white/5">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-neutral-300">
                              Returning Teams ({selectedTeamIds.length} of {leagueTeams.length})
                            </span>
                            <div className="flex gap-2 text-[10px]">
                              <button
                                type="button"
                                onClick={selectAllTeams}
                                className="text-cyan-600 dark:text-cyan-400 hover:underline font-bold"
                              >
                                Select All
                              </button>
                              <span className="text-slate-300 dark:text-neutral-600">|</span>
                              <button
                                type="button"
                                onClick={deselectAllTeams}
                                className="text-slate-500 hover:underline"
                              >
                                Clear All
                              </button>
                            </div>
                          </div>

                          {loadingTeams ? (
                            <p className="text-[11px] text-slate-400 py-2">Loading teams...</p>
                          ) : leagueTeams.length === 0 ? (
                            <p className="text-[11px] text-slate-400 py-2">No existing teams found in this league.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                              {leagueTeams.map((team) => {
                                const isChecked = selectedTeamIds.includes(team.id);
                                return (
                                  <label
                                    key={team.id}
                                    className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                      isChecked
                                        ? "bg-cyan-500/10 border-cyan-500/40 text-slate-900 dark:text-white font-medium"
                                        : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-500 dark:text-neutral-400"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleTeamSelected(team.id)}
                                      className="rounded text-cyan-600 focus:ring-cyan-500"
                                    />
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0"
                                      style={{ backgroundColor: team.primaryColor || "#38bdf8" }}
                                    />
                                    <span className="truncate">{team.name}</span>
                                    {team.shortcode && (
                                      <span className="text-[10px] text-slate-400 uppercase font-mono ml-auto">
                                        {team.shortcode}
                                      </span>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Option 3: Start Fresh With New Teams */}
                      <label
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          teamSelectionMode === "new_teams"
                            ? "bg-cyan-500/10 border-cyan-500 text-slate-900 dark:text-white ring-1 ring-cyan-500/30"
                            : "bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-700 dark:text-neutral-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="teamSelectionMode"
                          value="new_teams"
                          checked={teamSelectionMode === "new_teams"}
                          onChange={() => setTeamSelectionMode("new_teams")}
                          className="mt-0.5 text-cyan-600 focus:ring-cyan-500"
                        />
                        <div className="space-y-0.5">
                          <div className="text-xs font-black uppercase">Start Fresh With New Teams</div>
                          <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                            Detaches all current teams so you can register a new set of teams. Past season champions and standings are preserved.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    The current schedule and games lock once the new season starts. You can schedule the new season&apos;s games from the Schedule page.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={archivingInProgress}
                      className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-md"
                    >
                      {archivingInProgress ? "Starting..." : "Start season"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewSeasonTitle(null)}
                      className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-white/15 text-xs font-bold text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}

              <button
                type="button"
                onClick={() => { setShowArchivePrompt(false); setNewSeasonTitle(null); }}
                className="text-xs text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* If Archived */}
      {isLeagueArchived && !isSubscriptionPastDue && (
        <div data-tour="settings-season-resume" className="p-5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-white/10 space-y-4">
          <div className="flex items-center gap-3 text-cyan-600 dark:text-cyan-400">
            <Archive className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">This League Is Currently Archived (Read-Only)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-neutral-400">
            All match statistics, scores, player records, and rosters are viewable by players and public fans. Administrative writing is disabled.
          </p>
          <button
            type="button"
            onClick={async () => {
              setSaveError("");
              try {
                await resumeSubscription();
              } catch (err) {
                setSaveError(describeSaveError(err));
              }
            }}
            className="py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
          >
            Reactivate League / Start Next Season
          </button>
        </div>
      )}

      {/* If Past Due */}
      {isSubscriptionPastDue && (
        <div data-tour="settings-season-payment" className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/30 space-y-4">
          <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Payment Declined / Past Due</span>
          </div>
          <p className="text-xs text-amber-900 dark:text-neutral-300">
            Administrative access and database writes are temporarily suspended. Public viewer access remains active. Update payment to resume immediately.
          </p>
          <button
            type="button"
            onClick={async () => {
              setSaveError("");
              try {
                await resumeSubscription();
              } catch (err) {
                setSaveError(describeSaveError(err));
              }
            }}
            className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
          >
            Update Payment &amp; Resume Subscription
          </button>
        </div>
      )}
    </div>
  );
});

export default LeagueCustomizerSeasonTab;
