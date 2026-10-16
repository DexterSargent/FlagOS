"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLeague, LeagueRules, DEFAULT_LEAGUE_RULES, IFAF_5V5_RULES } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import {
  Palette,
  Shield,
  X,
  Check,
  MapPin,
  Tag,
  Clock,
  Scale,
  Users,
  Timer,
  SlidersHorizontal,
  Flame,
  Settings as SettingsIcon,
  RotateCcw,
  Lock,
  UserPlus,
  Info,
  BookOpen,
  Globe,
  Copy,
  ExternalLink,
  Archive,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { renderFlagOS } from "@/components/FlagOSText";
import FieldHelpTooltip from "@/components/FieldHelpTooltip";

const SAMPLE_LOGOS = [
  { name: "Shield Crest", Url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150&auto=format&fit=crop&q=80" },
  { name: "Football Emblem", Url: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=150&auto=format&fit=crop&q=80" },
  { name: "Crown Icon", Url: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=150&auto=format&fit=crop&q=80" },
];

export default function LeagueCustomizerModal() {
  const {
    settings,
    updateSettings,
    isCustomizerOpen,
    closeCustomizer,
    previewThemeColors,
    activeLeagueId,
    subscription,
    archiveLeague,
    resumeSubscription,
    isLeagueArchived,
    isSubscriptionPastDue,
  } = useLeague();
  const { isLeagueAdmin, isPlayer, playerData } = useAuth();

  const [activeTab, setActiveTab] = useState<"branding" | "rules" | "season">(
    isLeagueAdmin ? "branding" : "rules"
  );
  const [showArchivePrompt, setShowArchivePrompt] = useState(false);
  const [archivingInProgress, setArchivingInProgress] = useState(false);

  // League Branding states (League Admin)
  const [leagueName, setLeagueName] = useState(settings.leagueName);
  const [shortcode, setShortcode] = useState(settings.shortcode || "");
  const [tagline, setTagline] = useState(settings.tagline);
  const [seasonTitle, setSeasonTitle] = useState(settings.seasonTitle);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
  const [defaultLocation, setDefaultLocation] = useState(settings.defaultLocation || "Turf Field 1");
  const [contactEmail, setContactEmail] = useState(settings.contactEmail || "");
  const [rulebookTitle, setRulebookTitle] = useState(settings.rulebookTitle || "IFAF 5v5 Rulebook");
  const [rulebookUrl, setRulebookUrl] = useState(settings.rulebookUrl || "https://americanfootball.sport/wp-content/uploads/2023/05/FlagRules2023.pdf");
  const [announcement, setAnnouncement] = useState(settings.announcement || "");
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [accentColor, setAccentColor] = useState(settings.accentColor);
  const [visibility, setVisibility] = useState<"public" | "private">(settings.visibility || "public");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedJoinLink, setCopiedJoinLink] = useState(false);

  const customJoinPath = activeLeagueId && activeLeagueId !== "default"
    ? `/join?league=${activeLeagueId}`
    : `/join`;
  const customJoinUrl = typeof window !== "undefined"
    ? `${window.location.origin}${customJoinPath}`
    : customJoinPath;

  // League Rules states
  const [rules, setRules] = useState<LeagueRules>(settings.rules || DEFAULT_LEAGUE_RULES);
  const isFreeAgentRegistrationEnabled = rules.enableFreeAgents !== false;
  // Join link is only viewable by league admin if turned off, and viewable to all if turned on
  const canViewJoinLink = isFreeAgentRegistrationEnabled || isLeagueAdmin;
  const [saving, setSaving] = useState(false);
  const [ifafPresetNotice, setIfafPresetNotice] = useState(false);

  // Lock body scroll while modal is open so main page behind modal does not scroll
  useEffect(() => {
    if (!isCustomizerOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isCustomizerOpen]);

  const handleResetToIFAF = () => {
    setRules(IFAF_5V5_RULES);
    setIfafPresetNotice(true);
    setTimeout(() => setIfafPresetNotice(false), 4000);
  };

  useEffect(() => {
    setLeagueName(settings.leagueName);
    setShortcode(settings.shortcode || "FLAG");
    setTagline(settings.tagline);
    setSeasonTitle(settings.seasonTitle);
    setLogoUrl(settings.logoUrl);
    setDefaultLocation(settings.defaultLocation || "");
    setContactEmail(settings.contactEmail || "");
    setRulebookTitle(settings.rulebookTitle || "");
    setAnnouncement(settings.announcement || "");
    setPrimaryColor(settings.primaryColor);
    setAccentColor(settings.accentColor);
    setVisibility(settings.visibility || "public");
    setRules(settings.rules || DEFAULT_LEAGUE_RULES);

    if (!isLeagueAdmin && activeTab === "branding") {
      setActiveTab("rules");
    }
  }, [settings, isCustomizerOpen, isLeagueAdmin]);

  if (!isCustomizerOpen) return null;

  // League Admin handlers
  const handlePrimaryChange = (val: string) => {
    setPrimaryColor(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      previewThemeColors(val, accentColor);
    }
  };

  const handleSecondaryChange = (val: string) => {
    setAccentColor(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      previewThemeColors(primaryColor, val);
    }
  };

  const handlePlayersOnFieldChange = (count: number) => {
    setRules((prev) => ({
      ...prev,
      playersOnField: count,
      minRosterSize: Math.max(count, prev.minRosterSize),
      maxRosterSize: Math.max(count + 2, prev.maxRosterSize),
    }));
  };

  const handlePeriodTypeChange = (type: "halves" | "quarters") => {
    setRules((prev) => ({
      ...prev,
      periodType: type,
      periodsCount: type === "quarters" ? 4 : 2,
      periodDurationMinutes: type === "quarters" ? 12 : 20,
    }));
  };

  const handleSaveLeagueSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const sanitizedMinRoster = Math.max(rules.playersOnField, rules.minRosterSize);
      const sanitizedMaxRoster = Math.min(30, Math.max(sanitizedMinRoster, rules.maxRosterSize || 30));

      await updateSettings({
        leagueName: leagueName.trim() || "FlagOS League",
        shortcode: shortcode.trim().toUpperCase() || "FLAG",
        tagline: tagline.trim(),
        seasonTitle: seasonTitle.trim() || "Active Season",
        logoUrl: logoUrl.trim(),
        defaultLocation: defaultLocation.trim() || "Field 1",
        contactEmail: contactEmail.trim(),
        rulebookTitle: rulebookTitle.trim(),
        announcement: announcement.trim(),
        primaryColor,
        accentColor,
        themePreset: "custom",
        visibility,
        rules: {
          ...rules,
          minRosterSize: sanitizedMinRoster,
          maxRosterSize: sanitizedMaxRoster,
        },
      });
      closeCustomizer();
    } catch (err) {
      console.error("Error saving league settings:", err);
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCustomizer();
      }}
    >
      <div className="bg-[#0B0F19] border border-cyan-500/30 rounded-3xl max-w-3xl w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        {/* Pinned Header & Tab Navigation */}
        <div className="p-5 sm:p-6 pb-4 border-b border-white/10 bg-[#0B0F19] shrink-0 z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <SettingsIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase text-white tracking-wide flex items-center gap-2">
                  <span>Settings</span>
                  {isLeagueAdmin ? (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      Commissioner Controls
                    </span>
                  ) : isPlayer ? (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Athlete Mode • #{playerData?.number || "00"} {playerData?.playerName}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 border border-white/20">
                      User Preferences
                    </span>
                  )}
                </h2>
                <p className="text-xs text-neutral-400">
                  {isLeagueAdmin
                    ? "Manage league branding, operations, and official gameplay rules site-wide"
                    : "View official league regulations"}
                </p>
              </div>
            </div>
            <button
              onClick={closeCustomizer}
              className="text-neutral-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 p-1 bg-black/60 border border-white/10 rounded-2xl">
          {/* League Admin Tab: Branding */}
          {isLeagueAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab("branding")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "branding"
                ? "bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-md"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
            >
              <Palette className="w-4 h-4" />
              <span>League Branding</span>
            </button>
          )}

          {/* Rules Tab (Edit for League Admin, View-Only for User/Player) */}
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "rules"
              ? "bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow-md"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <Scale className="w-4 h-4" />
            <span>League Rules {isLeagueAdmin ? "" : "(View Only)"}</span>
          </button>

          {/* Season & Archival Tab (League Admin Exclusive) */}
          {isLeagueAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab("season")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "season"
                ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-md"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Season &amp; Archival</span>
            </button>
          )}
        </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto overscroll-contain flex-1 min-h-0 p-5 sm:p-6 md:p-8">
        {/* ============================================================
            TAB: LEAGUE BRANDING & IDENTITY (LEAGUE ADMIN EXCLUSIVE)
           ============================================================ */}
        {activeTab === "branding" && isLeagueAdmin && (
          <form onSubmit={handleSaveLeagueSettings} className="space-y-6">
            {/* Live Multi-Preview Showcase */}
            <div className="p-4 rounded-2xl bg-black/70 border border-white/10 space-y-3">
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
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black uppercase tracking-wider text-white">
                        {renderFlagOS(leagueName || "League Name")}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                        {seasonTitle || "Active Season"}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-cyan-300 font-bold">
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
            <div className="p-5 rounded-2xl bg-black/70 border border-white/10 space-y-4">
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
                      content="Public leagues appear in the global directory and search. Private leagues are hidden and accessible only via direct league URL."
                    />
                  </span>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Choose whether this league appears in the public FlagOS league directory or is accessible only via direct URL.
                  </p>
                </div>
                <span
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider self-start sm:self-auto ${
                    visibility === "public"
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  }`}
                >
                  {visibility === "public" ? "🌐 Public Directory" : "🔒 Private (Direct URL Only)"}
                </span>
              </div>

              {/* Two Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* Public Option */}
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    visibility === "public"
                      ? "bg-emerald-500/10 border-emerald-500/60 shadow-lg shadow-emerald-500/10"
                      : "bg-black/50 border-white/10 hover:border-white/20 text-neutral-400 hover:text-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                        <Globe className="w-4 h-4" />
                        <span>Public League</span>
                      </div>
                      {visibility === "public" && (
                        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-neutral-300">
                      Shows in the <strong>public league directory</strong>. Athletes and teams searching for leagues to join can find, explore, and register for your league.
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                    <span>✓ Discoverable on FlagOS homepage</span>
                  </div>
                </button>

                {/* Private Option */}
                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    visibility === "private"
                      ? "bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/10"
                      : "bg-black/50 border-white/10 hover:border-white/20 text-neutral-400 hover:text-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                        <Lock className="w-4 h-4" />
                        <span>Private League</span>
                      </div>
                      {visibility === "private" && (
                        <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-black">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-neutral-300">
                      <strong>Hidden from the public directory</strong>. Unlisted from search results. Can only be accessed by visitors who have the direct URL link.
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-1.5 text-[10px] font-mono text-amber-400">
                    <span>🔒 Accessible via direct URL only</span>
                  </div>
                </button>
              </div>

              {/* Direct Access Link Box */}
              <div className="mt-3 p-3.5 rounded-xl bg-black border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-neutral-400 font-bold flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Direct Access URL</span>
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {visibility === "private" ? "Exclusive entry link for private participants" : "Shareable direct portal link"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== "undefined" ? `${window.location.origin}/league/${activeLeagueId}` : `/league/${activeLeagueId}`}
                    className="flex-1 bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-neutral-300 select-all"
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
            <div className="border-b border-white/10 pb-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>1. League Identity & Details</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                    <span>League Full Name *</span>
                    <FieldHelpTooltip
                      title="League Name"
                      content="The primary official organization title displayed on schedules, standings, game summaries, and public promotional pages."
                    />
                  </label>
                  <input
                    type="text"
                    required
                    value={leagueName}
                    onChange={(e) => setLeagueName(e.target.value)}
                    placeholder="e.g. Metro Flag Football League"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-amber-500 text-white text-xs outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                    <span>League Shortcode</span>
                    <FieldHelpTooltip
                      title="Shortcode"
                      content="A 2 to 6 character acronym used in compact badges, box scores, and breadcrumb navigation (e.g. MFL, AFFL, NFL)."
                    />
                  </label>
                  <input
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
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                    <span>Season Title / Edition</span>
                    <FieldHelpTooltip
                      title="Season Edition"
                      content="The active competition cycle or campaign name (e.g. 2026 Spring Championship, Fall Invitational)."
                    />
                  </label>
                  <input
                    type="text"
                    value={seasonTitle}
                    onChange={(e) => setSeasonTitle(e.target.value)}
                    placeholder="e.g. 2026 Spring Championship"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-amber-500 text-white text-xs outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                    <span>Tagline / Motto</span>
                    <FieldHelpTooltip
                      title="Tagline"
                      content="A descriptive slogan or division tier indicator shown below the league title across headers and cards."
                    />
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. The Premier 7v7 Non-Contact Flag Circuit"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-amber-500 text-white text-xs outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                  <span>League Crest / Logo URL</span>
                  <FieldHelpTooltip
                    title="League Crest"
                    content="Direct image link for your official league emblem. If left empty, default FlagOS brand styling is displayed."
                  />
                </label>
                <input
                  type="Url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/league-logo.png"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-amber-500 text-white text-xs outline-none transition-colors"
                />
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
            <div className="border-b border-white/10 pb-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>2. Operations & Venue Information</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                    <span>Default Game Field / Complex</span>
                    <FieldHelpTooltip
                      title="Default Venue"
                      content="The primary sports complex or home turf used when games don't specify a custom location."
                    />
                  </label>
                  <input
                    type="text"
                    value={defaultLocation}
                    onChange={(e) => setDefaultLocation(e.target.value)}
                    placeholder="e.g. Central Park Field 1"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                    <span>Rulebook Title</span>
                    <FieldHelpTooltip
                      title="Rulebook Title"
                      content="Title shown on the public rulebook link and document download button."
                    />
                  </label>
                  <input
                    type="text"
                    value={rulebookTitle}
                    onChange={(e) => setRulebookTitle(e.target.value)}
                    placeholder="e.g. Official 7v7 Flag Rules"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                    <span>Rulebook Link (URL)</span>
                    <FieldHelpTooltip
                      title="Rulebook Link"
                      content="Direct URL pointing to an official PDF or web page with your league's complete rules and constitution."
                    />
                  </label>
                  <input
                    type="href"
                    value={rulebookUrl}
                    onChange={(e) => setRulebookUrl(e.target.value)}
                    placeholder="e.g. https://example.com/rules.pdf"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                    <span>Commissioner Contact Email</span>
                    <FieldHelpTooltip
                      title="Contact Email"
                      content="Public contact address for team managers, coaches, and athletes with inquiries."
                    />
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="e.g. info@flagleague.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-1.5">
                  <span>Site-Wide Announcement Banner (Optional)</span>
                  <FieldHelpTooltip
                    title="Announcement Banner"
                    content="A notice shown prominently across the dashboard (e.g. weather alerts, playoff seedings, registration deadlines)."
                  />
                </label>
                <input
                  type="text"
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  placeholder="e.g. Playoffs schedule published! Registration for Spring 2026 is officially open."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none transition-colors"
                />
              </div>
            </div>

            {/* Section 3: Official League Colours */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  <span>3. Official League Colours</span>
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
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
                      color: "#ffffff",
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
                          color: accentColor,
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
                      className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/10 focus:border-purple-400 text-white font-mono text-xs uppercase outline-none transition-colors"
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
                      className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/10 focus:border-purple-400 text-white font-mono text-xs uppercase outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-[#0B0F19]/95 backdrop-blur-md pt-4 pb-2 border-t border-white/10 flex items-center justify-between gap-3 z-20 mt-6 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
              <button
                type="button"
                onClick={closeCustomizer}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? "Saving Changes..." : "Apply League Branding"}</span>
              </button>
            </div>
          </form>
        )}

        {/* ============================================================
            TAB: RULES & REGULATIONS (EDITABLE BY ADMIN, VIEW-ONLY BY OTHERS)
           ============================================================ */}
        {/* ============================================================
            TAB: RULES & REGULATIONS (ADMIN EDIT FORM)
           ============================================================ */}
        {activeTab === "rules" && isLeagueAdmin && (
          <form onSubmit={handleSaveLeagueSettings} className="space-y-6">

            {/* Rule 1: Players on field */}
            <div className="border-b border-white/10 pb-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>1. Players on the Field (Per Side)</span>
                  <FieldHelpTooltip
                    title="Squad Format"
                    content="Number of active athletes per squad on the field at one time (e.g. 5v5 for Olympic IFAF standard, 7v7 or 8v8 for contact/screen styles)."
                  />
                </span>
                <span className="text-[10px] font-mono font-bold text-neutral-400">
                  {rules.playersOnField} vs {rules.playersOnField}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {[4, 5, 6, 7, 8].map((count) => {
                  const isSelected = rules.playersOnField === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      disabled={!isLeagueAdmin}
                      onClick={() => handlePlayersOnFieldChange(count)}
                      className={`py-3 px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${isSelected
                        ? "bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/15"
                        : "bg-black/40 border-white/10 text-neutral-400"
                        } ${isLeagueAdmin ? "cursor-pointer hover:text-white hover:border-white/20" : "cursor-default opacity-85"}`}
                    >
                      <span className="text-base font-black font-mono tracking-tight text-white">
                        {count}v{count}
                      </span>
                      <span className="text-[9px] uppercase font-bold text-neutral-400">
                        {count === 4 && "4v4"}
                        {count === 5 && "5v5"}
                        {count === 6 && "6v6"}
                        {count === 7 && "7v7"}
                        {count === 8 && "8v8"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rule 2: Periods & Clock */}
            <div className="border-b border-white/10 pb-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>2. Game Periods & Clock Structure</span>
                  <FieldHelpTooltip
                    title="Game Clock Structure"
                    content="Configure match timing, whether divided into two halves or four quarters, period length in minutes, and halftime duration."
                  />
                </span>
                <span className="text-[10px] font-mono font-bold text-neutral-400">
                  {rules.periodsCount} {rules.periodType === "quarters" ? "Quarters" : "Halves"} @ {rules.periodDurationMinutes} mins
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-2">
                    <span>Format</span>
                    <FieldHelpTooltip
                      title="Period Division"
                      content="Halves (traditional 2 halves) or Quarters (4 shorter periods with breaks between)."
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!isLeagueAdmin}
                      onClick={() => handlePeriodTypeChange("halves")}
                      className={`p-3 rounded-xl border text-left transition-all ${rules.periodType === "halves"
                        ? "bg-cyan-500/20 border-cyan-400 text-white"
                        : "bg-black/40 border-white/10 text-neutral-400"
                        } ${isLeagueAdmin ? "cursor-pointer hover:border-white/20" : "cursor-default"}`}
                    >
                      <div className="text-xs font-black uppercase text-white">Halves</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">Traditional 1st & 2nd Half</div>
                    </button>

                    <button
                      type="button"
                      disabled={!isLeagueAdmin}
                      onClick={() => handlePeriodTypeChange("quarters")}
                      className={`p-3 rounded-xl border text-left transition-all ${rules.periodType === "quarters"
                        ? "bg-cyan-500/20 border-cyan-400 text-white"
                        : "bg-black/40 border-white/10 text-neutral-400"
                        } ${isLeagueAdmin ? "cursor-pointer hover:border-white/20" : "cursor-default"}`}
                    >
                      <div className="text-xs font-black uppercase text-white">Quarters</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">4 quarters with short breaks between</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-2">
                    <span>Duration Per Period (Minutes)</span>
                    <FieldHelpTooltip
                      title="Period Duration"
                      content="Clock duration for each quarter or half of regulation play."
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    {[10, 12, 15, 20, 25].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        disabled={!isLeagueAdmin}
                        onClick={() => setRules((prev) => ({ ...prev, periodDurationMinutes: mins }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${rules.periodDurationMinutes === mins
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                          : "bg-black/40 border-white/10 text-neutral-400"
                          } ${isLeagueAdmin ? "cursor-pointer hover:text-white" : "cursor-default"}`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                  {isLeagueAdmin && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-neutral-500">Custom minutes:</span>
                      <input
                        type="number"
                        min={5}
                        max={60}
                        value={rules.periodDurationMinutes}
                        onChange={(e) =>
                          setRules((prev) => ({
                            ...prev,
                            periodDurationMinutes: Math.max(1, parseInt(e.target.value) || 20),
                          }))
                        }
                        className="w-16 px-2 py-1 rounded-lg bg-black/60 border border-white/10 text-white font-mono text-xs text-center"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Halftime break */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                    <span>Halftime Intermission Duration</span>
                    <FieldHelpTooltip
                      title="Halftime Break"
                      content="Countdown duration displayed on the scoreboard clock during the halftime break."
                    />
                  </span>
                  <span className="text-[10px] text-neutral-500">Break clock shown between periods</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[60, 120, 300].map((secs) => (
                    <button
                      key={secs}
                      type="button"
                      disabled={!isLeagueAdmin}
                      onClick={() => setRules((prev) => ({ ...prev, halftimeDurationSeconds: secs }))}
                      className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all ${rules.halftimeDurationSeconds === secs
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                        : "bg-black/60 border-white/10 text-neutral-400"
                        } ${isLeagueAdmin ? "cursor-pointer hover:text-white" : "cursor-default"}`}
                    >
                      {secs / 60} min
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Rule 3: Timeouts */}
            <div className="border-b border-white/10 pb-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" />
                <span>3. Timeouts & Stoppages</span>
                <FieldHelpTooltip
                  title="Timeouts & Stoppages"
                  content="Number of charged timeouts permitted per team, clock stoppage duration, and reset rules per period."
                />
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-2">
                    <span>Timeouts Per Team</span>
                    <FieldHelpTooltip
                      title="Timeout Quota"
                      content="Number of team timeouts allowed per game or period."
                    />
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((t) => (
                      <button
                        key={t}
                        type="button"
                        disabled={!isLeagueAdmin}
                        onClick={() => setRules((prev) => ({ ...prev, timeoutsPerTeam: t }))}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${rules.timeoutsPerTeam === t
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                          : "bg-black/40 border-white/10 text-neutral-400"
                          } ${isLeagueAdmin ? "cursor-pointer hover:text-white" : "cursor-default"}`}
                      >
                        {t} {t === 1 ? "TO" : "TOs"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-2">
                    <span>Timeout Duration</span>
                    <FieldHelpTooltip
                      title="Timeout Duration"
                      content="Length of timeout countdown in seconds before teams must return to the huddle."
                    />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[30, 60, 90].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        disabled={!isLeagueAdmin}
                        onClick={() => setRules((prev) => ({ ...prev, timeoutDurationSeconds: sec }))}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${rules.timeoutDurationSeconds === sec
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                          : "bg-black/40 border-white/10 text-neutral-400"
                          } ${isLeagueAdmin ? "cursor-pointer hover:text-white" : "cursor-default"}`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Reset Timeouts Each Period/Half</span>
                    <FieldHelpTooltip
                      title="Timeout Reset Policy"
                      content="If enabled, timeouts replenish to maximum after every intermission. If disabled, total timeouts are pooled across the full game."
                    />
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    When enabled, teams get fresh timeouts each period; otherwise timeouts are for the entire game.
                  </span>
                </div>
                <input
                  type="checkbox"
                  disabled={!isLeagueAdmin}
                  checked={rules.timeoutsResetPerPeriod}
                  onChange={(e) => setRules((prev) => ({ ...prev, timeoutsResetPerPeriod: e.target.checked }))}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 border-white/20 cursor-pointer accent-cyan-500"
                />
              </div>
            </div>

            {/* Rule 4: Downs & Scrimmage */}
            <div className="border-b border-white/10 pb-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                <span>4. Downs & Scrimmage Rules</span>
                <FieldHelpTooltip
                  title="Downs & Scrimmage"
                  content="Gridiron progression rules including series down count, defensive rush mark distance, and play clock interval."
                />
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-2">
                    <span>Downs Per Series</span>
                    <FieldHelpTooltip
                      title="Downs Allowed"
                      content="Attempts allowed to cross midfield for a first down or score a touchdown (3 downs Canadian style, 4 downs American style)."
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!isLeagueAdmin}
                      onClick={() => setRules((prev) => ({ ...prev, downsPerSeries: 3 }))}
                      className={`p-2.5 rounded-xl border text-center transition-all ${rules.downsPerSeries === 3
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                        : "bg-black/40 border-white/10 text-neutral-400"
                        } ${isLeagueAdmin ? "cursor-pointer hover:text-white" : "cursor-default"}`}
                    >
                      <span className="text-sm font-black block">3 Downs</span>
                      <span className="text-[9px] text-neutral-400">Canadian Standard</span>
                    </button>

                    <button
                      type="button"
                      disabled={!isLeagueAdmin}
                      onClick={() => setRules((prev) => ({ ...prev, downsPerSeries: 4 }))}
                      className={`p-2.5 rounded-xl border text-center transition-all ${rules.downsPerSeries === 4
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                        : "bg-black/40 border-white/10 text-neutral-400"
                        } ${isLeagueAdmin ? "cursor-pointer hover:text-white" : "cursor-default"}`}
                    >
                      <span className="text-sm font-black block">4 Downs</span>
                      <span className="text-[9px] text-neutral-400">American Standard</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-2">
                    <span>Rush Distance</span>
                    <FieldHelpTooltip
                      title="Rush Line Marker"
                      content="Minimum distance in yards behind the line of scrimmage from which defensive rushers must initiate their rush."
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 5, 7, 10].map((yds) => (
                      <button
                        key={yds}
                        type="button"
                        disabled={!isLeagueAdmin}
                        onClick={() => setRules((prev) => ({ ...prev, rushLineDistance: yds }))}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${rules.rushLineDistance === yds
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                          : "bg-black/40 border-white/10 text-neutral-400"
                          } ${isLeagueAdmin ? "cursor-pointer hover:text-white" : "cursor-default"}`}
                      >
                        {yds} Yds
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-2">
                    <span>Play Clock Duration</span>
                    <FieldHelpTooltip
                      title="Play Clock"
                      content="Time in seconds between official ball ready signal and snap before a delay of game penalty."
                    />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[25, 30, 40].map((clk) => (
                      <button
                        key={clk}
                        type="button"
                        disabled={!isLeagueAdmin}
                        onClick={() => setRules((prev) => ({ ...prev, playClockSeconds: clk }))}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${rules.playClockSeconds === clk
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                          : "bg-black/40 border-white/10 text-neutral-400"
                          } ${isLeagueAdmin ? "cursor-pointer hover:text-white" : "cursor-default"}`}
                      >
                        {clk}s
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-neutral-500 mt-1.5 block">
                    Referee play clock between downs
                  </span>
                </div>
              </div>
            </div>

            {/* Rule 5: Roster Limits */}
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>5. Roster Size Limits & Compliance</span>
                <FieldHelpTooltip
                  title="Roster Sizes"
                  content="Set minimum roster compliance thresholds and maximum athlete limits per team."
                />
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5">
                    <span>Minimum Roster Size</span>
                    <FieldHelpTooltip
                      title="Minimum Roster"
                      content="Minimum number of active athletes required on a team roster. Teams with fewer players show compliance warnings."
                    />
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      disabled={!isLeagueAdmin}
                      min={rules.playersOnField}
                      max={30}
                      value={rules.minRosterSize}
                      onChange={(e) =>
                        setRules((prev) => ({
                          ...prev,
                          minRosterSize: Math.max(prev.playersOnField, parseInt(e.target.value) || prev.playersOnField),
                        }))
                      }
                      className="w-20 px-3 py-2 rounded-xl bg-black/80 border border-white/10 text-white font-mono font-bold text-center text-sm disabled:opacity-80"
                    />
                    <span className="text-[11px] text-neutral-400 leading-tight">
                      Must be at least <span className="text-cyan-300 font-bold">{rules.playersOnField}</span>. Teams below show compliance alerts and may be ineligible.
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5">
                    <span>Maximum Roster Size</span>
                    <FieldHelpTooltip
                      title="Roster Cap"
                      content="Hard cap on team roster size. Managers cannot add more players once this number is reached."
                    />
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      disabled={!isLeagueAdmin}
                      min={rules.minRosterSize}
                      max={30}
                      value={rules.maxRosterSize}
                      onChange={(e) =>
                        setRules((prev) => ({
                          ...prev,
                          maxRosterSize: Math.min(30, Math.max(prev.minRosterSize, parseInt(e.target.value) || prev.minRosterSize)),
                        }))
                      }
                      className="w-20 px-3 py-2 rounded-xl bg-black/80 border border-white/10 text-white font-mono font-bold text-center text-sm disabled:opacity-80"
                    />
                    <span className="text-[11px] text-neutral-400 leading-tight">
                      Hard cap of 30 players. Teams cannot add players once this limit is reached.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rule 6: Free Agent Pool & Public Registration Form */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>6. Free Agent Pool & Public Registration Form</span>
                  <FieldHelpTooltip
                    title="Free Agent Draft Pool"
                    content="Allows prospective athletes to register independently through the public join form and pool together for team draft selection."
                  />
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${rules.enableFreeAgents !== false
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-red-500/20 text-red-300 border-red-500/40"
                    }`}
                >
                  {rules.enableFreeAgents !== false ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Controls whether athletes can register online via the{" "}
                  {canViewJoinLink ? (
                    <Link
                      href={customJoinPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 underline font-bold inline-flex items-center gap-1"
                      title="Open League Custom Join Form"
                    >
                      <span>Join Form</span>
                      <ExternalLink className="w-3 h-3 inline" />
                    </Link>
                  ) : (
                    <span className="font-bold text-neutral-300">Join Form</span>
                  )}{" "}
                  and whether the Free Agent pool of unassigned players appears on the Teams page for admins.
                </p>

                {canViewJoinLink && (
                  <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-[10px] uppercase font-bold text-neutral-400 shrink-0 font-mono">
                        Custom Join Link:
                      </span>
                      <Link
                        href={customJoinPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-cyan-300 hover:underline truncate"
                      >
                        {customJoinUrl}
                      </Link>
                      {!isFreeAgentRegistrationEnabled && isLeagueAdmin && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold shrink-0">
                          Admin Preview (Disabled to Public)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          navigator.clipboard?.writeText(customJoinUrl);
                          setCopiedJoinLink(true);
                          setTimeout(() => setCopiedJoinLink(false), 2000);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedJoinLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Join Link</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Public Join Form & Free Agent Pool
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {rules.enableFreeAgents !== false
                      ? "Athletes can register online and appear in the Free Agent draft pool on Teams page until assigned."
                      : "Registration is closed and Free Agent list is hidden from the Teams page."}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!isLeagueAdmin}
                  onClick={() =>
                    setRules((prev) => ({
                      ...prev,
                      enableFreeAgents: !(prev.enableFreeAgents !== false),
                    }))
                  }
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 flex items-center gap-2 ${rules.enableFreeAgents !== false
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/10"
                    : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                    } ${isLeagueAdmin ? "cursor-pointer" : "cursor-default opacity-85"}`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${rules.enableFreeAgents !== false
                      ? "bg-emerald-500 border-emerald-400 text-black"
                      : "border-white/20"
                      }`}
                  >
                    {rules.enableFreeAgents !== false && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span>{rules.enableFreeAgents !== false ? "Enabled" : "Disabled"}</span>
                </button>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeCustomizer}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleResetToIFAF}
                  className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 hover:text-amber-200 border border-amber-500/20 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reset to IFAF 5v5</span>
                </button>
              </div>

              {/* Notification when IFAF preset is loaded */}
              {ifafPresetNotice && (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between gap-3 font-mono shadow-lg shadow-emerald-950/50">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Official IFAF 5v5 Preset Loaded <strong> Remember to click &quot;Apply &amp; Save Settings&quot;.  </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIfafPresetNotice(false)}
                    className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? "Saving Changes..." : "Apply & Save Settings"}</span>
              </button>
            </div>
          </form>
        )}

        {/* ============================================================
            TAB: RULES & REGULATIONS (CONCISE VIEW-ONLY SUMMARY FOR NON-ADMINS)
           ============================================================ */}
        {activeTab === "rules" && !isLeagueAdmin && (
          <div className="space-y-6">
            {/* Header Status Bar */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-blue-950/20 to-black/40 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-cyan-300 tracking-wide">
                      Official League Rules
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Official Rulebook
                    </span>
                  </div>
                  <span className="text-[11px] text-cyan-100/70 block mt-0.5">
                    Current active gameplay parameters set by the League Commissioner for all teams and games.
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Squad Format</span>
                <span className="text-xl font-black font-mono text-cyan-400 mt-1">{rules.playersOnField} vs {rules.playersOnField}</span>
                <span className="text-[10px] text-neutral-400 mt-0.5">Per side on field</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Game Clock</span>
                <span className="text-xl font-black font-mono text-white mt-1">
                  {rules.periodsCount} × {rules.periodDurationMinutes}m
                </span>
                <span className="text-[10px] text-neutral-400 mt-0.5">{rules.periodsCount * rules.periodDurationMinutes}m regulation</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Downs / Series</span>
                <span className="text-xl font-black font-mono text-amber-400 mt-1">{rules.downsPerSeries} Downs</span>
                <span className="text-[10px] text-neutral-400 mt-0.5">To line to gain / score</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Rush Line</span>
                <span className="text-xl font-black font-mono text-orange-400 mt-1">{rules.rushLineDistance} Yards</span>
                <span className="text-[10px] text-neutral-400 mt-0.5">Behind scrimmage</span>
              </div>
            </div>

            {/* Detailed Rule Cards (Active Selections Only) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: On-field Format */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Players On The Field</h4>
                      <p className="text-[11px] text-neutral-400">Active roster alignment per side</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-cyan-500/15 border border-cyan-400/40 text-cyan-300">
                    {rules.playersOnField}v{rules.playersOnField}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-neutral-300 leading-relaxed">
                  The play designer, defensive alignment, and rosters operate on a <strong>{rules.playersOnField}-player per side</strong> format.
                </div>
              </div>

              {/* Card 2: Game Timing */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-blue-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Game Clock & Periods</h4>
                      <p className="text-[11px] text-neutral-400">Regulation timing & interval break</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-blue-500/15 border border-blue-400/40 text-blue-300">
                    {rules.periodsCount} {rules.periodType === "quarters" ? "Quarters" : "Halves"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-neutral-300 leading-relaxed">
                  Games consist of <strong>{rules.periodsCount} {rules.periodType === "quarters" ? "quarters" : "halves"} of {rules.periodDurationMinutes} minutes</strong> ({rules.periodsCount * rules.periodDurationMinutes} min total). Halftime interval is <strong>{rules.halftimeDurationSeconds >= 60 ? `${Math.round(rules.halftimeDurationSeconds / 60)} minutes` : `${rules.halftimeDurationSeconds}s`}</strong>.
                </div>
              </div>

              {/* Card 3: Downs & Series */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Downs Per Series</h4>
                      <p className="text-[11px] text-neutral-400">Offensive possessions to cross midfield</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-amber-500/15 border border-amber-400/40 text-amber-300">
                    {rules.downsPerSeries} Downs
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-neutral-300 leading-relaxed">
                  Offenses receive <strong>{rules.downsPerSeries} downs</strong> to cross the midfield line to gain. Upon crossing midfield, the team receives another set of <strong>{rules.downsPerSeries} downs</strong> to score a touchdown.
                </div>
              </div>

              {/* Card 4: Rush Line Distance */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-orange-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Rush Distance</h4>
                      <p className="text-[11px] text-neutral-400">Defensive rusher alignment constraint</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-orange-500/15 border border-orange-400/40 text-orange-300">
                    {rules.rushLineDistance} Yards
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-neutral-300 leading-relaxed">
                  All defensive rushers must be positioned at least <strong>{rules.rushLineDistance} yards</strong> behind the line of scrimmage at the snap to be eligible to rush the passer.
                </div>
              </div>

              {/* Card 5: Play Clock */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-violet-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                      <Timer className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Offensive Play Clock</h4>
                      <p className="text-[11px] text-neutral-400">Pace of play between downs</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-violet-500/15 border border-violet-400/40 text-violet-300">
                    {rules.playClockSeconds} Seconds
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-neutral-300 leading-relaxed">
                  Offenses must snap the football within <strong>{rules.playClockSeconds} seconds</strong> from the official ready-for-play signal to prevent delay-of-game penalties.
                </div>
              </div>

              {/* Card 6: Timeouts */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Timeouts & Stoppages</h4>
                      <p className="text-[11px] text-neutral-400">Team clock stoppages and duration</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-emerald-500/15 border border-emerald-400/40 text-emerald-300">
                    {rules.timeoutsPerTeam} × {rules.timeoutDurationSeconds}s
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-neutral-300 leading-relaxed">
                  Teams are granted <strong>{rules.timeoutsPerTeam} timeouts ({rules.timeoutDurationSeconds} seconds each)</strong> {rules.timeoutsResetPerPeriod ? `per ${rules.periodType === "quarters" ? "quarter" : "half"}` : "per entire game"}. Timeouts do not carry over.
                </div>
              </div>

              {/* Card 7: Roster Capacity */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Roster Capacity</h4>
                      <p className="text-[11px] text-neutral-400">Team registration requirements</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-indigo-500/15 border border-indigo-400/40 text-indigo-300">
                    {rules.minRosterSize} - {rules.maxRosterSize} Players
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-neutral-300 leading-relaxed">
                  Every active franchise must maintain a minimum of <strong>{rules.minRosterSize} players</strong> and is capped at <strong>{rules.maxRosterSize} players</strong> on their registered roster.
                </div>
              </div>

              {/* Card 8: Free Agent Draft Pool */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-pink-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Free Agent Registration</h4>
                      <p className="text-[11px] text-neutral-400">Draft pool & open signups</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black font-mono ${rules.enableFreeAgents !== false
                    ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-300"
                    : "bg-neutral-500/15 border border-neutral-400/40 text-neutral-300"
                    }`}>
                    {rules.enableFreeAgents !== false ? "Active / Open" : "Closed"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-neutral-300 leading-relaxed space-y-2">
                  <p>
                    {rules.enableFreeAgents !== false ? (
                      <>
                        The Free Agent{" "}
                        <Link
                          href={customJoinPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 underline font-bold inline-flex items-center gap-1"
                          title="Open Free Agent Join Form"
                        >
                          <span>Join Form</span>
                          <ExternalLink className="w-3 h-3 inline" />
                        </Link>{" "}
                        is open for public registration, and unassigned players appear in the Free Agent pool ready to be claimed.
                      </>
                    ) : (
                      "The Free Agent Join Form and unassigned draft pool are currently closed by league administration."
                    )}
                  </p>

                  {canViewJoinLink && rules.enableFreeAgents !== false && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-cyan-300 font-mono truncate">
                        {customJoinUrl}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            navigator.clipboard?.writeText(customJoinUrl);
                            setCopiedJoinLink(true);
                            setTimeout(() => setCopiedJoinLink(false), 2000);
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-white text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedJoinLink ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
              <div className="text-[11px] text-neutral-400 flex items-center gap-2 font-mono">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>To propose changes to these rules, contact the League Commissioner.</span>
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
        )}

        {/* ============================================================
            TAB: SEASON & ARCHIVAL (LEAGUE COMMISSIONER)
           ============================================================ */}
        {activeTab === "season" && isLeagueAdmin && (
          <div className="space-y-6">
            {/* Header / Current Season Status Card */}
            <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4">
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
                      Circuit Lifecycle &amp; Archival Management
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
                    ${subscription?.totalMonthlyFee || 89}/mo
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
            {!isLeagueArchived && !isSubscriptionPastDue && (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                    <Archive className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase tracking-wider text-white">Conclude Season &amp; Archive League</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      When your playoff championship game ends and the season is officially over, conclude the circuit. All game box scores, standings, player career statistics, and team histories will remain preserved permanently for your coaches, players, and spectators in read-only mode.
                    </p>
                  </div>
                </div>

                {!showArchivePrompt ? (
                  <button
                    type="button"
                    onClick={() => setShowArchivePrompt(true)}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
                  >
                    Mark Season Concluded &amp; Archive Circuit
                  </button>
                ) : (
                  <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-4 animate-in fade-in">
                    <div className="space-y-1">
                      <div className="text-xs font-black uppercase text-purple-200">
                        Season Concluded! What would you like to do with your subscription?
                      </div>
                      <p className="text-xs text-neutral-300">
                        Select whether you want to conclude and pause billing or start your next league circuit:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={archivingInProgress}
                        onClick={async () => {
                          setArchivingInProgress(true);
                          await archiveLeague("pause_subscription");
                          setArchivingInProgress(false);
                          setShowArchivePrompt(false);
                        }}
                        className="p-3.5 rounded-xl bg-black/60 border border-white/10 hover:border-purple-400 text-left transition-all cursor-pointer group"
                      >
                        <div className="text-xs font-black uppercase text-white group-hover:text-purple-300">
                          1. End / Pause Subscription
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-1">
                          Archives this league into permanent historical read-only mode. No further monthly charges. All player career stats &amp; box scores remain intact for free.
                        </div>
                      </button>

                      <button
                        type="button"
                        disabled={archivingInProgress}
                        onClick={async () => {
                          setArchivingInProgress(true);
                          await archiveLeague("new_season");
                          setArchivingInProgress(false);
                          setShowArchivePrompt(false);
                        }}
                        className="p-3.5 rounded-xl bg-black/60 border border-cyan-500/30 hover:border-cyan-400 text-left transition-all cursor-pointer group"
                      >
                        <div className="text-xs font-black uppercase text-white group-hover:text-cyan-300">
                          2. Begin Another League / New Season
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-1">
                          Conclude this season's results into history, and roll existing rosters into a brand new season schedule while keeping your subscription active.
                        </div>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowArchivePrompt(false)}
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
              <div className="p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-4">
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
                    await resumeSubscription();
                  }}
                  className="py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Reactivate League / Start Next Season
                </button>
              </div>
            )}

            {/* If Past Due */}
            {isSubscriptionPastDue && (
              <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-4">
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
                    await resumeSubscription();
                  }}
                  className="py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Update Payment &amp; Resume Subscription
                </button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div >
  );
}
