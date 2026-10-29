"use client";

import React, { memo } from "react";
import {
  CreditCard,
  CheckCircle2,
  Info,
  SlidersHorizontal,
  Minus,
  Plus,
  Shield,
  Trash2,
} from "lucide-react";
import { getReadableTextColor } from "@/lib/teamColors";
import { openBillingPortal } from "@/lib/billingClient";
import type { LeagueSubscriptionInfo } from "@/lib/leagueContext";

export interface SubTeamItem {
  id: string;
  name: string;
  shortcode?: string;
  primaryColor?: string;
}

export interface LeagueCustomizerSubscriptionTabProps {
  subscription?: LeagueSubscriptionInfo | null;
  isDemoLeague: boolean;
  activeLeagueId: string;
  isComplimentary: boolean;
  isOpeningBilling: boolean;
  setIsOpeningBilling: (val: boolean) => void;
  subSuccessMsg: string;
  targetTeamCount: number;
  setTargetTeamCount: React.Dispatch<React.SetStateAction<number>>;
  isUpdatingSub: boolean;
  handleUpdateSubscriptionCount: (count: number) => void;
  newSubTeamName: string;
  setNewSubTeamName: (val: string) => void;
  isSubmittingNewTeam: boolean;
  handleQuickAddTeam: () => void;
  loadingSubTeams: boolean;
  subTeamsList: SubTeamItem[];
  handleQuickRemoveTeam: (teamId: string, teamName: string) => void;
  closeCustomizer: () => void;
}

export const LeagueCustomizerSubscriptionTab = memo(function LeagueCustomizerSubscriptionTab({
  subscription,
  isDemoLeague,
  activeLeagueId,
  isComplimentary,
  isOpeningBilling,
  setIsOpeningBilling,
  subSuccessMsg,
  targetTeamCount,
  setTargetTeamCount,
  isUpdatingSub,
  handleUpdateSubscriptionCount,
  newSubTeamName,
  setNewSubTeamName,
  isSubmittingNewTeam,
  handleQuickAddTeam,
  loadingSubTeams,
  subTeamsList,
  handleQuickRemoveTeam,
  closeCustomizer,
}: LeagueCustomizerSubscriptionTabProps) {
  return (
    <div className="space-y-6">
      {/* Header / Active Subscription Card */}
      <div data-tour="settings-subscription-summary" className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                League Team Subscription
              </h3>
              <p className="text-xs text-neutral-400">
                Tier Capacity: {subscription?.teamCount || 8} Teams • {subscription?.paymentMethod === "complimentary" ? "Complimentary, no charge" : "$40 base + $20/team per month"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {subscription?.paymentMethod === "paid" && !isDemoLeague && (
              <button
                type="button"
                data-tour="settings-manage-billing"
                disabled={isOpeningBilling}
                onClick={async () => {
                  setIsOpeningBilling(true);
                  try {
                    await openBillingPortal("league", activeLeagueId);
                  } catch (e) {
                    alert(e instanceof Error ? e.message : "Could not open billing.");
                    setIsOpeningBilling(false);
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-white text-neutral-950 hover:bg-neutral-200 disabled:opacity-60 cursor-pointer"
              >
                {isOpeningBilling ? "Opening..." : "Manage billing"}
              </button>
            )}
            <span className="px-3 py-1 rounded-full text-xs font-black font-mono bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active Subscription</span>
            </span>
          </div>
        </div>

        {subSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{subSuccessMsg}</span>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-neutral-900 border border-white/5 space-y-1">
            <div className="text-[10px] uppercase font-bold text-neutral-400">Base Platform Fee</div>
            <div className="text-base font-black text-white font-mono">
              {isComplimentary ? "$0.00 / mo" : "$40.00 / mo"}
            </div>
            <div className="text-[10px] text-neutral-500">
              {isComplimentary ? "Complimentary platform allowance" : "Scheduling, standings and league stats"}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-900 border border-white/5 space-y-1">
            <div className="text-[10px] uppercase font-bold text-neutral-400">
              Team Slots ({targetTeamCount} teams)
            </div>
            <div className="text-base font-black text-emerald-400 font-mono">
              {isComplimentary ? "$0.00 / mo" : `$${targetTeamCount * 20}.00 / mo`}
            </div>
            <div className="text-[10px] text-neutral-500">
              {isComplimentary ? "Included complimentary" : `${targetTeamCount} × $20.00/team per month`}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-900 border border-white/5 space-y-1">
            <div className="text-[10px] uppercase font-bold text-neutral-400">Adjusted Total Monthly</div>
            <div className="text-base font-black text-cyan-400 font-mono">
              {isComplimentary ? "$0.00 / mo" : `$${40 + targetTeamCount * 20}.00 / mo`}
            </div>
            <div className="text-[10px] text-neutral-500">
              {isComplimentary ? "Complimentary — no charges apply" : "Next bill on renewal date"}
            </div>
          </div>
        </div>

        {/* Renewal Notice */}
        <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              {isComplimentary ? (
                <>Account Type: <strong className="text-emerald-400 font-bold">Complimentary Organization (No Charges Apply)</strong></>
              ) : (
                <>
                  Next Monthly Billing Cycle:{" "}
                  <strong className="text-white font-mono">
                    {new Date(subscription?.renewsAt || Date.now() + 30 * 86400000).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </strong>
                </>
              )}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400">
            {isComplimentary ? (
              <strong className="text-emerald-300 font-mono">Complimentary, $0/mo</strong>
            ) : (
              <>Rate at next payment: <strong className="text-cyan-300 font-mono">${40 + targetTeamCount * 20}/mo</strong></>
            )}
          </span>
        </div>
      </div>

      {/* Adjust Team Capacity Section */}
      <div data-tour="settings-slots" className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
              <span>{isComplimentary ? "Adjust Team Capacity" : "Adjust Paid Team Slots"}</span>
            </h4>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isComplimentary ? "Add or remove team capacity. Adjusts your complimentary team allowance." : "Add or remove team capacity. Adjusts your monthly cost by $20 per team at next renewal."}
            </p>
          </div>

          <span className="text-xs font-bold font-mono text-neutral-400">
            Range: 2 to 32 Teams
          </span>
        </div>

        {/* Interactive Stepper */}
        <div className="p-4 rounded-xl bg-black/50 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
            <button
              type="button"
              disabled={targetTeamCount <= 2 || isUpdatingSub}
              onClick={() => setTargetTeamCount((prev) => Math.max(2, prev - 1))}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
              title="Decrease team slot"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="px-5 py-2 rounded-xl bg-neutral-900 border border-white/10 text-center min-w-[130px]">
              <div className="text-lg font-black text-white font-mono">{targetTeamCount} Teams</div>
              <div className="text-[10px] text-neutral-400 font-mono">
                {isComplimentary ? "Complimentary" : `$${40 + targetTeamCount * 20}/mo`}
              </div>
            </div>

            <button
              type="button"
              disabled={targetTeamCount >= 32 || isUpdatingSub}
              onClick={() => setTargetTeamCount((prev) => Math.min(32, prev + 1))}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
              title="Increase team slot"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Slider */}
          <div className="flex-1 w-full sm:max-w-xs space-y-1">
            <input
              type="range"
              min={2}
              max={32}
              step={1}
              value={targetTeamCount}
              onChange={(e) => setTargetTeamCount(Number(e.target.value))}
              aria-label="Team capacity"
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
              <span>{isComplimentary ? "2 teams (Complimentary)" : "2 teams ($80/mo)"}</span>
              <span>{isComplimentary ? "32 teams (Complimentary)" : "32 teams ($680/mo)"}</span>
            </div>
          </div>

          {/* Save button if changed */}
          {targetTeamCount !== (subscription?.teamCount ?? 8) && (
            <button
              type="button"
              disabled={isUpdatingSub}
              onClick={() => handleUpdateSubscriptionCount(targetTeamCount)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
            >
              {isUpdatingSub ? "Updating..." : isComplimentary ? `Confirm ${targetTeamCount} Teams (Complimentary)` : `Confirm ${targetTeamCount} Teams ($${40 + targetTeamCount * 20}/mo)`}
            </button>
          )}
        </div>
      </div>

      {/* Quick Add Team to Subscription */}
      <div data-tour="settings-add-team" className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Add New Team to Subscription {isComplimentary ? "(Complimentary)" : "(+ $20/mo)"}</span>
          </h4>
          <p className="text-xs text-neutral-400 mt-0.5">
            {isComplimentary ? "Create a team and add a team slot. No extra charges apply for complimentary organizations." : "Create a team and add a team slot. For paid plans, the monthly total increases by $20 at your next renewal."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newSubTeamName}
            onChange={(e) => setNewSubTeamName(e.target.value)}
            placeholder={`e.g. Team ${(subscription?.teamCount ?? 8) + 1} or Thunderbirds`}
            aria-label="New team name"
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-cyan-400 text-white text-xs outline-none transition-colors"
          />

          <button
            type="button"
            disabled={isSubmittingNewTeam}
            onClick={handleQuickAddTeam}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmittingNewTeam ? "Adding..." : isComplimentary ? "Add Team (Complimentary)" : "Add Team to Subscription (+$20/mo)"}</span>
          </button>
        </div>
      </div>

      {/* Active Teams in League with Direct Removal */}
      <div data-tour="settings-current-teams" className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Current League Teams ({subTeamsList.length})</span>
            </h4>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isComplimentary
                ? "Removing a team deletes its team record and reduces capacity by one. No charges apply."
                : "Removing a team deletes its team record and reduces paid capacity by one. The $20 monthly reduction applies at your next renewal."}
            </p>
          </div>
        </div>

        {loadingSubTeams ? (
          <div className="py-6 text-center text-xs text-neutral-400">Loading teams...</div>
        ) : subTeamsList.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-400">No teams found in this league.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:max-h-72 sm:overflow-y-auto sm:pr-1">
            {subTeamsList.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-3 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-black font-mono shrink-0 tracking-tighter ${(t.shortcode?.length ?? 0) > 3 ? "text-[10px]" : "text-xs"}`}
                    style={{ backgroundColor: t.primaryColor || "#3ca505", color: getReadableTextColor(t.primaryColor || "#3ca505", "#ffffff") }}
                  >
                    {t.shortcode ? t.shortcode.slice(0, 4) : t.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{t.name}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      {t.shortcode || "TEAM"}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isUpdatingSub}
                  onClick={() => handleQuickRemoveTeam(t.id, t.name)}
                  className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  title={isComplimentary ? "Remove team" : "Remove team and lower monthly fee"}
                  aria-label={`Remove ${t.name}${isComplimentary ? "" : " (-$20/mo)"}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isComplimentary ? "Remove" : "Remove (-$20/mo)"}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div data-tour="settings-subscription-close" className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
        <div className="text-[11px] text-neutral-400 flex items-center gap-2 font-mono">
          <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{isComplimentary ? "Complimentary organization: team changes never add charges." : <>Adjusted fees apply at your next billing statement on {new Date(subscription?.renewsAt || Date.now() + 30 * 86400000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.</>}</span>
        </div>
        <button
          type="button"
          onClick={closeCustomizer}
          className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
});

export default LeagueCustomizerSubscriptionTab;

