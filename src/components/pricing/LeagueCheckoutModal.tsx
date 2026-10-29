"use client";

import React, { memo } from "react";
import { X, Building2, CreditCard, Upload, ImageIcon } from "lucide-react";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";
import { FLAGOS_LOGO } from "@/lib/brandTokens";

export interface LeagueCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  leagueName: string;
  setLeagueName: (v: string) => void;
  leagueShortcode: string;
  setLeagueShortcode: (v: string) => void;
  leagueLogoUrl: string;
  setLeagueLogoUrl: (v: string) => void;
  leaguePrimaryColor: string;
  setLeaguePrimaryColor: (v: string) => void;
  leagueSecondaryColor: string;
  setLeagueSecondaryColor: (v: string) => void;
  leagueTertiaryColor: string;
  setLeagueTertiaryColor: (v: string) => void;
  teamCount: number;
  setTeamCount: (v: number) => void;
  finishingLeague: boolean;
  paidPurchase: any;
  baseLeagueFee: number;
  perTeamFee: number;
  usesCheckout: boolean;
  isSubmittingLeague: boolean;
  checkoutError: string;
  handleSubscribeLeague: (e: React.FormEvent) => void;
}

export const LeagueCheckoutModal = memo(function LeagueCheckoutModal({
  isOpen,
  onClose,
  leagueName,
  setLeagueName,
  leagueShortcode,
  setLeagueShortcode,
  leagueLogoUrl,
  setLeagueLogoUrl,
  leaguePrimaryColor,
  setLeaguePrimaryColor,
  leagueSecondaryColor,
  setLeagueSecondaryColor,
  leagueTertiaryColor,
  setLeagueTertiaryColor,
  teamCount,
  setTeamCount,
  finishingLeague,
  paidPurchase,
  baseLeagueFee,
  perTeamFee,
  usesCheckout,
  isSubmittingLeague,
  checkoutError,
  handleSubscribeLeague,
}: LeagueCheckoutModalProps) {
  if (!isOpen) return null;

  const totalLeagueMonthly = baseLeagueFee + teamCount * perTeamFee;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div role="dialog" aria-modal="true" aria-label="Subscribe League Portal" className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-blue-500/40 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto text-neutral-950 dark:text-white">
            <button
              onClick={() => onClose()}
              aria-label="Close"
              className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-950 dark:hover:text-white p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-600 dark:text-[#60a5fa] border border-blue-500/20">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <PageGuideButton className="mb-2" />
                <h3 className="text-xl font-black uppercase text-neutral-950 dark:text-white">Subscribe League Portal</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Baseline fee + per-team scaling • Includes full team hubs for every team</p>
              </div>
            </div>

            <form onSubmit={handleSubscribeLeague} className="space-y-4">
              <div data-tour="subscribe-league-identity" className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">League Name</label>
                  <input
                    type="text"
                    required
                    value={leagueName}
                    onChange={(e) => setLeagueName(e.target.value)}
                    placeholder="e.g. Gotham Flag Football League"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white text-sm outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Shortcode</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={leagueShortcode}
                      onChange={(e) => setLeagueShortcode(e.target.value.toUpperCase())}
                      placeholder="e.g. GFFL"
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white text-sm outline-none focus:border-blue-500 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Team Capacity</label>
                    <input
                      type="number"
                      min={4}
                      max={64}
                      value={teamCount}
                      onChange={(e) => setTeamCount(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white text-sm outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* League Logo (Optional, defaults to FlagOS logo) */}
              <div data-tour="subscribe-league-logo" className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-neutral-900/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600 dark:text-[#60a5fa]" />
                    <span>League Logo (Optional)</span>
                  </label>
                  {leagueLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setLeagueLogoUrl("")}
                      className="text-[11px] text-blue-600 dark:text-[#60a5fa] hover:underline cursor-pointer"
                    >
                      Reset to FlagOS Logo
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-neutral-200 dark:border-white/20 bg-white dark:bg-neutral-950 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                    <img
                      src={leagueLogoUrl.trim() || FLAGOS_LOGO}
                      alt="League Logo Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={leagueLogoUrl}
                      onChange={(e) => setLeagueLogoUrl(e.target.value)}
                      placeholder="Paste image URL or upload below..."
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white text-xs outline-none focus:border-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-200/80 hover:bg-neutral-300 dark:bg-white/10 dark:hover:bg-white/15 text-neutral-900 dark:text-white text-[11px] font-semibold cursor-pointer border border-neutral-300 dark:border-white/10 transition-colors">
                        <Upload className="w-3 h-3 text-blue-600 dark:text-[#60a5fa]" />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                if (typeof ev.target?.result === "string") setLeagueLogoUrl(ev.target.result);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        {leagueLogoUrl ? "Custom logo active" : "Defaulting to FlagOS emblem"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Colors: Primary, Secondary, Tertiary */}
              <div data-tour="subscribe-league-colors" className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-neutral-900/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Brand Color Palette</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                    <span>Preview:</span>
                    <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-white/30" style={{ backgroundColor: leaguePrimaryColor }} title="Primary" />
                    <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-white/30" style={{ backgroundColor: leagueSecondaryColor }} title="Secondary" />
                    <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-white/30" style={{ backgroundColor: leagueTertiaryColor }} title="Tertiary" />
                  </div>
                </div>

                {/* Primary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Primary Color</label>
                    <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">{leaguePrimaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#3ca505", "#22c55e", "#06B6D4", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`League primary color ${c}`}
                        onClick={() => setLeaguePrimaryColor(c)}
                        className={`w-7 h-7 rounded-lg transition-transform cursor-pointer border border-neutral-300 dark:border-white/20 ${leaguePrimaryColor === c ? "scale-110 ring-2 ring-neutral-950 dark:ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={leaguePrimaryColor}
                        onChange={(e) => setLeaguePrimaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>

                {/* Secondary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Secondary Color</label>
                    <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">{leagueSecondaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#3B82F6", "#06B6D4", "#22c55e", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`League secondary color ${c}`}
                        onClick={() => setLeagueSecondaryColor(c)}
                        className={`w-7 h-7 rounded-lg transition-transform cursor-pointer border border-neutral-300 dark:border-white/20 ${leagueSecondaryColor === c ? "scale-110 ring-2 ring-neutral-950 dark:ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={leagueSecondaryColor}
                        onChange={(e) => setLeagueSecondaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>

                {/* Tertiary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Tertiary Color</label>
                    <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">{leagueTertiaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#FFFFFF", "#F3F4F6", "#9CA3AF", "#F59E0B", "#FCD34D", "#06B6D4", "#3B82F6", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`League tertiary color ${c}`}
                        onClick={() => setLeagueTertiaryColor(c)}
                        className={`w-7 h-7 rounded-lg transition-transform cursor-pointer border border-neutral-300 dark:border-white/20 ${leagueTertiaryColor.toLowerCase() === c.toLowerCase() ? "scale-110 ring-2 ring-neutral-950 dark:ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={leagueTertiaryColor.startsWith("#") ? leagueTertiaryColor : "#ffffff"}
                        onChange={(e) => setLeagueTertiaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-neutral-100 dark:bg-neutral-900/80 border border-neutral-200 dark:border-white/10 rounded-2xl p-4 text-xs space-y-2 mt-4">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Baseline League Fee</span>
                  <span className="font-mono text-neutral-950 dark:text-white">${baseLeagueFee}/mo</span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>{teamCount} Teams Add-on (${perTeamFee}/team)</span>
                  <span className="font-mono text-neutral-950 dark:text-white">${teamCount * perTeamFee}/mo</span>
                </div>
                <div className="border-t border-neutral-200 dark:border-white/10 pt-2 flex justify-between font-bold text-neutral-950 dark:text-white text-sm">
                  <span>Total Due Monthly</span>
                  <span className="text-blue-600 dark:text-[#60a5fa] font-mono">${totalLeagueMonthly}/mo</span>
                </div>
              </div>

              <button data-tour="subscribe-league-confirm"
                type="submit"
                disabled={isSubmittingLeague}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {isSubmittingLeague
                    ? (usesCheckout && !finishingLeague ? "Opening secure checkout..." : "Creating League...")
                    : finishingLeague ? "Finish League Setup · Paid"
                    : usesCheckout ? "Continue to Secure Checkout"
                    : "Create League · Complimentary"}
                </span>
              </button>
              {finishingLeague && (
                <p className="text-center text-[11px] text-neutral-500 dark:text-neutral-400">Payment confirmed for {paidPurchase.teamCount} teams. Change your team count later from League Settings.</p>
              )}
              {usesCheckout && !finishingLeague && (
                <p className="text-center text-[11px] text-neutral-500 dark:text-neutral-400">You will pay on Stripe, then return here to finish setup. Prices in CAD.</p>
              )}
              {checkoutError && (
                <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{checkoutError}</p>
              )}
            </form>
          </div>
        </div>

  );
});

export default LeagueCheckoutModal;
