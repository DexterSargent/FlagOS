"use client";

import { usePageGuide } from "@/lib/pageGuide";
import { LEAGUE_DIRECTORY_WALKTHROUGH, LEAGUE_INQUIRY_WALKTHROUGH } from "@/lib/walkthroughs/public";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getReadableTextColor } from "@/lib/teamColors";
import { getCachedLeaguesDirectory } from "@/lib/leagueDataCache";
import { useLeague } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import {
  DirectoryLeague,
  buildDirectoryCatalog,
  calculateDistanceInMiles,
  DIRECTORY_FORMAT_OPTIONS,
  FormatChoice,
  RulesetFormat,
  LeagueDivision,
  CompetitionTier,
  RegistrationStatus,
} from "@/lib/leagueDirectoryData";
import { mapsSearchUrl } from "@/lib/leaguePublicProfile";
import { FLAGOS_SUPPORT_EMAIL } from "@/lib/platformAdmin";

function formatVenueAddress(venue: DirectoryLeague["venue"]): string {
  return [venue.address, venue.city, [venue.stateOrProvince, venue.postalCode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}
import {
  Search,
  MapPin,
  Navigation,
  Globe,
  Shield,
  Calendar,
  Clock,
  Users,
  Trophy,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  SlidersHorizontal,
  X,
  Building2,
  Lock,
  Layers,
  Send,
  Mail,
  Compass,
  Check,
  ChevronDown,
} from "lucide-react";

export default function LeagueDirectoryPage() {
  usePageGuide(LEAGUE_DIRECTORY_WALKTHROUGH);
  const { userLeagues, settings, activeLeagueId, switchLeague } = useLeague();
  const { user } = useAuth();

  // Remote Firestore Leagues & Loading State
  const [remoteLeagues, setRemoteLeagues] = useState<any[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState<boolean>(true);

  // Quick Category Filter ("all" | "live" | "my")
  const [selectedCategory, setSelectedCategory] = useState<"all" | "my">("all");

  useEffect(() => {
    let isCurrent = true;
    async function fetchLeagues() {
      try {
        setIsLoadingRemote(true);
        const { leagues } = await getCachedLeaguesDirectory();
        if (isCurrent) {
          setRemoteLeagues(leagues);
        }
      } catch (err) {
        console.warn("Notice: could not load Firestore leagues directly (offline/mocked):", err);
      } finally {
        if (isCurrent) setIsLoadingRemote(false);
      }
    }

    fetchLeagues();
    return () => {
      isCurrent = false;
    };
  }, []);

  // Master catalog merging live remote leagues, user leagues, active league settings, and partner circuits
  const catalog = useMemo(() => {
    return buildDirectoryCatalog(userLeagues, settings, remoteLeagues, activeLeagueId);
  }, [userLeagues, settings, remoteLeagues, activeLeagueId]);

  const liveCount = useMemo(() => catalog.filter((l) => l.isLive).length, [catalog]);
  const myLeaguesCount = useMemo(() => catalog.filter((l) => l.isUserLeague).length, [catalog]);
  const totalTeamsCount = useMemo(
    () => catalog.reduce((acc, l) => acc + (l.teamCount || 0), 0),
    [catalog]
  );

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [isFormatDropdownOpen, setIsFormatDropdownOpen] = useState<boolean>(false);
  const formatDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSurface, setSelectedSurface] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"distance" | "name" | "fee" | "deadline">("distance");
  const [viewMode, setViewMode] = useState<"cards" | "venues" | "table">("cards");

  // Proximity / Location State
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>({
    // Default proximity: Toronto/GTA (central flagship hub)
    lat: 43.6532,
    lon: -79.3832,
  });
  const [locationLabel, setLocationLabel] = useState<string>("Toronto / GTA");
  const [maxDistanceMiles, setMaxDistanceMiles] = useState<number>(0);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Click outside listener for format dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        formatDropdownRef.current &&
        !formatDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFormatDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleFormat = (fmtId: string) => {
    setSelectedFormats((prev) =>
      prev.includes(fmtId) ? prev.filter((f) => f !== fmtId) : [...prev, fmtId]
    );
  };

  // Contact Commissioner Modal State
  const [contactingLeague, setContactingLeague] = useState<DirectoryLeague | null>(null);
  usePageGuide(contactingLeague ? LEAGUE_INQUIRY_WALKTHROUGH : null, 2);
  const [contactSubject, setContactSubject] = useState("Question about joining this league");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Trigger browser GPS
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        setLocationLabel("Your location");
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setLocationError("Unable to retrieve location. Please choose a nearby metro region below.");
      },
      { timeout: 10000 }
    );
  };


  // Filtered & Ranked Leagues
  const processedLeagues = useMemo(() => {
    return catalog
      .map((league) => {
        let distanceMiles: number | null = null;
        if (userCoords && league.venue.latitude !== undefined && league.venue.longitude !== undefined) {
          distanceMiles = calculateDistanceInMiles(
            userCoords.lat,
            userCoords.lon,
            league.venue.latitude,
            league.venue.longitude
          );
        }
        return {
          ...league,
          distanceMiles,
        };
      })
      .filter((league) => {
        // Category filter (All vs My)
        if (selectedCategory === "my" && !league.isUserLeague) return false;

        // Search text matching
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = league.name.toLowerCase().includes(q);
          const matchCode = league.shortcode.toLowerCase().includes(q);
          const matchCity = league.venue.city.toLowerCase().includes(q);
          const matchVenue = league.venue.name.toLowerCase().includes(q);
          const matchZip = league.venue.postalCode.toLowerCase().replace(/\s/g, "").includes(q.replace(/\s/g, ""));
          const matchFormat = league.rulesFormat.toLowerCase().includes(q);
          const matchDivision = league.division.toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchCity && !matchVenue && !matchZip && !matchFormat && !matchDivision) {
            return false;
          }
        }

        // Distance radius filter (bypassed if explicit keyword search is active)
        if (userCoords && league.distanceMiles !== null && maxDistanceMiles > 0 && !searchQuery.trim()) {
          if (league.distanceMiles > maxDistanceMiles) {
            return false;
          }
        }

        // Ruleset format multi-select filter (4v4 to 8v8)
        if (selectedFormats.length > 0) {
          const formatStr = (league.rulesFormat || "").toLowerCase();
          const matchesAny = selectedFormats.some((fmt) => {
            const num = parseInt(fmt[0], 10);
            return (
              formatStr.includes(fmt.toLowerCase()) ||
              formatStr.includes(`${num} on ${num}`) ||
              formatStr.includes(`${num}v${num}`)
            );
          });
          if (!matchesAny) return false;
        }

        // Division filter
        if (selectedDivision !== "all") {
          if (selectedDivision === "womens" && !league.division.toLowerCase().includes("women")) return false;
          if (selectedDivision === "mens" && !league.division.toLowerCase().includes("men")) return false;
          if (selectedDivision === "coed" && !league.division.toLowerCase().includes("co-ed")) return false;
          if (selectedDivision === "youth" && !league.division.toLowerCase().includes("youth")) return false;
        }

        // Competition Tier filter
        if (selectedTier !== "all") {
          if (league.competitionTier !== selectedTier) return false;
        }

        // Game Day filter
        if (selectedDay !== "all") {
          if (!league.gameDay.toLowerCase().includes(selectedDay.toLowerCase())) return false;
        }

        // Registration Status filter
        if (selectedStatus !== "all") {
          if (league.registrationStatus !== selectedStatus) return false;
        }

        // Venue Surface filter
        if (selectedSurface !== "all") {
          if (league.venue.surface !== selectedSurface) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "distance") {
          if (a.distanceMiles !== null && b.distanceMiles !== null) {
            return a.distanceMiles - b.distanceMiles;
          }
        }
        if (sortBy === "fee") {
          const feeA = a.registrationFeePerTeam ?? Infinity;
          const feeB = b.registrationFeePerTeam ?? Infinity;
          return feeA - feeB;
        }
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        // Priority sort: Active -> User created -> Live remote -> Sample
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        if (a.isUserLeague && !b.isUserLeague) return -1;
        if (!a.isUserLeague && b.isUserLeague) return 1;
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return 0;
      });
  }, [
    catalog,
    userCoords,
    selectedCategory,
    searchQuery,
    maxDistanceMiles,
    selectedFormats,
    selectedDivision,
    selectedTier,
    selectedDay,
    selectedStatus,
    selectedSurface,
    sortBy,
  ]);

  // Unique venues
  const uniqueVenues = useMemo(() => {
    const map = new Map<string, { venue: DirectoryLeague["venue"]; leagues: DirectoryLeague[]; distanceMiles: number | null }>();
    processedLeagues.forEach((l) => {
      const key = `${l.venue.name}-${l.venue.city}`;
      if (!map.has(key)) {
        map.set(key, { venue: l.venue, leagues: [l], distanceMiles: l.distanceMiles });
      } else {
        map.get(key)!.leagues.push(l);
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.distanceMiles !== null && b.distanceMiles !== null) {
        return a.distanceMiles - b.distanceMiles;
      }
      return 0;
    });
  }, [processedLeagues]);

  const handleResetFilters = () => {
    setSelectedCategory("all");
    setSearchQuery("");
    setSelectedFormats([]);
    setSelectedDivision("all");
    setSelectedTier("all");
    setSelectedDay("all");
    setSelectedStatus("all");
    setSelectedSurface("all");
    setMaxDistanceMiles(0);
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedFormats.length > 0 ||
    selectedDivision !== "all" ||
    selectedTier !== "all" ||
    selectedDay !== "all" ||
    selectedStatus !== "all" ||
    selectedSurface !== "all" ||
    maxDistanceMiles > 0;

  const handleSendCommissionerMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim() || !contactingLeague) return;
    const to = contactingLeague.contactEmail || FLAGOS_SUPPORT_EMAIL;
    const subject = `${contactSubject} — ${contactingLeague.name}`;
    const body = contactingLeague.contactEmail
      ? contactMessage
      : `League: ${contactingLeague.name} (${contactingLeague.id})\n\n${contactMessage}`;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactingLeague(null);
      setContactMessage("");
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#07090E] text-slate-900 dark:text-white transition-colors duration-200">
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
        {/* ========================================================= */}
        {/* HERO SECTION & DIRECTORY VALUE PROPOSITION                */}
        {/* ========================================================= */}
        <section id="league-directory-hero" className="relative overflow-hidden rounded-3xl bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-[#0B0F19] dark:to-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl p-6 sm:p-10 lg:p-12 transition-colors duration-200">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-cyan-500/10 dark:bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/10 dark:bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                <Globe className="w-3.5 h-3.5" />
                <span><span className="normal-case">FlagOS</span> League Directory</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-cyan-500/10 border border-slate-200 dark:border-cyan-500/20 text-xs font-mono font-bold text-slate-700 dark:text-cyan-300">
                {processedLeagues.length} {processedLeagues.length === 1 ? "League Available" : "Leagues Available"}
              </span>
              {liveCount > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
                  <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  {liveCount} Live FlagOS {liveCount === 1 ? "League" : "Leagues"}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">
              Find a Flag Football League <span className="text-[#3ca505] dark:text-emerald-400">Near You</span>
            </h1>

            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              Find a league to play in, or start your own. Browse active leagues by city, format, division, and game night—whether you&apos;re looking for a Sunday co-ed squad or competitive 5v5 under the lights.
            </p>

            {/* Commissioner CTA Links */}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all cursor-pointer"
                style={{ backgroundColor: '#2b7d04', color: '#ffffff' }}
              >
                <Trophy className="w-4 h-4" style={{ color: '#ffffff' }} />
                <span>Create a League</span>
              </Link>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs uppercase tracking-wider transition-all border border-slate-200 dark:border-white/15 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>All Leagues ({catalog.length})</span>
              </button>
              {myLeaguesCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("my")}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 text-purple-700 dark:text-purple-200 font-bold text-xs uppercase tracking-wider transition-all border border-purple-200 dark:border-purple-500/30 cursor-pointer"
                >
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                  <span>My Leagues ({myLeaguesCount})</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="relative z-10 mt-8 pt-6 border-t border-slate-200 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Active Leagues</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold text-base sm:text-lg">{catalog.length} Available</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Teams Playing</span>
              <span className="text-slate-900 dark:text-white font-bold text-base sm:text-lg">{totalTeamsCount} Teams</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Fields &amp; Facilities</span>
              <span className="text-cyan-700 dark:text-cyan-400 font-bold text-base sm:text-lg">{uniqueVenues.length} Venues</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Games &amp; Stats</span>
              <span className="text-amber-700 dark:text-amber-400 font-bold text-base sm:text-lg">Refereed &amp; Tracked</span>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* INTERACTIVE PROXIMITY & LOCATION CONTROL BAR              */}
        {/* ========================================================= */}
        <section id="league-directory-results" className="bg-white dark:bg-[#0B0F19] rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg p-4 sm:p-6 space-y-4 transition-colors">
          {/* Category Switcher Tabs: All Leagues vs My Leagues */}
          <div data-tour="directory-categories" className="flex items-center gap-2 flex-wrap pb-2 border-b border-slate-200/80 dark:border-white/5">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-black shadow-sm"
                  : "bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              style={selectedCategory === "all" ? { color: '#ffffff', backgroundColor: '#0f172a' } : undefined}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>All Leagues ({catalog.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("my")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedCategory === "my"
                  ? "bg-purple-600 font-black shadow-sm"
                  : "bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              style={selectedCategory === "my" ? { color: '#ffffff', backgroundColor: '#9333ea' } : undefined}
            >
              <Users className="w-3.5 h-3.5" style={{ color: selectedCategory === "my" ? '#ffffff' : '#a855f7' }} />
              <span>My Leagues ({myLeaguesCount})</span>
            </button>
          </div>

          <div data-tour="directory-search" className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by city (e.g. Toronto, Vaughan, Ottawa), venue, zip/postal code, or league title..."
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 text-xs sm:text-sm outline-none focus:border-cyan-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* GPS & Distance Radius Controls */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              {/* Use My Location GPS Button */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="px-3 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                title="Detect leagues closest to your current physical location"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? "animate-spin text-cyan-500" : ""}`} />
                <span>{isLocating ? "Locating..." : "Use My Location"}</span>
              </button>

              {/* Radius Selector */}
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-xs font-medium shrink-0">
                <span className="text-[11px] text-slate-600 dark:text-neutral-400">Radius:</span>
                <select
                  value={maxDistanceMiles}
                  onChange={(e) => setMaxDistanceMiles(Number(e.target.value))}
                  className="bg-transparent text-slate-900 dark:text-white font-bold outline-none cursor-pointer"
                >
                  <option value={10} className="dark:bg-[#0B0F19] text-black dark:text-white">Within 10 miles</option>
                  <option value={25} className="dark:bg-[#0B0F19] text-black dark:text-white">Within 25 miles</option>
                  <option value={50} className="dark:bg-[#0B0F19] text-black dark:text-white">Within 50 miles</option>
                  <option value={100} className="dark:bg-[#0B0F19] text-black dark:text-white">Within 100 miles</option>
                  <option value={0} className="dark:bg-[#0B0F19] text-black dark:text-white">Any Distance</option>
                </select>
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-xs font-medium shrink-0">
                <span className="text-[11px] text-slate-600 dark:text-neutral-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-slate-900 dark:text-white font-bold outline-none cursor-pointer"
                >
                  <option value="distance" className="dark:bg-[#0B0F19] text-black dark:text-white">Closest First</option>
                  <option value="name" className="dark:bg-[#0B0F19] text-black dark:text-white">League Name</option>
                  <option value="fee" className="dark:bg-[#0B0F19] text-black dark:text-white">Lowest Fee</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Proximity Center Indicator */}
          {locationLabel && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/5 text-xs">
              <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                <span>Distances from: <strong className="text-slate-800 dark:text-white">{locationLabel}</strong></span>
              </span>
              {maxDistanceMiles > 0 && (
                <span className="text-[11px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  Radius: {maxDistanceMiles} miles
                </span>
              )}
            </div>
          )}

          {locationError && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs">
              {locationError}
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* MULTI-FACETED NEEDS FILTERS & VIEW TOGGLE                 */}
        {/* ========================================================= */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Filter Pills Scrollable Row */}
            <div data-tour="directory-filters" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {/* Ruleset Format Multi-Select Dropdown (4v4 to 8v8) */}
              <div className="relative shrink-0" ref={formatDropdownRef}>
                <button data-tour="directory-format-options"
                  type="button"
                  onClick={() => setIsFormatDropdownOpen((prev) => !prev)}
                  aria-expanded={isFormatDropdownOpen}
                  aria-haspopup="listbox"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    selectedFormats.length > 0
                      ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-800 dark:text-cyan-300 shadow-sm"
                      : "bg-white dark:bg-[#0B0F19] border-slate-200 dark:border-white/10 text-slate-800 dark:text-white hover:border-slate-300 dark:hover:border-white/20 shadow-sm"
                  }`}
                >
                  <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-neutral-400">Format:</span>
                  <span className="font-bold">
                    {selectedFormats.length === 0 || selectedFormats.length === DIRECTORY_FORMAT_OPTIONS.length
                      ? "All (4v4 – 8v8)"
                      : selectedFormats.length <= 2
                      ? selectedFormats.join(", ")
                      : `${selectedFormats.length} Formats`}
                  </span>
                  {selectedFormats.length > 0 && selectedFormats.length < DIRECTORY_FORMAT_OPTIONS.length && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-cyan-500 text-black">
                      {selectedFormats.length}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 dark:text-neutral-400 transition-transform duration-200 ${
                      isFormatDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isFormatDropdownOpen && (
                  <div
                    role="listbox"
                    aria-label="Filter by Ruleset Format"
                    className="absolute left-0 mt-2 w-64 sm:w-72 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-30 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 dark:border-white/5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400">
                        Formats (4v4 to 8v8)
                      </span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSelectedFormats(DIRECTORY_FORMAT_OPTIONS.map((f) => f.id))}
                          className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold cursor-pointer"
                        >
                          All
                        </button>
                        <span className="text-slate-300 dark:text-white/20">•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFormats([])}
                          className="text-slate-500 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="py-1 space-y-1">
                      {DIRECTORY_FORMAT_OPTIONS.map((opt) => {
                        const isSelected = selectedFormats.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => toggleFormat(opt.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-cyan-500/10 dark:bg-cyan-500/15 text-slate-900 dark:text-white font-bold"
                                : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-neutral-300"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "bg-cyan-500 border-cyan-500 text-black"
                                    : "border-slate-300 dark:border-white/20 bg-transparent"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div>
                                <span className="text-xs font-black uppercase tracking-tight block">
                                  {opt.label}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-neutral-400 block leading-tight">
                                  {opt.subtitle}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase">
                                Active
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Division Filter */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold shrink-0 shadow-sm">
                <span className="text-[10px] text-slate-400 uppercase">Division:</span>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="bg-transparent text-purple-600 dark:text-purple-400 outline-none cursor-pointer"
                >
                  <option value="all" className="dark:bg-[#0B0F19] text-black dark:text-white">All Divisions</option>
                  <option value="womens" className="dark:bg-[#0B0F19] text-black dark:text-white">Women's Flag</option>
                  <option value="coed" className="dark:bg-[#0B0F19] text-black dark:text-white">Co-Ed 5v5</option>
                  <option value="mens" className="dark:bg-[#0B0F19] text-black dark:text-white">Men's Open</option>
                  <option value="youth" className="dark:bg-[#0B0F19] text-black dark:text-white">Youth &amp; High School</option>
                </select>
              </div>

              {/* Competition Level */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold shrink-0 shadow-sm">
                <span className="text-[10px] text-slate-400 uppercase">Tier:</span>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="bg-transparent text-emerald-600 dark:text-emerald-400 outline-none cursor-pointer"
                >
                  <option value="all" className="dark:bg-[#0B0F19] text-black dark:text-white">All Tiers</option>
                  <option value="Premier / Elite" className="dark:bg-[#0B0F19] text-black dark:text-white">Premier / Elite</option>
                  <option value="Competitive" className="dark:bg-[#0B0F19] text-black dark:text-white">Competitive</option>
                  <option value="Recreational / Social" className="dark:bg-[#0B0F19] text-black dark:text-white">Recreational / Social</option>
                </select>
              </div>

              {/* Game Day */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold shrink-0 shadow-sm">
                <span className="text-[10px] text-slate-400 uppercase">Day:</span>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="bg-transparent text-amber-600 dark:text-amber-400 outline-none cursor-pointer"
                >
                  <option value="all" className="dark:bg-[#0B0F19] text-black dark:text-white">Any Day</option>
                  <option value="Sunday" className="dark:bg-[#0B0F19] text-black dark:text-white">Sundays</option>
                  <option value="Saturday" className="dark:bg-[#0B0F19] text-black dark:text-white">Saturdays</option>
                  <option value="Friday" className="dark:bg-[#0B0F19] text-black dark:text-white">Friday Night Lights</option>
                  <option value="Thursday" className="dark:bg-[#0B0F19] text-black dark:text-white">Weeknights</option>
                </select>
              </div>

              {(searchQuery || selectedFormats.length > 0 || selectedDivision !== "all" || selectedTier !== "all" || selectedDay !== "all" || selectedStatus !== "all") && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                >
                  Reset All
                </button>
              )}
            </div>

            {/* View Mode Switcher */}
            <div data-tour="directory-view" className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/80 dark:bg-black/50 border border-slate-300 dark:border-white/10 text-xs font-bold shrink-0 self-end md:self-auto">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("venues")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === "venues"
                    ? "bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Venues</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Compare</span>
              </button>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 font-mono px-1">
            <span>
              Showing <strong>{processedLeagues.length}</strong> public flag football {processedLeagues.length === 1 ? "league" : "leagues"}
              {userCoords && maxDistanceMiles > 0 ? ` within ${maxDistanceMiles} miles` : ""}
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
              • All leagues include official refs &amp; stats
            </span>
          </div>
        </section>

        {/* ========================================================= */}
        {/* LEAGUES CATALOG DISPLAY                                   */}
        {/* ========================================================= */}
        {processedLeagues.length === 0 ? (
          <div data-tour="directory-results" className="text-center py-16 px-4 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-3xl space-y-4 shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-700 dark:text-cyan-400">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white">
              {hasActiveFilters ? "No Leagues Match Your Search" : selectedCategory === "my" ? "You Haven\u2019t Joined a League Yet" : "No Public Leagues Listed Yet"}
            </h3>
            <p className="text-xs text-slate-600 dark:text-neutral-400 max-w-md mx-auto">
              {hasActiveFilters
                ? maxDistanceMiles > 0
                  ? "Try expanding your distance radius, clearing your filters, or searching for a nearby city."
                  : "Try clearing your filters or searching for a different city or league name."
                : "Leagues only appear here when their organizers choose to list them publicly. Private and unlisted leagues are reached through a direct link or invite from the league organizer."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  {maxDistanceMiles > 0 ? "Reset Filters & Expand Radius" : "Reset Filters"}
                </button>
              )}
              <Link
                href="/free-agents"
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10 font-black text-xs uppercase tracking-wider transition-colors"
              >
                Join as a Free Agent
              </Link>
              <Link
                href="/pricing"
                className="px-5 py-2.5 rounded-xl text-white font-black text-xs uppercase tracking-wider transition-all hover:opacity-90"
                style={{ backgroundColor: "#2b7d04", color: "#ffffff" }}
              >
                Start a League
              </Link>
            </div>
          </div>
        ) : viewMode === "cards" ? (
          /* ========================================================= */
          /* CARDS VIEW                                                */
          /* ========================================================= */
          <div data-tour="directory-results" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedLeagues.map((league) => (
              <div
                key={league.id}
                className={`bg-white dark:bg-[#0B0F19] border ${
                  league.isActive
                    ? "border-emerald-500 shadow-lg shadow-emerald-500/10"
                    : league.isLive
                    ? "border-cyan-500/40 hover:border-cyan-500/70"
                    : "border-slate-200 dark:border-white/10 hover:border-cyan-500/50"
                } rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl group relative overflow-hidden`}
              >
                {/* Top Badge Row */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase shadow-sm"
                        style={{ backgroundColor: league.primaryColor, color: getReadableTextColor(league.primaryColor, "#ffffff") }}
                      >
                        {league.shortcode}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200">
                        {league.rulesFormat}
                      </span>
                      {league.division && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-800 dark:text-purple-300">
                          {league.division}
                        </span>
                      )}
                      {league.competitionTier && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300">
                          {league.competitionTier}
                        </span>
                      )}
                      {league.acceptsFreeAgents && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                          Accepting free agents
                        </span>
                      )}
                      {league.isActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-black uppercase shadow-sm">
                          <Sparkles className="w-3 h-3 text-emerald-500" />
                          Active League
                        </span>
                      )}
                      {!league.isActive && league.isUserLeague && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold uppercase">
                          My League
                        </span>
                      )}
                      {!league.isActive && !league.isUserLeague && league.isLive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold uppercase">
                          <Globe className="w-3 h-3 text-cyan-500" />
                          Live Circuit
                        </span>
                      )}
                    </div>

                    {league.distanceMiles !== null && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-800 dark:text-cyan-300 shrink-0">
                        <MapPin className="w-3 h-3 text-cyan-500" />
                        <span>{league.distanceMiles} mi</span>
                      </span>
                    )}
                  </div>

                  {/* League Identity Header */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center p-1 shrink-0 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
                      {league.logoUrl ? (
                        <img
                          src={league.logoUrl}
                          alt={league.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = "/york_lions_icon.png";
                          }}
                        />
                      ) : (
                        <Shield className="w-6 h-6 text-cyan-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors leading-snug break-words">
                        {league.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400 truncate mt-0.5">
                        {league.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Schedule & Venue Details Box */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/5 space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900 dark:text-white truncate block">
                          {league.venue.name || league.venue.city || "Venue not listed yet"}
                        </span>
                        {formatVenueAddress(league.venue) && (
                          <span className="text-[11px] text-slate-500 dark:text-neutral-400 block truncate">
                            {formatVenueAddress(league.venue)}
                          </span>
                        )}
                      </div>
                      {league.venue.address && (
                        <a
                          href={league.venue.mapsUrl || mapsSearchUrl(formatVenueAddress(league.venue))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-cyan-700 dark:text-cyan-400 hover:underline"
                        >
                          Directions
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200 dark:border-white/5 text-slate-600 dark:text-neutral-400">
                      <span className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                        <Users className="w-3.5 h-3.5 text-cyan-500" />
                        <span>{league.teamCount} Teams</span>
                      </span>
                      {league.gameDay && (
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          <span>{league.gameDay}</span>
                        </span>
                      )}
                      {league.gameTimeWindow && (
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-cyan-500" />
                          <span>{league.gameTimeWindow}</span>
                        </span>
                      )}
                    </div>

                    {league.registrationDeadline && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400">
                        <span>Register by:</span>
                        <span className="font-bold text-slate-800 dark:text-neutral-200">{league.registrationDeadline}</span>
                      </div>
                    )}
                    {league.seasonDates && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400">
                        <span>Season:</span>
                        <span className="font-bold text-slate-800 dark:text-neutral-200">{league.seasonDates}</span>
                      </div>
                    )}
                    {league.venue.surface && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400">
                        <span>Field Surface:</span>
                        <span className="font-bold text-slate-800 dark:text-neutral-200">
                          {league.venue.surface}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Amenities Checklist Chips */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                      What&apos;s Included
                    </span>
                    {league.amenities && league.amenities.length > 0 ? (
                      <ul className="grid grid-cols-1 gap-1 text-[11px] text-slate-700 dark:text-neutral-300">
                        {league.amenities.slice(0, 3).map((item, idx) => (
                          <li key={idx} className="flex items-center gap-1.5 truncate">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span className="truncate">{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400 italic">
                        Contact commissioner for more details
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Pricing & Direct Action CTAs */}
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block">Team Registration</span>
                      {league.registrationFeePerTeam !== undefined ? (
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          ${league.registrationFeePerTeam}
                          <span className="text-[10px] font-normal text-slate-400"> / team</span>
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-500 dark:text-neutral-400 italic">
                          Contact commissioner for more details
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-400 block">Free Agent Entry</span>
                      {league.individualFee !== undefined ? (
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          ${league.individualFee}
                          <span className="text-[10px] font-normal text-slate-400"> / player</span>
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-500 dark:text-neutral-400 italic">
                          Contact commissioner for more details
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 1: Explore Hub & Set Active */}
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/league/${league.id}`}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 text-white font-black text-xs uppercase tracking-wider text-center transition-all hover:opacity-90 flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                      style={{ backgroundColor: '#2b7d04', color: '#ffffff' }}
                    >
                      <span>Explore Hub</span>
                      <ArrowRight className="w-3.5 h-3.5" style={{ color: '#ffffff' }} />
                    </Link>

                    {league.isActive ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-black text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => switchLeague(league.id)}
                        className="w-full py-2.5 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 font-bold text-xs uppercase tracking-wider text-center border border-cyan-500/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Switch to this league as your active circuit"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Set Active</span>
                      </button>
                    )}
                  </div>

                  {/* Row 2: Register & Inquire */}
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/join?league=${league.id}`}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider text-center border border-slate-300 dark:border-white/10 transition-colors flex items-center justify-center gap-1"
                    >
                      <Users className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Register</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setContactingLeague(league)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider text-center border border-slate-300 dark:border-white/10 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Inquire</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === "venues" ? (
          /* ========================================================= */
          /* VENUES & MAP LIST VIEW                                    */
          /* ========================================================= */
          <div data-tour="directory-results" className="space-y-6">
            {uniqueVenues.map(({ venue, leagues, distanceMiles }, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white">
                        {venue.name}
                      </h3>
                      {distanceMiles !== null && (
                        <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          {distanceMiles} miles away
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatVenueAddress(venue) || "Address not listed yet"}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {venue.surface && (
                      <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-neutral-300">
                        {venue.surface}
                      </span>
                    )}
                    {venue.hasLights && (
                      <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold">
                        Lights Equipped
                      </span>
                    )}
                    {(venue.mapsUrl || venue.address) && (
                      <a
                        href={venue.mapsUrl || mapsSearchUrl(formatVenueAddress(venue))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase flex items-center gap-1 transition-colors"
                      >
                        <span>Directions</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Circuits Hosted at this Venue */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                    Circuits Hosted at this Facility ({leagues.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {leagues.map((l) => (
                      <div
                        key={l.id}
                        className={`p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border ${
                          l.isActive
                            ? "border-emerald-500"
                            : l.isLive
                            ? "border-cyan-500/40"
                            : "border-slate-200 dark:border-white/5"
                        } flex items-center justify-between gap-3`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {l.name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-neutral-300">
                              {l.rulesFormat}
                            </span>
                            {l.isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40">
                                Active
                              </span>
                            )}
                            {!l.isActive && l.isLive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
                                Live
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-neutral-400 block truncate">
                            {l.teamCount} teams{l.gameDay ? ` • ${l.gameDay}` : ""}
                            {l.registrationFeePerTeam !== undefined ? ` • $${l.registrationFeePerTeam}/team` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link
                            href={`/league/${l.id}`}
                            className="px-3 py-1.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                            style={{ backgroundColor: '#2b7d04', color: '#ffffff' }}
                          >
                            <span>Hub</span>
                            <ArrowRight className="w-3 h-3" style={{ color: '#ffffff' }} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ========================================================= */
          /* COMPARISON TABLE VIEW                                     */
          /* ========================================================= */
          <div data-tour="directory-results" className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-[11px] font-mono uppercase text-slate-500 dark:text-neutral-400">
                  <th className="py-4 px-4 font-bold">Circuit &amp; Format</th>
                  <th className="py-4 px-4 font-bold">Teams</th>
                  <th className="py-4 px-4 font-bold">Location &amp; Distance</th>
                  <th className="py-4 px-4 font-bold">Division</th>
                  <th className="py-4 px-4 font-bold">Schedule</th>
                  <th className="py-4 px-4 font-bold">Team Fee</th>
                  <th className="py-4 px-4 font-bold">Player Entry</th>
                  <th className="py-4 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {processedLeagues.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white">{l.name}</span>
                        {l.isActive && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40">
                            Active
                          </span>
                        )}
                        {!l.isActive && l.isUserLeague && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold uppercase bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30">
                            My League
                          </span>
                        )}
                        {!l.isActive && !l.isUserLeague && l.isLive && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold uppercase bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
                            Live
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono font-medium">
                        {l.rulesFormat}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                      {l.teamCount} Teams
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-slate-800 dark:text-neutral-200 font-medium">{[l.venue.city, l.venue.stateOrProvince].filter(Boolean).join(", ") || "—"}</div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                        {l.distanceMiles !== null ? `${l.distanceMiles} mi away` : l.venue.name}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-700 dark:text-neutral-300">
                      {l.division || "—"}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-slate-800 dark:text-neutral-200 font-medium">{l.gameDay || "—"}</div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400">{l.gameTimeWindow}</div>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                      {l.registrationFeePerTeam !== undefined ? `$${l.registrationFeePerTeam}` : (
                        <span className="text-[11px] font-normal text-slate-400 italic">Contact commissioner</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      {l.individualFee !== undefined ? `$${l.individualFee}` : (
                        <span className="text-[11px] font-normal text-slate-400 italic">Contact commissioner</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!l.isActive && (
                          <button
                            type="button"
                            onClick={() => switchLeague(l.id)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                            title="Set as active league"
                          >
                            Set Active
                          </button>
                        )}
                        <Link
                          href={`/league/${l.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-white font-black text-[11px] uppercase tracking-wider transition-all cursor-pointer"
                          style={{ backgroundColor: '#2b7d04', color: '#ffffff' }}
                        >
                          <span>Hub</span>
                          <ArrowRight className="w-3 h-3" style={{ color: '#ffffff' }} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================= */}
        {/* COMMISSIONER ONBOARDING CALLOUT BANNER                    */}
        {/* ========================================================= */}
        <section data-tour="directory-list" className="rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:bg-gradient-to-r dark:from-emerald-950/40 dark:via-cyan-950/30 dark:to-blue-950/40 border border-emerald-200 dark:border-emerald-500/20 p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 flex items-center justify-center md:justify-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Run a Flag Football League?</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-slate-900 dark:text-white">
              List Your League on <span className="normal-case">FlagOS</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Get automated schedules, live game clocks, digital playbooks, and team stats tracking in one place. Built for commissioners, coaches, and players who love the game.
            </p>
          </div>
          <Link
            href="/pricing"
            className="px-6 py-3.5 rounded-2xl bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 hover:opacity-90 cursor-pointer shrink-0"
            style={{ backgroundColor: '#2b7d04', color: '#ffffff' }}
          >
            Create Your League
          </Link>
        </section>
      </div>

      {/* ========================================================= */}
      {/* CONTACT COMMISSIONER INQUIRY MODAL                        */}
      {/* ========================================================= */}
      {contactingLeague && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div data-tour="directory-inquiry" className="bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                    Inquire with {contactingLeague.shortcode} Commissioner
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                    {contactingLeague.name}
                  </span>
                </div>
              </div>
              <PageGuideButton />
              <button
                type="button"
                onClick={() => setContactingLeague(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {contactSubmitted ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Opening Your Email App
                </h4>
                <p className="text-xs text-slate-600 dark:text-neutral-400 max-w-sm mx-auto">
                  Your message is ready to send to {contactingLeague.contactEmail ? `the ${contactingLeague.name} organizer` : "FlagOS support, who will pass it to the organizer"}. Press send in your email app to deliver it.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendCommissionerMessage} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-neutral-400">
                    Topic
                  </label>
                  <select
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Registering as a Free Agent">Looking for a team (Free Agent)</option>
                    <option value="Registering an Entire Squad">Registering a full team</option>
                    <option value="Ruleset & Equipment Questions">Rules &amp; equipment questions</option>
                    <option value="Schedule & Timing Conflict">Schedule &amp; game times</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-neutral-400">
                    Your Message
                  </label>
                  <textarea
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Hello Coach/Commissioner, I'm interested in joining the upcoming season. What positions or roster openings are currently available?"
                    className="w-full p-3 rounded-xl bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 outline-none resize-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setContactingLeague(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!contactMessage.trim()}
                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Inquiry</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
