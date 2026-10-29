"use client";

import React, { memo } from "react";
import {
  Calendar,
  Archive,
  AlertTriangle,
} from "lucide-react";
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
  startNewSeason: (title: string) => Promise<unknown>;
  resumeSubscription: () => Promise<unknown>;
  setSaveError: (val: string) => void;
  describeSaveError: (err: unknown) => string;
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
  setSaveError,
  describeSaveError,
}: LeagueCustomizerSeasonTabProps) {
  return (
    <div className="space-y-6">
      {/* Header / Current Season Status Card */}
      <div data-tour="settings-season-status" className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                {settings.seasonTitle || "Current Season"}
              </h3>
              <p className="text-xs text-neutral-400">
                Save season results, pause the league or start the next season
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSubscriptionPastDue ? (
              <span className="px-3 py-1 rounded-full text-xs font-black font-mono bg-amber-500/20 border border-amber-400/40 text-amber-300">
                Payment Past Due
              </span>
            ) : isLeagueArchived ? (
              <span className="px-3 py-1 rounded-full text-xs font-black font-mono bg-neutral-500/20 border border-neutral-400/40 text-neutral-300">
                Concluded &amp; Archived
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-black font-mono bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                Active Regulation Season
              </span>
            )}
          </div>
        </div>

        {/* Status details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-neutral-900 border border-white/5">
            <div className="text-[10px] uppercase font-bold text-neutral-400">Subscription Status</div>
            <div className="text-sm font-black text-white capitalize mt-0.5">{subscription?.status || "Active"}</div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-900 border border-white/5">
            <div className="text-[10px] uppercase font-bold text-neutral-400">Monthly Licensing</div>
            <div className="text-sm font-black text-cyan-400 font-mono mt-0.5">
              {subscription?.paymentMethod === "complimentary" ? "Complimentary" : `$${subscription?.totalMonthlyFee || 40 + (subscription?.teamCount || 8) * 20}/mo`}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-900 border border-white/5">
            <div className="text-[10px] uppercase font-bold text-neutral-400">Access Mode</div>
            <div className="text-sm font-black text-white mt-0.5">
              {isLeagueArchived || isSubscriptionPastDue ? "Read-Only (Viewer)" : "Full Read/Write"}
            </div>
          </div>
        </div>
      </div>

      {/* Archival Actions */}
      {seasonStartedMsg && (
        <p role="status" className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-300">
          {seasonStartedMsg}
        </p>
      )}
      {!isLeagueArchived && !isSubscriptionPastDue && (
        <div data-tour="settings-archive" className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
              <Archive className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase tracking-wider text-white">End the Season</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                When the championship game is final, end the season. Final standings, box scores, player stats and the champion are saved permanently, and everyone in the league can browse them later under Stats &gt; History and on player profiles.
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
                <div className="text-xs font-black uppercase text-[var(--text-primary)]">
                  What happens next?
                </div>
                <p className="text-xs text-neutral-300">
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
                  className="p-3.5 rounded-xl bg-black/60 border border-white/10 hover:border-purple-400 text-left transition-all cursor-pointer group"
                >
                  <div className="text-xs font-black uppercase text-[var(--text-primary)]">
                    1. Pause the League
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-1">
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
                  className={`p-3.5 rounded-xl bg-black/60 border text-left transition-all cursor-pointer group ${
                    newSeasonTitle !== null ? "border-cyan-400" : "border-cyan-500/30 hover:border-cyan-400"
                  }`}
                >
                  <div className="text-xs font-black uppercase text-[var(--text-primary)]">
                    2. Start the Next Season
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-1">
                    Saves this season&apos;s final standings, stats and champion to League History, then starts a fresh season with the same teams and rosters. Your subscription stays active.
                  </div>
                </button>
              </div>

              {newSeasonTitle !== null && (
                <form
                  data-tour="settings-new-season"
                  className="p-4 rounded-xl bg-black/40 border border-cyan-500/30 space-y-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const title = newSeasonTitle.trim();
                    if (!title) {
                      setSaveError("Give the new season a name.");
                      return;
                    }
                    setArchivingInProgress(true);
                    setSaveError("");
                    try {
                      await startNewSeason(title);
                      setNewSeasonTitle(null);
                      setShowArchivePrompt(false);
                      setSeasonStartedMsg(`${title} has started. Past seasons are in Stats > History.`);
                    } catch (err) {
                      setSaveError(describeSaveError(err));
                    }
                    setArchivingInProgress(false);
                  }}
                >
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">New season name</span>
                    <input
                      type="text"
                      value={newSeasonTitle}
                      maxLength={80}
                      onChange={(event) => setNewSeasonTitle(event.target.value)}
                      placeholder="e.g. Spring 2027"
                      className="w-full rounded-lg bg-neutral-950 border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </label>
                  <p className="text-[11px] text-neutral-400">
                    The current schedule and play-by-play are locked once the new season starts. Schedule the new season&apos;s games from the Schedule page.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={archivingInProgress}
                      className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                      {archivingInProgress ? "Starting..." : "Start season"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewSeasonTitle(null)}
                      className="px-4 py-2 rounded-lg border border-white/15 text-xs font-bold text-neutral-300 hover:text-white cursor-pointer"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}

              <button
                type="button"
                onClick={() => { setShowArchivePrompt(false); setNewSeasonTitle(null); }}
                className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* If Archived */}
      {isLeagueArchived && !isSubscriptionPastDue && (
        <div data-tour="settings-season-resume" className="p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-4">
          <div className="flex items-center gap-3 text-cyan-400">
            <Archive className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">This League Is Currently Archived (Read-Only)</span>
          </div>
          <p className="text-xs text-neutral-400">
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
            className="py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Reactivate League / Start Next Season
          </button>
        </div>
      )}

      {/* If Past Due */}
      {isSubscriptionPastDue && (
        <div data-tour="settings-season-payment" className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-4">
          <div className="flex items-center gap-3 text-amber-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Payment Declined / Past Due</span>
          </div>
          <p className="text-xs text-neutral-300">
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
            className="py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Update Payment &amp; Resume Subscription
          </button>
        </div>
      )}
    </div>
  );
});

export default LeagueCustomizerSeasonTab;
