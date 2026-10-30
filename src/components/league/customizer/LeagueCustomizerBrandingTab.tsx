"use client";

import React, { memo } from "react";
import {
  Shield,
  MapPin,
  Globe,
  Lock,
  ExternalLink,
  Check,
  Copy,
  Tag,
  Palette,
  CreditCard,
} from "lucide-react";
import { renderFlagOS } from "@/components/FlagOSText";
import FieldHelpTooltip from "@/components/FieldHelpTooltip";
import type { LeaguePlayerInfo, LeagueVenueInfo } from "@/lib/leaguePublicProfile";
import { getReadableTextColor } from "@/lib/teamColors";

/** Blank, built-in ("/..."), uploaded data images and web addresses are all fine. */
export function isAcceptableLogoUrl(value: string | undefined): boolean {
  const trimmed = (value || "").trim();
  return !trimmed || (trimmed.startsWith("/") && !trimmed.startsWith("//")) || /^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed);
}

export const SAMPLE_LOGOS = [
  { name: "Shield Crest", Url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150&auto=format&fit=crop&q=80" },
  { name: "Football Emblem", Url: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=150&auto=format&fit=crop&q=80" },
  { name: "Crown Icon", Url: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=150&auto=format&fit=crop&q=80" },
];

export interface LeagueCustomizerBrandingTabProps {
  leagueName: string;
  setLeagueName: (v: string) => void;
  shortcode: string;
  setShortcode: (v: string) => void;
  tagline: string;
  setTagline: (v: string) => void;
  seasonTitle: string;
  setSeasonTitle: (v: string) => void;
  logoUrl: string;
  setLogoUrl: (v: string) => void;
  primaryColor: string;
  accentColor: string;
  handlePrimaryChange: (val: string) => void;
  handleSecondaryChange: (val: string) => void;
  defaultLocation: string;
  setDefaultLocation: (v: string) => void;
  contactEmail: string;
  setContactEmail: (v: string) => void;
  rulebookTitle: string;
  setRulebookTitle: (v: string) => void;
  rulebookUrl: string;
  setRulebookUrl: (v: string) => void;
  announcement: string;
  setAnnouncement: (v: string) => void;
  visibility: "public" | "private";
  setVisibility: (v: "public" | "private") => void;
  registrationFeePerTeam: string;
  setRegistrationFeePerTeam: (v: string) => void;
  individualFee: string;
  setIndividualFee: (v: string) => void;
  amenitiesText: string;
  setAmenitiesText: (v: string) => void;
  directoryListed: boolean;
  setDirectoryListed: (v: boolean) => void;
  publicContactEmail: string;
  setPublicContactEmail: (v: string) => void;
  playerInfo: LeaguePlayerInfo;
  updatePlayerInfo: (key: keyof LeaguePlayerInfo, value: string | boolean) => void;
  venues: LeagueVenueInfo[];
  setVenues: React.Dispatch<React.SetStateAction<LeagueVenueInfo[]>>;
  updateVenue: (index: number, key: keyof LeagueVenueInfo, value: string) => void;
  copiedLink: boolean;
  setCopiedLink: (v: boolean) => void;
  activeLeagueId: string | null;
  saving: boolean;
  handleSaveLeagueSettings: (e: React.FormEvent) => void;
  closeCustomizer: () => void;
}

export const LeagueCustomizerBrandingTab = memo(function LeagueCustomizerBrandingTab({
  leagueName,
  setLeagueName,
  shortcode,
  setShortcode,
  tagline,
  setTagline,
  seasonTitle,
  setSeasonTitle,
  logoUrl,
  setLogoUrl,
  primaryColor,
  accentColor,
  handlePrimaryChange,
  handleSecondaryChange,
  defaultLocation,
  setDefaultLocation,
  contactEmail,
  setContactEmail,
  rulebookTitle,
  setRulebookTitle,
  rulebookUrl,
  setRulebookUrl,
  announcement,
  setAnnouncement,
  visibility,
  setVisibility,
  registrationFeePerTeam,
  setRegistrationFeePerTeam,
  individualFee,
  setIndividualFee,
  amenitiesText,
  setAmenitiesText,
  directoryListed,
  setDirectoryListed,
  publicContactEmail,
  setPublicContactEmail,
  playerInfo,
  updatePlayerInfo,
  venues,
  setVenues,
  updateVenue,
  copiedLink,
  setCopiedLink,
  activeLeagueId,
  saving,
  handleSaveLeagueSettings,
  closeCustomizer,
}: LeagueCustomizerBrandingTabProps) {
  return (
          <form onSubmit={handleSaveLeagueSettings} className="space-y-6">
            {/* Live Multi-Preview Showcase */}
            <div data-tour="settings-preview" className="p-4 rounded-2xl bg-black/70 border border-white/10 space-y-3">
              <span className="text-[10px] font-mono uppercase font-bold text-neutral-400 tracking-wider block">
                Official Site-Wide Branding Preview
              </span>

              {/* Header Preview */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#07090E] border border-white/10">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center bg-transparent overflow-hidden p-0.5 shrink-0"
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <Shield className="w-5 h-5 fill-white/20" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-base font-black uppercase tracking-wider text-white">
                        {renderFlagOS(leagueName || "League Name")}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 whitespace-nowrap">
                        {seasonTitle || "Active Season"}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-cyan-300 font-bold whitespace-nowrap">
                        {shortcode || "FLAG"}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400 font-mono tracking-widest uppercase block">
                      {tagline || "League Tagline"}
                    </span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-neutral-400">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{defaultLocation || "Turf Field 1"}</span>
                </div>
              </div>
            </div>

            {/* League Privacy & Directory Access */}
            <div data-tour="settings-privacy" className="p-5 rounded-2xl bg-black/70 border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-black uppercase text-white tracking-wide flex items-center gap-2">
                    {visibility === "public" ? (
                      <Globe className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-400" />
                    )}
                    <span>League Privacy & Directory Listing</span>
                    <FieldHelpTooltip
                      title="League Visibility"
                      content="Listed leagues appear in the public directory and free-agent search. Unlisted leagues are viewable only through the direct link. Private leagues are visible only to league members."
                    />
                  </span>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Leagues are never listed publicly unless you choose to. Choose who can find and view this league.
                  </p>
                </div>
                <span
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider self-start sm:self-auto ${
                    visibility === "public"
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  }`}
                >
                  {visibility === "private" ? "🔒 Private (Members Only)" : directoryListed ? "🌐 Listed Publicly" : "🔗 Unlisted (Link Only)"}
                </span>
              </div>

              {/* Listing options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {([
                  {
                    id: "listed",
                    title: "Listed Publicly",
                    icon: Globe,
                    tone: "emerald",
                    body: "Appears in the public league directory and free-agent search. Anyone can find it and view the league hub.",
                    foot: "\u2713 Discoverable in the directory",
                  },
                  {
                    id: "unlisted",
                    title: "Unlisted (Link Only)",
                    icon: ExternalLink,
                    tone: "cyan",
                    body: "Not shown in the directory or search. Anyone signed in who has the direct link can view the league hub.",
                    foot: "\u{1F517} Share the direct link yourself",
                  },
                  {
                    id: "private",
                    title: "Private (Members Only)",
                    icon: Lock,
                    tone: "amber",
                    body: "Hidden from the directory. Only league admins, coaches and rostered players can open it. Recommended for youth leagues.",
                    foot: "\u{1F512} Members only",
                  },
                ] as const).map((option) => {
                  const current = visibility === "private" ? "private" : directoryListed ? "listed" : "unlisted";
                  const selected = current === option.id;
                  const Icon = option.icon;
                  const toneText = option.tone === "emerald" ? "text-emerald-400" : option.tone === "cyan" ? "text-cyan-400" : "text-amber-400";
                  const toneSelected = option.tone === "emerald"
                    ? "bg-emerald-500/10 border-emerald-500/60"
                    : option.tone === "cyan"
                    ? "bg-cyan-500/10 border-cyan-500/60"
                    : "bg-amber-500/10 border-amber-500/60";
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setVisibility(option.id === "private" ? "private" : "public");
                        setDirectoryListed(option.id === "listed");
                      }}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                        selected ? `${toneSelected} shadow-lg` : "bg-black/50 border-white/10 hover:border-white/20 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${toneText}`}>
                            <Icon className="w-4 h-4" />
                            <span>{option.title}</span>
                          </div>
                          {selected && (
                            <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-black">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] leading-relaxed text-neutral-300">{option.body}</p>
                      </div>
                      <div className={`mt-3 pt-2.5 border-t border-white/5 text-[10px] font-mono ${toneText}`}>
                        {option.foot}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Direct Access Link Box */}
              <div className="mt-3 p-3.5 rounded-xl bg-black border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-neutral-400 font-bold flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Direct Access URL</span>
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {visibility === "private" ? "Opens only for league members" : "Shareable direct portal link"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    aria-label="League portal link"
                    value={typeof window !== "undefined" ? `${window.location.origin}/league/${activeLeagueId}` : `/league/${activeLeagueId}`}
                    className="min-w-0 flex-1 bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-neutral-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        const url = `${window.location.origin}/league/${activeLeagueId}`;
                        navigator.clipboard?.writeText(url);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      copiedLink
                        ? "bg-emerald-500 text-black font-black"
                        : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Section 1: Core League Identity */}
            <div data-tour="settings-identity" className="border-b border-white/10 pb-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>1. League Identity & Details</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="lc-league-name" className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                    <span>League Full Name *</span>
                    <FieldHelpTooltip
                      title="League Name"
                      content="The primary official organization title displayed on schedules, standings, game summaries, and public promotional pages."
                    />
                  </label>
                  <input id="lc-league-name" maxLength={80}
                    type="text"
                    required
                    value={leagueName}
                    onChange={(e) => setLeagueName(e.target.value)}
                    placeholder="e.g. Metro Flag Football League"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-amber-500 text-white text-xs outline-none transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="lc-league-shortcode" className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                    <span>League Shortcode</span>
                    <FieldHelpTooltip
                      title="Shortcode"
                      content="A 2 to 6 character acronym used in compact badges, box scores, and breadcrumb navigation (e.g. MFL, AFFL, NFL)."
                    />
                  </label>
                  <input id="lc-league-shortcode"
                    type="text"
                    maxLength={6}
                    value={shortcode}
                    onChange={(e) => setShortcode(e.target.value.toUpperCase())}
                    placeholder="e.g. MFL"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-amber-500 text-white font-mono text-xs uppercase font-bold outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lc-season-title" className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                    <span>Season Title / Edition</span>
                    <FieldHelpTooltip
                      title="Season Edition"
                      content="The active competition cycle or campaign name (e.g. 2026 Spring Championship, Fall Invitational)."
                    />
                  </label>
                  <input id="lc-season-title" maxLength={60}
                    type="text"
                    value={seasonTitle}
                    onChange={(e) => setSeasonTitle(e.target.value)}
                    placeholder="e.g. 2026 Spring Championship"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-amber-500 text-white text-xs outline-none transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="lc-league-tagline" className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                    <span>Tagline / Motto</span>
                    <FieldHelpTooltip
                      title="Tagline"
                      content="A descriptive slogan or division tier indicator shown below the league title across headers and cards."
                    />
                  </label>
                  <input id="lc-league-tagline" maxLength={120}
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Sunday 7v7 flag football in Toronto"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-amber-500 text-white text-xs outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lc-league-logo-url" className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                  <span>League Crest / Logo URL</span>
                  <FieldHelpTooltip
                    title="League Crest"
                    content="Direct image link for your official league emblem. If left empty, default FlagOS brand styling is displayed."
                  />
                </label>
                <input id="lc-league-logo-url" maxLength={500}
                  type="text"
                  inputMode="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/league-logo.png"
                  aria-invalid={!isAcceptableLogoUrl(logoUrl)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-amber-500 text-white text-xs outline-none transition-colors"
                />
                {!isAcceptableLogoUrl(logoUrl) && (
                  <p className="mt-1 text-[10px] font-bold text-red-400">Use a full image address starting with https://, or leave it blank.</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-neutral-500">Preset Sample Logos:</span>
                  {SAMPLE_LOGOS.map((sample) => (
                    <button
                      key={sample.name}
                      type="button"
                      onClick={() => setLogoUrl(sample.Url)}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                    >
                      {sample.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Operations & Venue Details */}
            <div data-tour="settings-operations" className="border-b border-white/10 pb-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>2. Operations & Venue Information</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="lc-default-location" className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                    <span>Default Game Field / Complex</span>
                    <FieldHelpTooltip
                      title="Default Venue"
                      content="The primary sports complex or home turf used when games don't specify a custom location."
                    />
                  </label>
                  <input id="lc-default-location" maxLength={80}
                    type="text"
                    value={defaultLocation}
                    onChange={(e) => setDefaultLocation(e.target.value)}
                    placeholder="e.g. Central Park Field 1"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="lc-rulebook-title" className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                    <span>Rulebook Title</span>
                    <FieldHelpTooltip
                      title="Rulebook Title"
                      content="Title shown on the public rulebook link and document download button."
                    />
                  </label>
                  <input id="lc-rulebook-title" maxLength={80}
                    type="text"
                    value={rulebookTitle}
                    onChange={(e) => setRulebookTitle(e.target.value)}
                    placeholder="e.g. Official 7v7 Flag Rules"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="lc-rulebook-url" className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                    <span>Rulebook Link (URL)</span>
                    <FieldHelpTooltip
                      title="Rulebook Link"
                      content="Direct URL pointing to an official PDF or web page with your league's complete rules and constitution."
                    />
                  </label>
                  <input id="lc-rulebook-url" maxLength={500}
                    type="url"
                    value={rulebookUrl}
                    onChange={(e) => setRulebookUrl(e.target.value)}
                    placeholder="e.g. https://example.com/rules.pdf"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="lc-contact-email" className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                    <span>Commissioner Contact Email</span>
                    <FieldHelpTooltip
                      title="Contact Email"
                      content="Public contact address for team managers, coaches, and athletes with inquiries."
                    />
                  </label>
                  <input id="lc-contact-email" maxLength={120} autoComplete="email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="e.g. info@flagleague.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lc-announcement" className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                  <span>Site-Wide Announcement Banner (Optional)</span>
                  <FieldHelpTooltip
                    title="Announcement Banner"
                    content="A notice shown prominently across the dashboard (e.g. weather alerts, playoff seedings, registration deadlines)."
                  />
                </label>
                <input id="lc-announcement" maxLength={240}
                  type="text"
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  placeholder="e.g. Playoffs schedule published! Registration for Spring 2026 is officially open."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none transition-colors"
                />
              </div>
            </div>

            {/* Section 3: Official League Colours */}
            <div data-tour="settings-colours" className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  <span>3. Official League Colours</span>
                </span>
                <span className="hidden sm:inline text-[11px] text-neutral-400 font-mono">
                  Primary & Secondary Brand Palette
                </span>
              </div>

              {/* Live Preview Card */}
              <div className="p-4 rounded-2xl bg-neutral-950/80 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-lg transition-transform hover:scale-105"
                    style={{
                      backgroundColor: primaryColor,
                      color: getReadableTextColor(primaryColor, "#ffffff"),
                      boxShadow: `0 4px 20px ${primaryColor}40`,
                    }}
                  >
                    {shortcode || "FLG"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-white tracking-wide">
                        {leagueName || "League Title"}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                        style={{
                          backgroundColor: `${accentColor}20`,
                          color: "var(--text-primary)",
                          borderColor: `${accentColor}40`,
                        }}
                      >
                        Active
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Live preview of your primary & secondary colour harmony
                    </p>
                  </div>
                </div>

                {/* Swatch gradient indicator */}
                <div className="flex items-center gap-2 bg-black/60 px-3 py-2 rounded-xl border border-white/10 shrink-0">
                  <span
                    className="w-5 h-5 rounded-lg border border-white/20 shadow-sm"
                    style={{ backgroundColor: primaryColor }}
                    title={`Primary: ${primaryColor}`}
                  />
                  <span className="text-neutral-500 font-bold text-xs">+</span>
                  <span
                    className="w-5 h-5 rounded-lg border border-white/20 shadow-sm"
                    style={{ backgroundColor: accentColor }}
                    title={`Secondary: ${accentColor}`}
                  />
                  <div
                    className="h-4 w-16 rounded-md ml-1 shadow-inner border border-white/10"
                    style={{
                      background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`,
                    }}
                  />
                </div>
              </div>

              {/* Dual Color Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] uppercase font-bold text-neutral-300 flex items-center gap-1.5">
                      <span>Primary Colour *</span>
                      <FieldHelpTooltip
                        title="Primary League Colour"
                        content="The dominant brand colour used for primary buttons, active league navigation badges, headers, score displays, and key accents."
                      />
                    </label>
                    <span className="text-[10px] font-mono text-neutral-400 uppercase">
                      {primaryColor}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => handlePrimaryChange(e.target.value)}
                        aria-label="Primary league colour"
                        className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-white/20 p-0 block overflow-hidden"
                      />
                    </div>
                    <input
                      type="text"
                      maxLength={7}
                      value={primaryColor}
                      onChange={(e) => handlePrimaryChange(e.target.value)}
                      placeholder="#3CA505"
                      aria-label="Primary league colour hex"
                      className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/10 focus:border-emerald-400 text-white font-mono text-xs uppercase outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] uppercase font-bold text-neutral-300 flex items-center gap-1.5">
                      <span>Secondary Colour *</span>
                      <FieldHelpTooltip
                        title="Secondary League Colour"
                        content="Complementary secondary colour used for badges, subtle glow highlights, interactive elements, and contrasting borders."
                      />
                    </label>
                    <span className="text-[10px] font-mono text-neutral-400 uppercase">
                      {accentColor}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => handleSecondaryChange(e.target.value)}
                        aria-label="Secondary league colour"
                        className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-white/20 p-0 block overflow-hidden"
                      />
                    </div>
                    <input
                      type="text"
                      maxLength={7}
                      value={accentColor}
                      onChange={(e) => handleSecondaryChange(e.target.value)}
                      placeholder="#22C55E"
                      aria-label="Secondary league colour hex"
                      className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/10 focus:border-emerald-400 text-white font-mono text-xs uppercase outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Registration Fees & Features (Optional) */}
            <div data-tour="settings-registration" className="border-t border-white/10 pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>4. Registration Fees & Features (Optional)</span>
                </span>
                <span className="hidden sm:inline text-[11px] text-neutral-400 font-mono">
                  Directory Listing Info
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Provide optional registration pricing and included features to display on the FlagOS League Directory. If left blank, cards will display &ldquo;Contact commissioner for more details&rdquo;.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
                  <label htmlFor="lc-team-fee" className="text-[11px] uppercase font-bold text-neutral-300 flex items-center gap-1.5">
                    <span>Team Registration Fee ($)</span>
                    <FieldHelpTooltip
                      title="Team Registration Fee"
                      content="Optional total cost for a full team registration. If not entered, the directory displays 'Contact commissioner for more details'."
                    />
                  </label>
                  <input id="lc-team-fee" inputMode="decimal"
                    type="number"
                    min="0"
                    step="1"
                    value={registrationFeePerTeam}
                    onChange={(e) => setRegistrationFeePerTeam(e.target.value)}
                    placeholder="e.g. 750 (leave blank if undisclosed)"
                    className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/10 focus:border-emerald-400 text-white font-mono text-xs outline-none transition-colors"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
                  <label htmlFor="lc-individual-fee" className="text-[11px] uppercase font-bold text-neutral-300 flex items-center gap-1.5">
                    <span>Free Agent / Individual Fee ($)</span>
                    <FieldHelpTooltip
                      title="Individual Entry Fee"
                      content="Optional registration fee per solo player / free agent. If not entered, the directory displays 'Contact commissioner for more details'."
                    />
                  </label>
                  <input id="lc-individual-fee" inputMode="decimal"
                    type="number"
                    min="0"
                    step="1"
                    value={individualFee}
                    onChange={(e) => setIndividualFee(e.target.value)}
                    placeholder="e.g. 85 (leave blank if undisclosed)"
                    className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/10 focus:border-emerald-400 text-white font-mono text-xs outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
                <label htmlFor="lc-amenities" className="text-[11px] uppercase font-bold text-neutral-300 flex items-center gap-1.5">
                  <span>Included Features & Perks (Comma-Separated)</span>
                  <FieldHelpTooltip
                    title="Included Amenities"
                    content="Enter features included with registration, separated by commas (e.g. 'Certified Referees, Custom Jerseys, HD Highlights, Live Stats'). If empty, defaults to 'Contact commissioner for more details'."
                  />
                </label>
                <input id="lc-amenities" maxLength={400}
                  type="text"
                  value={amenitiesText}
                  onChange={(e) => setAmenitiesText(e.target.value)}
                  placeholder="e.g. Official Referees, Team Jerseys, Live Stats Tracking, Trophies"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/10 focus:border-emerald-400 text-white text-xs outline-none transition-colors"
                />
              </div>

              <div data-tour="settings-player-info" className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-3">
                <div>
                  <span className="text-[11px] uppercase font-bold text-neutral-300">Player-Facing Details (optional)</span>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Shown on your directory listing and league page. Leave anything blank to hide it.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">Public organizer contact email</span>
                    <input
                      type="email"
                      value={publicContactEmail}
                      onChange={(e) => setPublicContactEmail(e.target.value)}
                      placeholder="e.g. league@example.com (shown publicly)"
                      maxLength={254}
                      className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/10 focus:border-emerald-400 text-white text-xs outline-none"
                    />
                    <span className="block text-[10px] text-neutral-500">Without one, players are pointed to FlagOS support.</span>
                  </label>
                  {([
                    ["city", "City / area", "e.g. Toronto, ON", 80],
                    ["venueName", "Main venue name", "e.g. Downsview Park", 120],
                    ["address", "Venue address", "e.g. 70 Canuck Ave, Toronto, ON", 200],
                    ["gameDay", "Game day", "e.g. Sundays", 60],
                    ["gameTime", "Game time", "e.g. 9 AM \u2013 1 PM", 60],
                    ["skillLevel", "Skill level", "e.g. Recreational, Competitive", 60],
                    ["division", "Division", "e.g. Co-Ed, Men's, Youth U12", 60],
                    ["registrationDeadline", "Registration deadline", "e.g. May 1", 32],
                    ["seasonDates", "Season dates", "e.g. May \u2013 August", 80],
                  ] as const).map(([key, label, placeholder, max]) => (
                    <label key={key} className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-400">{label}</span>
                      <input
                        type="text"
                        value={(playerInfo[key] as string | undefined) || ""}
                        onChange={(e) => updatePlayerInfo(key, e.target.value)}
                        placeholder={placeholder}
                        maxLength={max}
                        className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/10 focus:border-emerald-400 text-white text-xs outline-none"
                      />
                    </label>
                  ))}
                  <label className="flex items-center gap-2 sm:col-span-2 text-xs text-neutral-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={playerInfo.acceptsFreeAgents === true}
                      onChange={(e) => updatePlayerInfo("acceptsFreeAgents", e.target.checked)}
                      className="w-4 h-4 accent-emerald-500"
                    />
                    <span>Accepting free agents (players without a team)</span>
                  </label>
                </div>
              </div>

              <div data-tour="settings-venues" className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-neutral-300">Fields &amp; Venues</span>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Add an address so players get a Directions link on game cards. Names must match the location used on games (e.g. &ldquo;Field 1&rdquo;).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVenues((prev) => [...prev, { name: "", address: "", notes: "" }])}
                    disabled={venues.length >= 20}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold disabled:opacity-40 cursor-pointer"
                  >
                    + Add venue
                  </button>
                </div>
                {venues.length === 0 && (
                  <p className="text-[11px] text-neutral-500 italic">No venues added yet.</p>
                )}
                {venues.map((venue, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_auto] gap-2 p-2.5 rounded-lg border border-white/10 bg-black/40">
                    <input
                      type="text"
                      value={venue.name}
                      onChange={(e) => updateVenue(index, "name", e.target.value)}
                      placeholder="Field name (e.g. Field 1)"
                      maxLength={100}
                      aria-label={`Venue ${index + 1} name`}
                      className="px-3 py-2 rounded-lg bg-black/80 border border-white/10 focus:border-emerald-400 text-white text-xs outline-none"
                    />
                    <input
                      type="text"
                      value={venue.address || ""}
                      onChange={(e) => updateVenue(index, "address", e.target.value)}
                      placeholder="Street address"
                      maxLength={200}
                      aria-label={`Venue ${index + 1} address`}
                      className="px-3 py-2 rounded-lg bg-black/80 border border-white/10 focus:border-emerald-400 text-white text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setVenues((prev) => prev.filter((_, i) => i !== index))}
                      className="px-3 py-2 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 text-[11px] font-bold cursor-pointer"
                    >
                      Remove
                    </button>
                    <input
                      type="text"
                      value={venue.notes || ""}
                      onChange={(e) => updateVenue(index, "notes", e.target.value)}
                      placeholder="Notes (parking, entrance, which field)"
                      maxLength={300}
                      aria-label={`Venue ${index + 1} notes`}
                      className="sm:col-span-3 px-3 py-2 rounded-lg bg-black/80 border border-white/10 focus:border-emerald-400 text-white text-xs outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Negative offsets cancel the scroll container's padding so the bar sits flush with the panel's bottom edge. */}
            <div data-tour="settings-branding-save" className="sticky -bottom-4 sm:-bottom-6 md:-bottom-8 -mx-4 sm:-mx-6 md:-mx-8 -mb-4 sm:-mb-6 md:-mb-8 px-4 sm:px-6 md:px-8 py-3 bg-[#0B0F19] border-t border-white/10 flex items-center justify-between gap-3 z-20 mt-6 shadow-[0_-6px_16px_rgba(0,0,0,0.18)]">
              <button
                type="button"
                onClick={closeCustomizer}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 sm:px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>{saving ? "Saving..." : <>Apply<span className="hidden sm:inline"> League Branding</span></>}</span>
              </button>
            </div>
          </form>

  );
});

export default LeagueCustomizerBrandingTab;
