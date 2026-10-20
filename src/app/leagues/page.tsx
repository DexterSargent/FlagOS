"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useLeague } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import LeagueHeader from "@/components/LeagueHeader";
import LeagueFooter from "@/components/LeagueFooter";
import {
  DirectoryLeague,
  buildDirectoryCatalog,
  calculateDistanceInMiles,
  REGION_PRESETS,
  RegionPreset,
  RulesetFormat,
  LeagueDivision,
  CompetitionTier,
  RegistrationStatus,
} from "@/lib/leagueDirectoryData";
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
  const { userLeagues, settings, activeLeagueId } = useLeague();
  const { user } = useAuth();

  // Master catalog
  const catalog = useMemo(() => {
    return buildDirectoryCatalog(userLeagues, settings);
  }, [userLeagues, settings]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<string>("all");
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
  const [locationLabel, setLocationLabel] = useState<string>("Toronto / GTA Hub");
  const [maxDistanceMiles, setMaxDistanceMiles] = useState<number>(0);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Contact Commissioner Modal State
  const [contactingLeague, setContactingLeague] = useState<DirectoryLeague | null>(null);
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
        setLocationLabel("Your Current Location (GPS)");
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setLocationError("Unable to retrieve location. Please choose a nearby metro region below.");
      },
      { timeout: 10000 }
    );
  };

  const handleSelectRegion = (region: RegionPreset) => {
    setUserCoords({ lat: region.latitude, lon: region.longitude });
    setLocationLabel(region.name);
    setMaxDistanceMiles(region.radiusDefault * 2);
    setLocationError(null);
  };

  // Filtered & Ranked Leagues
  const processedLeagues = useMemo(() => {
    return catalog
      .map((league) => {
        let distanceMiles: number | null = null;
        if (userCoords) {
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

        // Ruleset format filter
        if (selectedFormat !== "all") {
          if (selectedFormat === "5v5" && !league.rulesFormat.includes("5v5")) return false;
          if (selectedFormat === "7v7" && !league.rulesFormat.includes("7v7")) return false;
          if (selectedFormat === "contact" && !league.rulesFormat.includes("Contact")) return false;
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
          return a.registrationFeePerTeam - b.registrationFeePerTeam;
        }
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [
    catalog,
    userCoords,
    searchQuery,
    maxDistanceMiles,
    selectedFormat,
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
    setSearchQuery("");
    setSelectedFormat("all");
    setSelectedDivision("all");
    setSelectedTier("all");
    setSelectedDay("all");
    setSelectedStatus("all");
    setSelectedSurface("all");
    setMaxDistanceMiles(50);
  };

  const handleSendCommissionerMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactingLeague(null);
      setContactMessage("");
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#07090E] text-slate-900 dark:text-white transition-colors duration-200">
      <LeagueHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
        {/* ========================================================= */}
        {/* HERO SECTION & DIRECTORY VALUE PROPOSITION                */}
        {/* ========================================================= */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B0F19] to-slate-900 text-white border border-slate-800 shadow-2xl p-6 sm:p-10 lg:p-12">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                <Globe className="w-3.5 h-3.5" />
                <span><span className="normal-case">FlagOS</span> League Finder</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-300">
                {processedLeagues.length} Available Circuits Near You
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-tight">
              Find a Flag Football League <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Near You</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              Use our interactive locator to discover flag football leagues tailored to your schedule, location, and competition level. Join as an individual free agent or register a team with certified game officials, live box scores, and digital playbooks.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[11px]">Active Venues</span>
              <span className="text-white font-bold text-base sm:text-lg">{uniqueVenues.length} Facilities</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Format Variety</span>
              <span className="text-cyan-400 font-bold text-base sm:text-lg">5v5 &amp; 7v7</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Registration Status</span>
              <span className="text-emerald-400 font-bold text-base sm:text-lg">Open Spots</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Officials &amp; Stats</span>
              <span className="text-amber-400 font-bold text-base sm:text-lg">100% Certified</span>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* INTERACTIVE PROXIMITY & LOCATION CONTROL BAR              */}
        {/* ========================================================= */}
        <section className="bg-white dark:bg-[#0B0F19] rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg p-4 sm:p-6 space-y-4 transition-colors">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
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
                <span className="text-[11px] text-slate-500 dark:text-neutral-400">Radius:</span>
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
                <span className="text-[11px] text-slate-500 dark:text-neutral-400">Sort:</span>
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

          {/* Quick Major Metro Hub Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-200 dark:border-white/5 text-xs">
            <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Compass className="w-3 h-3 text-cyan-500" />
              <span>Quick Regions:</span>
            </span>
            {REGION_PRESETS.map((reg) => {
              const isSelected = locationLabel === reg.name;
              return (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => handleSelectRegion(reg)}
                  className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all cursor-pointer ${
                    isSelected
                      ? "bg-cyan-500 text-black font-bold shadow-sm"
                      : "bg-slate-200/60 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-neutral-300"
                  }`}
                >
                  {reg.name}
                </button>
              );
            })}

            {locationLabel && (
              <span className="ml-auto text-[11px] text-slate-500 dark:text-neutral-400 font-mono flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-500" />
                <span>Center: <strong>{locationLabel}</strong></span>
              </span>
            )}
          </div>

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
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {/* Format Filter */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold shrink-0 shadow-sm">
                <span className="text-[10px] text-slate-400 uppercase">Format:</span>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="bg-transparent text-cyan-600 dark:text-cyan-400 outline-none cursor-pointer"
                >
                  <option value="all" className="dark:bg-[#0B0F19] text-black dark:text-white">All Formats</option>
                  <option value="5v5" className="dark:bg-[#0B0F19] text-black dark:text-white">5v5 Non-Contact</option>
                  <option value="contact" className="dark:bg-[#0B0F19] text-black dark:text-white">5v5 Contact (Jamming)</option>
                  <option value="7v7" className="dark:bg-[#0B0F19] text-black dark:text-white">7v7 Screen Passing</option>
                </select>
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

              {(searchQuery || selectedFormat !== "all" || selectedDivision !== "all" || selectedTier !== "all" || selectedDay !== "all" || selectedStatus !== "all") && (
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
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/80 dark:bg-black/50 border border-slate-300 dark:border-white/10 text-xs font-bold shrink-0 self-end md:self-auto">
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
              Showing <strong>{processedLeagues.length}</strong> public flag football {processedLeagues.length === 1 ? "circuit" : "circuits"}
              {userCoords && maxDistanceMiles > 0 ? ` within ${maxDistanceMiles} miles` : ""}
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
              • All circuits include certified refs &amp; stats
            </span>
          </div>
        </section>

        {/* ========================================================= */}
        {/* LEAGUES CATALOG DISPLAY                                   */}
        {/* ========================================================= */}
        {processedLeagues.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-3xl space-y-4 shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white">
              No Leagues Match Your Search Criteria
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-md mx-auto">
              Try widening your distance radius, clearing keyword filters, or choosing a different region above.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              Reset Filters &amp; Expand Radius
            </button>
          </div>
        ) : viewMode === "cards" ? (
          /* ========================================================= */
          /* CARDS VIEW                                                */
          /* ========================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedLeagues.map((league) => (
              <div
                key={league.id}
                className="bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 hover:border-cyan-500/50 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl group relative overflow-hidden"
              >
                {/* Top Badge Row */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase text-white shadow-sm"
                        style={{ backgroundColor: league.primaryColor }}
                      >
                        {league.shortcode}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                        {league.rulesFormat}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300">
                        {league.division}
                      </span>
                    </div>

                    {league.distanceMiles !== null && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-700 dark:text-cyan-300 shrink-0">
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
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white truncate block">
                          {league.venue.name}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-neutral-400 block truncate">
                          {league.venue.address}, {league.venue.city}, {league.venue.stateOrProvince}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200 dark:border-white/5 text-slate-600 dark:text-neutral-400">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3 text-amber-500" />
                        <span>{league.gameDay}</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-cyan-500" />
                        <span>{league.gameTimeWindow}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400">
                      <span>Field Surface:</span>
                      <span className="font-bold text-slate-800 dark:text-neutral-200">
                        {league.venue.surface}
                      </span>
                    </div>
                  </div>

                  {/* Amenities Checklist Chips */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                      League Features &amp; Perks
                    </span>
                    <ul className="grid grid-cols-1 gap-1 text-[11px] text-slate-700 dark:text-neutral-300">
                      {league.amenities.slice(0, 3).map((item, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 truncate">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="truncate">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Pricing & Direct Action CTAs */}
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block">Team Registration</span>
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        ${league.registrationFeePerTeam}
                        <span className="text-[10px] font-normal text-slate-400"> / team</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-400 block">Free Agent Entry</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        ${league.individualFee}
                        <span className="text-[10px] font-normal text-slate-400"> / player</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/league/${league.id}`}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-black text-xs uppercase tracking-wider text-center transition-all hover:bg-slate-800 dark:hover:bg-cyan-300 flex items-center justify-center gap-1 shadow-sm"
                    >
                      <span>Explore Hub</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => setContactingLeague(league)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider text-center border border-slate-300 dark:border-white/10 transition-colors flex items-center justify-center gap-1 cursor-pointer"
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
          <div className="space-y-6">
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
                      <span>{venue.address}, {venue.city}, {venue.stateOrProvince} {venue.postalCode}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-neutral-300">
                      {venue.surface}
                    </span>
                    {venue.hasLights && (
                      <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold">
                        Lights Equipped
                      </span>
                    )}
                    {venue.mapsUrl && (
                      <a
                        href={venue.mapsUrl}
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
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {l.name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-neutral-300">
                              {l.rulesFormat}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-neutral-400 block truncate">
                            {l.gameDay} • {l.gameTimeWindow} • ${l.registrationFeePerTeam}/team
                          </span>
                        </div>
                        <Link
                          href={`/league/${l.id}`}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider shrink-0 transition-all shadow-sm"
                        >
                          View Hub
                        </Link>
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
          <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-[11px] font-mono uppercase text-slate-500 dark:text-neutral-400">
                  <th className="py-4 px-4 font-bold">Circuit &amp; Format</th>
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
                      <div className="font-bold text-slate-900 dark:text-white">{l.name}</div>
                      <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono font-medium">
                        {l.rulesFormat}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-slate-800 dark:text-neutral-200 font-medium">{l.venue.city}, {l.venue.stateOrProvince}</div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                        {l.distanceMiles !== null ? `${l.distanceMiles} mi away` : l.venue.name}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-700 dark:text-neutral-300">
                      {l.division}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-slate-800 dark:text-neutral-200 font-medium">{l.gameDay}</div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400">{l.gameTimeWindow}</div>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                      ${l.registrationFeePerTeam}
                    </td>
                    <td className="py-4 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      ${l.individualFee}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link
                        href={`/league/${l.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-cyan-300 text-white dark:text-black font-black text-[11px] uppercase tracking-wider transition-colors"
                      >
                        <span>Hub</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
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
        <section className="rounded-3xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-blue-950/40 border border-emerald-500/20 p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-400 flex items-center justify-center md:justify-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Are You a League Commissioner or Organizer?</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-white">
              List Your Circuit on the <span className="normal-case">FlagOS</span> National Directory
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Equip your league with automated schedule generators, real-time live game official clocks, digital playbooks, and player stats tracking.
            </p>
          </div>
          <Link
            href="/pricing"
            className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 cursor-pointer shrink-0"
          >
            Create &amp; List Your League
          </Link>
        </section>
      </main>

      {/* ========================================================= */}
      {/* CONTACT COMMISSIONER INQUIRY MODAL                        */}
      {/* ========================================================= */}
      {contactingLeague && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
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
                  Message Dispatched to Commissioner
                </h4>
                <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm mx-auto">
                  Your inquiry has been relayed to the {contactingLeague.name} staff. You will receive a response at your registered email address.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendCommissionerMessage} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-neutral-400">
                    Topic / Inquiry Reason
                  </label>
                  <select
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Registering as a Free Agent">Registering as a Free Agent (Need a Team)</option>
                    <option value="Registering an Entire Squad">Registering a Full Team Franchise</option>
                    <option value="Ruleset & Equipment Questions">Ruleset, Flags &amp; Equipment Questions</option>
                    <option value="Schedule & Timing Conflict">Game Day Schedule &amp; Timing Inquiry</option>
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

      <LeagueFooter />
    </div>
  );
}
