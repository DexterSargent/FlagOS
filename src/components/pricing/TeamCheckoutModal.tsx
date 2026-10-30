"use client";

import React, { memo } from "react";
import { useDialogKeyboard } from "@/components/ui/useDialogKeyboard";
import { X, Users, CreditCard, Upload, ImageIcon } from "lucide-react";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";
import { FLAGOS_LOGO } from "@/lib/brandTokens";

export interface TeamCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  setTeamName: (v: string) => void;
  teamShortcode: string;
  setTeamShortcode: (v: string) => void;
  teamLogoUrl: string;
  setTeamLogoUrl: (v: string) => void;
  teamPrimaryColor: string;
  setTeamPrimaryColor: (v: string) => void;
  teamSecondaryColor: string;
  setTeamSecondaryColor: (v: string) => void;
  teamTertiaryColor: string;
  setTeamTertiaryColor: (v: string) => void;
  teamVisibility: "public" | "private";
  setTeamVisibility: (v: "public" | "private") => void;
  finishingTeam: boolean;
  usesCheckout: boolean;
  isSubmittingTeam: boolean;
  checkoutError: string;
  handleSubscribeTeam: (e: React.FormEvent) => void;
}

export const TeamCheckoutModal = memo(function TeamCheckoutModal({
  isOpen,
  onClose,
  teamName,
  setTeamName,
  teamShortcode,
  setTeamShortcode,
  teamLogoUrl,
  setTeamLogoUrl,
  teamPrimaryColor,
  setTeamPrimaryColor,
  teamSecondaryColor,
  setTeamSecondaryColor,
  teamTertiaryColor,
  setTeamTertiaryColor,
  teamVisibility,
  setTeamVisibility,
  finishingTeam,
  usesCheckout,
  isSubmittingTeam,
  checkoutError,
  handleSubscribeTeam,
}: TeamCheckoutModalProps) {
  const dialogRef = useDialogKeyboard<HTMLDivElement>(isOpen, onClose, { busy: isSubmittingTeam });
  if (!isOpen) return null;

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="team-checkout-title" tabIndex={-1} className="outline-none bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto text-neutral-950 dark:text-white">
            <button
              type="button"
              onClick={() => onClose()}
              disabled={isSubmittingTeam}
              aria-label="Close"
              className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-950 dark:hover:text-white p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <PageGuideButton className="mb-2" />
                <h3 id="team-checkout-title" className="text-xl font-black uppercase text-neutral-950 dark:text-white">Subscribe Team Portal</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Single monthly fee • Full stats tracking, roster hub &amp; up to 5 playbooks</p>
              </div>
            </div>

            <form onSubmit={handleSubscribeTeam} className="space-y-4">
              <div data-tour="subscribe-team-identity" className="space-y-4">
                <div>
                  <label htmlFor="team-checkout-name" className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Team / Club Name</label>
                  <input
                    id="team-checkout-name"
                    type="text"
                    required
                    maxLength={60}
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Apex Predators"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white text-sm outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label htmlFor="team-checkout-shortcode" className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Team Shortcode</label>
                  <input
                    id="team-checkout-shortcode"
                    type="text"
                    maxLength={5}
                    pattern="[A-Za-z0-9]{0,5}"
                    title="Up to 5 letters or numbers"
                    value={teamShortcode}
                    onChange={(e) => setTeamShortcode(e.target.value.toUpperCase())}
                    placeholder="e.g. APX"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white text-sm outline-none focus:border-emerald-500 font-mono uppercase"
                  />
                </div>
              </div>

              {/* Team Logo (Optional, defaults to FlagOS logo) */}
              <div data-tour="subscribe-team-logo" className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-neutral-900/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>Team Logo / Crest (Optional)</span>
                  </label>
                  {teamLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setTeamLogoUrl("")}
                      className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Reset to FlagOS Logo
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-neutral-200 dark:border-white/20 bg-white dark:bg-neutral-950 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                    <img
                      src={teamLogoUrl.trim() || FLAGOS_LOGO}
                      alt="Team Logo Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="url"
                      inputMode="url"
                      aria-label="Team logo image URL"
                      value={teamLogoUrl}
                      onChange={(e) => setTeamLogoUrl(e.target.value)}
                      placeholder="Paste image URL or upload below..."
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white text-xs outline-none focus:border-emerald-500"
                    />
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-200/80 hover:bg-neutral-300 dark:bg-white/10 dark:hover:bg-white/15 text-neutral-900 dark:text-white text-[11px] font-semibold cursor-pointer border border-neutral-300 dark:border-white/10 transition-colors">
                        <Upload className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
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
                                if (typeof ev.target?.result === "string") setTeamLogoUrl(ev.target.result);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        {teamLogoUrl ? "Custom logo active" : "Defaulting to FlagOS emblem"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Colors: Primary, Secondary, Tertiary */}
              <div data-tour="subscribe-team-colors" className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-neutral-900/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Team Color Palette</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                    <span>Preview:</span>
                    <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-white/30" style={{ backgroundColor: teamPrimaryColor }} title="Primary" />
                    <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-white/30" style={{ backgroundColor: teamSecondaryColor }} title="Secondary" />
                    <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-white/30" style={{ backgroundColor: teamTertiaryColor }} title="Tertiary" />
                  </div>
                </div>

                {/* Primary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Primary Color</label>
                    <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">{teamPrimaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#22c55e", "#06B6D4", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Team primary color ${c}`}
                        onClick={() => setTeamPrimaryColor(c)}
                        className={`w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 transition-transform cursor-pointer ${teamPrimaryColor === c ? "scale-110 ring-2 ring-neutral-950 dark:ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={teamPrimaryColor}
                        onChange={(e) => setTeamPrimaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>

                {/* Secondary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Secondary Color</label>
                    <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">{teamSecondaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#06B6D4", "#3B82F6", "#22c55e", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Team secondary color ${c}`}
                        onClick={() => setTeamSecondaryColor(c)}
                        className={`w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 transition-transform cursor-pointer ${teamSecondaryColor === c ? "scale-110 ring-2 ring-neutral-950 dark:ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={teamSecondaryColor}
                        onChange={(e) => setTeamSecondaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>

                {/* Tertiary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Tertiary Color</label>
                    <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">{teamTertiaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#FFFFFF", "#F3F4F6", "#9CA3AF", "#F59E0B", "#FCD34D", "#06B6D4", "#3B82F6", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Team tertiary color ${c}`}
                        onClick={() => setTeamTertiaryColor(c)}
                        className={`w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 transition-transform cursor-pointer ${teamTertiaryColor.toLowerCase() === c.toLowerCase() ? "scale-110 ring-2 ring-neutral-950 dark:ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={teamTertiaryColor.startsWith("#") ? teamTertiaryColor : "#ffffff"}
                        onChange={(e) => setTeamTertiaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div data-tour="subscribe-team-visibility">
                <label htmlFor="team-visibility" className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Team Portal Visibility</label>
                <select
                  id="team-visibility"
                  value={teamVisibility}
                  onChange={(e) => setTeamVisibility(e.target.value === "private" ? "private" : "public")}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white text-sm outline-none focus:border-emerald-500"
                >
                  <option value="public">Public – anyone can view schedule, roster names &amp; stats</option>
                  <option value="private">Private – only coaches &amp; rostered players</option>
                </select>
              </div>

              {/* Order Summary */}
              <div className="bg-neutral-100 dark:bg-neutral-900/80 border border-neutral-200 dark:border-white/10 rounded-2xl p-4 text-xs space-y-2 mt-4">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Single Team Portal Subscription</span>
                  <span className="font-mono text-neutral-950 dark:text-white">$40/mo</span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Full Stats &amp; Up to 5 Custom Playbooks</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">$0 (Included)</span>
                </div>
                <div className="border-t border-neutral-200 dark:border-white/10 pt-2 flex justify-between font-bold text-neutral-950 dark:text-white text-sm">
                  <span>Total Due Monthly</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">$40/mo</span>
                </div>
              </div>

              <button data-tour="subscribe-team-confirm"
                type="submit"
                disabled={isSubmittingTeam}
                aria-busy={isSubmittingTeam}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {isSubmittingTeam
                    ? (usesCheckout && !finishingTeam ? "Opening secure checkout..." : "Creating Team...")
                    : finishingTeam ? "Finish Team Setup · Paid"
                    : usesCheckout ? "Continue to Secure Checkout"
                    : "Create Team · Complimentary"}
                </span>
              </button>
              <p className="text-center text-[11px] text-neutral-500 dark:text-neutral-400">
                {finishingTeam
                  ? "Payment confirmed. Your team portal is created as soon as you finish."
                  : usesCheckout
                    ? "You will pay on Stripe, then return here to finish setup. Prices in CAD."
                    : "Owner account: payment is recorded as complimentary — no card is charged."}
              </p>
              {checkoutError && (
                <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{checkoutError}</p>
              )}
            </form>
          </div>
        </div>

  );
});

export default TeamCheckoutModal;
