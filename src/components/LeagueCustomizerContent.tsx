"use client";

import type { LeaguePlayerInfo, LeagueVenueInfo } from "@/lib/leaguePublicProfile";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePageGuide } from "@/lib/pageGuide";
import { LEAGUE_SETTINGS_GUIDES, LEAGUE_RULES_VIEW_GUIDE } from "@/lib/walkthroughs/admin";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";
import { useLeague, LeagueRules, DEFAULT_LEAGUE_RULES, IFAF_5V5_RULES } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import { leagueMonthlyTotal } from "@/lib/leaguePlanCost";
import { rosterHardCap } from "@/lib/rosterLimits";
import {
  Palette,
  X,
  Scale,
  Settings as SettingsIcon,
  Lock,
  Calendar,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { isRealTeam } from "@/components/TeamAssets";
import { getSandboxTeams } from "@/lib/demoSandbox";
import LeagueCustomizerSubscriptionTab from "@/components/league/customizer/LeagueCustomizerSubscriptionTab";
import LeagueCustomizerSeasonTab from "@/components/league/customizer/LeagueCustomizerSeasonTab";
import LeagueCustomizerRulesTab from "@/components/league/customizer/LeagueCustomizerRulesTab";
import LeagueCustomizerBrandingTab, { isAcceptableLogoUrl } from "@/components/league/customizer/LeagueCustomizerBrandingTab";



export default function LeagueCustomizerContent() {
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
    updateSubscriptionTeamCount,
    addTeamToSubscription,
    removeTeamFromSubscription,
    isDemoLeague,
    seasons,
    startNewSeason,
  } = useLeague();
  const { isLeagueAdmin, isPlayer, playerData } = useAuth();

  const [activeTab, setActiveTab] = useState<"branding" | "rules" | "subscription" | "season">(
    isLeagueAdmin ? "branding" : "rules"
  );
  usePageGuide(isCustomizerOpen ? (!isLeagueAdmin && activeTab === "rules" ? LEAGUE_RULES_VIEW_GUIDE : LEAGUE_SETTINGS_GUIDES[activeTab]) : null, 2);
  const [showArchivePrompt, setShowArchivePrompt] = useState(false);
  const [archivingInProgress, setArchivingInProgress] = useState(false);
  const [newSeasonTitle, setNewSeasonTitle] = useState<string | null>(null);
  const [seasonStartedMsg, setSeasonStartedMsg] = useState("");

  // Subscription team management states
  const [targetTeamCount, setTargetTeamCount] = useState<number>(subscription?.teamCount ?? 8);
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);
  const [isOpeningBilling, setIsOpeningBilling] = useState(false);
  const [subSuccessMsg, setSubSuccessMsg] = useState("");
  const [subTeamsList, setSubTeamsList] = useState<{ id: string; name: string; shortcode?: string; primaryColor?: string }[]>([]);
  const [loadingSubTeams, setLoadingSubTeams] = useState(false);
  const [newSubTeamName, setNewSubTeamName] = useState("");
  const [isSubmittingNewTeam, setIsSubmittingNewTeam] = useState(false);

  useEffect(() => {
    if (subscription?.teamCount) {
      setTargetTeamCount(subscription.teamCount);
    }
  }, [subscription?.teamCount]);

  const isComplimentary = subscription?.paymentMethod === "complimentary";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        const hasGuideOpen = Boolean(document.querySelector('.walkthrough-modal, [class*="walkthrough"]'));
        if (!hasGuideOpen) {
          closeCustomizer();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeCustomizer]);

  const loadSubTeams = async () => {
    setLoadingSubTeams(true);
    try {
      if (isDemoLeague) {
        const demoTeams = (getSandboxTeams() as unknown as { id: string; name: string; shortcode?: string; primaryColor?: string }[]).filter(isRealTeam);
        setSubTeamsList(demoTeams);
      } else {
        const snap = await getDocs(
          query(collection(db, "teams"), where("leagueId", "==", activeLeagueId), limit(64))
        );
        const t = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).filter(isRealTeam);
        setSubTeamsList(t);
      }
    } catch (e) {
      console.warn("Could not load teams for subscription manager:", e);
    } finally {
      setLoadingSubTeams(false);
    }
  };

  useEffect(() => {
    if (activeTab === "subscription") {
      void loadSubTeams();
    }
  }, [activeTab, activeLeagueId, isDemoLeague]);

  const handleUpdateSubscriptionCount = async (count: number) => {
    setIsUpdatingSub(true);
    setSubSuccessMsg("");
    try {
      const previous = subscription?.teamCount ?? 8;
      await updateSubscriptionTeamCount(count);
      const total = leagueMonthlyTotal(subscription, count);
      setSubSuccessMsg(isComplimentary
        ? `Capacity updated to ${count} teams.`
        : count > previous
          ? `Plan updated to ${count} teams. The added slots were charged a prorated amount today; your renewal price is now $${total}/mo.`
          : `Plan updated to ${count} teams. Your price drops to $${total}/mo from your next renewal.`);
      setTimeout(() => setSubSuccessMsg(""), 5000);
      await loadSubTeams();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to update subscription.");
    } finally {
      setIsUpdatingSub(false);
    }
  };

  const handleQuickAddTeam = async () => {
    setIsSubmittingNewTeam(true);
    setSubSuccessMsg("");
    try {
      const teamsInUse = subTeamsList.length;
      const teamNameToUse = newSubTeamName.trim() || `Team ${teamsInUse + 1}`;
      const { newSubscription, seatAdded } = await addTeamToSubscription(teamNameToUse, { teamsInUse });
      setNewSubTeamName("");
      const seats = newSubscription?.teamCount ?? subscription?.teamCount ?? 8;
      setSubSuccessMsg(!seatAdded
        ? `Added "${teamNameToUse}" to an open slot (${teamsInUse + 1} of ${seats} used). No change to your bill.`
        : isComplimentary
          ? `Added "${teamNameToUse}" and raised capacity to ${seats} teams.`
          : `Added "${teamNameToUse}" and grew your plan to ${seats} teams. Today's prorated charge is complete; renewals are now $${leagueMonthlyTotal(newSubscription, seats)}/mo.`);
      setTimeout(() => setSubSuccessMsg(""), 5000);
      await loadSubTeams();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to add team to subscription.");
    } finally {
      setIsSubmittingNewTeam(false);
    }
  };

  const handleQuickRemoveTeam = async (teamId: string, teamName: string) => {
    const nextCount = Math.max(2, (subscription?.teamCount ?? 8) - 1);
    const confirmed = window.confirm(
      `${isDemoLeague ? "DEMO \u2014 nothing is saved or charged.\n\n" : ""}${isComplimentary
        ? `Remove "${teamName}" from the league and reduce capacity to ${nextCount} teams? No charges apply.`
        : `Remove "${teamName}" from the league and reduce your subscription by $20/month starting at your next monthly payment (new cost: $${40 + nextCount * 20}/mo)?`}`
    );
    if (!confirmed) return;
    setIsUpdatingSub(true);
    setSubSuccessMsg("");
    try {
      await removeTeamFromSubscription(teamId);
      setSubSuccessMsg(isComplimentary
        ? `Removed "${teamName}" and reduced capacity to ${nextCount} teams.`
        : `Removed "${teamName}" and reduced subscription to ${nextCount} teams ($${40 + nextCount * 20}/mo at next payment).`);
      setTimeout(() => setSubSuccessMsg(""), 5000);
      await loadSubTeams();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to remove team from subscription.");
    } finally {
      setIsUpdatingSub(false);
    }
  };

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
  const [registrationFeePerTeam, setRegistrationFeePerTeam] = useState<string>(
    settings.registrationFeePerTeam !== undefined ? String(settings.registrationFeePerTeam) : ""
  );
  const [individualFee, setIndividualFee] = useState<string>(
    settings.individualFee !== undefined ? String(settings.individualFee) : ""
  );
  const [amenitiesText, setAmenitiesText] = useState<string>(
    settings.amenities ? settings.amenities.join(", ") : ""
  );
  const [directoryListed, setDirectoryListed] = useState<boolean>(settings.directoryListed === true);
  const [publicContactEmail, setPublicContactEmail] = useState(settings.publicContactEmail || "");
  const [playerInfo, setPlayerInfo] = useState<LeaguePlayerInfo>(settings.playerInfo || {});
  const [venues, setVenues] = useState<LeagueVenueInfo[]>(settings.venues || []);
  const updatePlayerInfo = (key: keyof LeaguePlayerInfo, value: string | boolean) =>
    setPlayerInfo((prev) => ({ ...prev, [key]: value }));
  const updateVenue = (index: number, key: keyof LeagueVenueInfo, value: string) =>
    setVenues((prev) => prev.map((venue, i) => (i === index ? { ...venue, [key]: value } : venue)));
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
  const [saveError, setSaveError] = useState("");
  const describeSaveError = (err: unknown) =>
    `Changes were not saved: ${err instanceof Error ? err.message : "please try again."}`;
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
    setRegistrationFeePerTeam(settings.registrationFeePerTeam !== undefined ? String(settings.registrationFeePerTeam) : "");
    setIndividualFee(settings.individualFee !== undefined ? String(settings.individualFee) : "");
    setAmenitiesText(settings.amenities ? settings.amenities.join(", ") : "");
    setDirectoryListed(settings.directoryListed === true);
    setPublicContactEmail(settings.publicContactEmail || "");
    setPlayerInfo(settings.playerInfo || {});
    setVenues(settings.venues || []);
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

  const handleSaveLeagueSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAcceptableLogoUrl(logoUrl)) {
      setSaveError("The logo must be a web address starting with https:// (or leave it blank for the FlagOS logo).");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const sanitizedMinRoster = Math.max(rules.playersOnField, rules.minRosterSize);
      const rosterCap = rosterHardCap(rules.playersOnField);
      const sanitizedMaxRoster = Math.min(rosterCap, Math.max(sanitizedMinRoster, rules.maxRosterSize || rosterCap));
      const parsedTeamFee = registrationFeePerTeam.trim() !== "" ? Number(registrationFeePerTeam) : undefined;
      const parsedPlayerFee = individualFee.trim() !== "" ? Number(individualFee) : undefined;
      const parsedAmenities = amenitiesText.trim() !== ""
        ? amenitiesText.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;

      await updateSettings({
        leagueName: leagueName.trim() || "FlagOS Demo League",
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
        registrationFeePerTeam: Number.isFinite(parsedTeamFee) ? parsedTeamFee : undefined,
        individualFee: Number.isFinite(parsedPlayerFee) ? parsedPlayerFee : undefined,
        amenities: parsedAmenities,
        directoryListed: visibility === "public" && directoryListed,
        publicContactEmail: publicContactEmail.trim(),
        playerInfo: Object.fromEntries(
          Object.entries(playerInfo).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
        ) as LeaguePlayerInfo,
        venues: venues
          .map((venue) => ({
            name: venue.name.trim(),
            ...(venue.address?.trim() ? { address: venue.address.trim() } : {}),
            ...(venue.notes?.trim() ? { notes: venue.notes.trim() } : {}),
          }))
          .filter((venue) => venue.name),
        rules: {
          ...rules,
          minRosterSize: sanitizedMinRoster,
          maxRosterSize: sanitizedMaxRoster,
        },
      });
      closeCustomizer();
    } catch (err) {
      console.error("Error saving league settings:", err);
      setSaveError(describeSaveError(err));
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCustomizer();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="league-settings-title" className="bg-[#0B0F19] border border-cyan-500/30 rounded-3xl max-w-3xl w-full shadow-2xl relative flex flex-col h-[90dvh] max-h-[90dvh] overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        {/* Pinned Header & Tab Navigation */}
        <div data-tour="settings-header" className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-white/10 bg-[#0B0F19] shrink-0 z-10 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                <SettingsIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 id="league-settings-title" className="text-xl font-black uppercase text-white tracking-wide flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Settings</span>
                  {isLeagueAdmin ? (
                    <span className="text-[10px] font-mono uppercase whitespace-nowrap px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
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
                <p className="hidden sm:block text-xs text-neutral-400">
                  {isLeagueAdmin
                    ? "Set up your league, rules, teams and seasons"
                    : "View official league regulations"}
                </p>
              </div>
            </div>
            <PageGuideButton />
            <button
              onClick={closeCustomizer}
              className="text-neutral-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              title="Close"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className={`${isLeagueAdmin ? "grid grid-cols-2 sm:flex" : "flex"} items-center gap-1.5 sm:gap-2 p-1 bg-black/60 border border-white/10 rounded-2xl`}>
          {/* League Admin Tab: Branding */}
          {isLeagueAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab("branding")}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold leading-tight text-center transition-all cursor-pointer ${activeTab === "branding"
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
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold leading-tight text-center transition-all cursor-pointer ${activeTab === "rules"
              ? "bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow-md"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <Scale className="w-4 h-4" />
            <span>League Rules {isLeagueAdmin ? "" : "(View Only)"}</span>
          </button>

          {/* Subscription & Teams Tab (League Admin Exclusive) */}
          {isLeagueAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab("subscription")}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold leading-tight text-center transition-all cursor-pointer ${
                activeTab === "subscription"
                  ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-md"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Subscription &amp; Teams</span>
            </button>
          )}

          {/* Season & Archival Tab (League Admin Exclusive) */}
          {isLeagueAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab("season")}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold leading-tight text-center transition-all cursor-pointer ${activeTab === "season"
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
        <div className="overflow-y-auto overscroll-contain flex-1 min-h-0 p-4 sm:p-6 md:p-8">
        {saveError && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-200">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span className="flex-1">{saveError}</span>
            <button type="button" onClick={() => setSaveError("")} className="font-bold text-red-300 hover:text-white cursor-pointer">Dismiss</button>
          </div>
        )}
        {/* ============================================================
            TAB: LEAGUE BRANDING & IDENTITY (LEAGUE ADMIN EXCLUSIVE)
           ============================================================ */}
        {activeTab === "branding" && isLeagueAdmin && (
          <LeagueCustomizerBrandingTab
            leagueName={leagueName}
            setLeagueName={setLeagueName}
            shortcode={shortcode}
            setShortcode={setShortcode}
            tagline={tagline}
            setTagline={setTagline}
            seasonTitle={seasonTitle}
            setSeasonTitle={setSeasonTitle}
            logoUrl={logoUrl}
            setLogoUrl={setLogoUrl}
            primaryColor={primaryColor}
            accentColor={accentColor}
            handlePrimaryChange={handlePrimaryChange}
            handleSecondaryChange={handleSecondaryChange}
            defaultLocation={defaultLocation}
            setDefaultLocation={setDefaultLocation}
            contactEmail={contactEmail}
            setContactEmail={setContactEmail}
            rulebookTitle={rulebookTitle}
            setRulebookTitle={setRulebookTitle}
            rulebookUrl={rulebookUrl}
            setRulebookUrl={setRulebookUrl}
            announcement={announcement}
            setAnnouncement={setAnnouncement}
            visibility={visibility}
            setVisibility={setVisibility}
            registrationFeePerTeam={registrationFeePerTeam}
            setRegistrationFeePerTeam={setRegistrationFeePerTeam}
            individualFee={individualFee}
            setIndividualFee={setIndividualFee}
            amenitiesText={amenitiesText}
            setAmenitiesText={setAmenitiesText}
            directoryListed={directoryListed}
            setDirectoryListed={setDirectoryListed}
            publicContactEmail={publicContactEmail}
            setPublicContactEmail={setPublicContactEmail}
            playerInfo={playerInfo}
            updatePlayerInfo={updatePlayerInfo}
            venues={venues}
            setVenues={setVenues}
            updateVenue={updateVenue}
            copiedLink={copiedLink}
            setCopiedLink={setCopiedLink}
            activeLeagueId={activeLeagueId}
            saving={saving}
            handleSaveLeagueSettings={handleSaveLeagueSettings}
            closeCustomizer={closeCustomizer}
          />
        )}

        {/* ============================================================
            TAB: RULES & REGULATIONS (EDITABLE BY ADMIN, VIEW-ONLY BY OTHERS)
           ============================================================ */}
        {activeTab === "rules" && (
          <LeagueCustomizerRulesTab
            isLeagueAdmin={isLeagueAdmin}
            rules={rules}
            setRules={setRules}
            handleSaveLeagueSettings={handleSaveLeagueSettings}
            handleResetToIFAF={handleResetToIFAF}
            ifafPresetNotice={ifafPresetNotice}
            setIfafPresetNotice={setIfafPresetNotice}
            saving={saving}
            closeCustomizer={closeCustomizer}
            activeLeagueId={activeLeagueId}
          />
        )}

        {/* ============================================================
            TAB: SUBSCRIPTION & TEAMS (LEAGUE COMMISSIONER)
           ============================================================ */}
        {activeTab === "subscription" && isLeagueAdmin && (
          <LeagueCustomizerSubscriptionTab
            subscription={subscription}
            isDemoLeague={isDemoLeague}
            activeLeagueId={activeLeagueId}
            isComplimentary={isComplimentary}
            isOpeningBilling={isOpeningBilling}
            setIsOpeningBilling={setIsOpeningBilling}
            subSuccessMsg={subSuccessMsg}
            targetTeamCount={targetTeamCount}
            setTargetTeamCount={setTargetTeamCount}
            isUpdatingSub={isUpdatingSub}
            handleUpdateSubscriptionCount={handleUpdateSubscriptionCount}
            newSubTeamName={newSubTeamName}
            setNewSubTeamName={setNewSubTeamName}
            isSubmittingNewTeam={isSubmittingNewTeam}
            handleQuickAddTeam={handleQuickAddTeam}
            loadingSubTeams={loadingSubTeams}
            subTeamsList={subTeamsList}
            handleQuickRemoveTeam={handleQuickRemoveTeam}
            closeCustomizer={closeCustomizer}
          />
        )}

        {/* ============================================================
            TAB: SEASON & ARCHIVAL (LEAGUE COMMISSIONER)
           ============================================================ */}
        {activeTab === "season" && isLeagueAdmin && (
          <LeagueCustomizerSeasonTab
            settings={settings}
            subscription={subscription}
            isSubscriptionPastDue={isSubscriptionPastDue}
            isLeagueArchived={isLeagueArchived}
            seasonStartedMsg={seasonStartedMsg}
            setSeasonStartedMsg={setSeasonStartedMsg}
            showArchivePrompt={showArchivePrompt}
            setShowArchivePrompt={setShowArchivePrompt}
            archivingInProgress={archivingInProgress}
            setArchivingInProgress={setArchivingInProgress}
            archiveLeague={archiveLeague}
            newSeasonTitle={newSeasonTitle}
            setNewSeasonTitle={setNewSeasonTitle}
            seasons={seasons}
            startNewSeason={startNewSeason}
            leagueId={activeLeagueId}
            resumeSubscription={resumeSubscription}
            setSaveError={setSaveError}
            describeSaveError={describeSaveError}
          />
        )}
        </div>
      </div>
    </div >
  );
}
