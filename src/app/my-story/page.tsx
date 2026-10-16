"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Heart,
  Shield,
  Sparkles,
  Lock,
  MessageSquare,
  Flame,
  Award,
  Compass,
  Zap,
  Trophy,
  ArrowUp,
  BookmarkCheck,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { FlagOSText } from "@/components/FlagOSText";
import { FlagOSLogo } from "@/components/FlagOSLogo";
import ThemeToggle from "@/components/ThemeToggle";

interface Chapter {
  id: string;
  number: string;
  era: string;
  navLabel: string;
  title: string;
  tagline: string;
  themeColor: string;
  icon: any;
  badges: string[];
  statPill?: { label: string; value: string };
  paragraphs: string[];
  photoSlot?: { title: string; subtitle: string };
  quoteHighlight?: string;
  tacticalNote?: { title: string; description: string };
}

const CHAPTERS: Chapter[] = [
  {
    id: "recess",
    number: "01",
    era: "2011–2012 • Childhood Roots",
    navLabel: "Childhood Roots",
    title: "Love at first catch",
    tagline: "Two footballs, recess games, and a 4th-grade persuasive letter.",
    themeColor: "from-amber-500/20 to-orange-500/5",
    icon: Flame,
    badges: ["Dartmouth, NS", "Two Footballs", "Dartmouth Destroyers"],
    statPill: { label: "Where it Started", value: "Grade 3 Recess" },
    quoteHighlight: "The next day, both parents walked through the door with a brand-new football—suddenly I had two.",
    paragraphs: [
      "In third grade, I played football for the first time at recess and fell head-over-heels in love with the game instantly. I asked both of my parents for a football without telling either that I had asked the other. The next day, both walked through the door with a brand-new football—suddenly I had two. From then on, I was the kid who brought the football to school every day and tossed it high into the air in the backyard, catching it with one hand whether I was with friends or alone.",
      "A year later, our grade 4/5 split class did a unit on persuasive writing. A friend and I decided to write a persuasive letter to our parents convincing them to let us register for the Dartmouth Destroyers youth tackle football team in the fall. It worked. My friend played one season, but I was hooked for life.",
    ],
    photoSlot: {
      title: "Photo Slot: Where It Began",
      subtitle: "Backyard footballs, childhood playing days, or early sports memories.",
    },
  },
  {
    id: "novascotia",
    number: "02",
    era: "2017–2020 • High School & Recruiting",
    navLabel: "Nova Scotia Grind",
    title: "Nova Scotia All-Star, The Cold-Email Grind, and Leaving Home",
    tagline: "Team Nova Scotia flag, cold-emailing film nationwide, and an East-to-West leap.",
    themeColor: "from-blue-500/20 to-cyan-500/5",
    icon: Compass,
    badges: ["Team Nova Scotia Flag Football", "Sportsmanship Award", "Brian Jones & Grey Cup", "2x All-Star", "$4,500 York Scholarship"],
    statPill: { label: "Recruit Frame", value: "6'3\" • 205 lbs MLB" },
    quoteHighlight: "I packed my bags for Toronto with two non-negotiables: playing competitive university football and earning a software engineering degree.",
    paragraphs: [
      "Because competitive tackle opportunities were limited in Nova Scotia, I grew up playing flag football alongside tackle. That dual experience shaped my football IQ early. Playing for Team Nova Scotia Flag Football at DB/WR, I received the Team Sportsmanship Award at the provincial awards banquet—where in a twist of fate I first met Brian Jones, who had just won the Grey Cup with the Argonauts and brought it home to NS. Years later, Brian would coach me at York.",
      "In grade 11, I was named a Nova Scotia High School Football All-Star Safety, cut my own game film, and cold-emailed tape to university coaches nationwide. Heading into grade 12, I packed on size to reach 6'3\" and 205 lbs at Middle Linebacker, earned All-Star honours a second time, and received offers including $1,500 from the University of Toronto and the maximum $4,500 athletic scholarship from York University. I packed my bags for Toronto with two non-negotiables: playing competitive university football and earning a software engineering degree.",
    ],
    photoSlot: {
      title: "Photo Slot: Nova Scotia High School Football & Tape",
      subtitle: "High school game action, All-Star banquet, or early recruitment film session.",
    },
  },
  {
    id: "york",
    number: "03",
    era: "2021–2024 • York Lions Varsity",
    navLabel: "York Lions Varsity",
    title: "Four Years with the York Lions (2021–2024)",
    tagline: "Special teams grinder, scoop-and-score TD, quitting and returning, and captaincy.",
    themeColor: "from-red-500/20 to-rose-500/5",
    icon: Shield,
    badges: ["York Lions", "Team Captain", "Special Teams Starter", "Blocked Kick TD", "Software Engineering"],
    statPill: { label: "Varsity Career", value: "4 Seasons • Captain" },
    quoteHighlight: "I returned sleeping on teammate Theo's pull-out couch. In Week 2, coach Brian Jones named me a team captain to anchor the locker room.",
    paragraphs: [
      "I earned every inch on special teams starting as a true rookie calling punt cadence. On a Friday night game right before Thanksgiving against Windsor in 2022, I scooped up a blocked kick and took it in for a touchdown before halftime with my family in the stands. That season, I also threw lead blocks that sprang my roommate Alfred Olay to become York's first U SPORTS 1st Team All-Canadian returner in nearly 20 years.",
      "Exhausted from losing and lacking defensive opportunity, I made the hard decision to quit the York team following 2022. Three weeks before 2023 camp, Brian Jones called and asked if I was truly done with football. I wasn't. I returned with nowhere to live, sleeping on teammate Theo's pull-out couch. In Week 2, coach Brian Jones named me a team captain to anchor the locker room. I started across SAM, WILL, and MIKE linebacker, plus tight end and defensive end, all while balancing morning film, practices, a job, and the final year of my demanding Software Engineering degree.",
    ],
    photoSlot: {
      title: "Photo Slot: York University Football",
      subtitle: "York Lions jersey, game action (Linebacker / DE / Tight End), or 2023 Captain portrait.",
    },
  },
  {
    id: "readingweek",
    number: "04",
    era: "Winter 2024 • The Spark",
    navLabel: "Reading Week Favor",
    title: "A Reading Week Favor That Changed Everything",
    tagline: "Volunteering for women's flag football over reading week and discovering a hunger for real schemes.",
    themeColor: "from-purple-500/20 to-indigo-500/5",
    icon: Sparkles,
    badges: ["Reading Week", "OWIFA", "Eager Sponges", "Lacked the Ego"],
    statPill: { label: "Program Need", value: "OWIFA 11v11 Flag" },
    quoteHighlight: "They were eager sponges who soaked up high-level football knowledge and completely lacked the ego common in men's locker rooms.",
    paragraphs: [
      "Over reading week before my final season, our new head coach asked if anyone would volunteer to help the women's flag team for their OWIFA season. A bunch of guys came out to make an impression on the coach, but Theo and I stayed. We noticed immediately that the women loved the game even more than our tackle teammates: they were eager sponges who soaked up high-level football knowledge and completely lacked the ego common in men's locker rooms.",
      "Yet the program was struggling—practices lacked direction, and existing coaches treated the athletes as though they weren't capable of understanding complex schemes. Seeing dedicated female competitors held back and talked down to didn't sit right with us. They deserved real coaching, real schemes, and real respect.",
    ],
    tacticalNote: {
      title: "Scheme Philosophy Shift",
      description: "Introducing true college coverage concepts, match principles, and motion-based offensive designs to athletes hungry to master real football.",
    },
  },
  {
    id: "turnaround",
    number: "05",
    era: "Winter 2024 • The 7-Day Turnaround",
    navLabel: "0-7 to Playoffs",
    title: "One Week, A New Playbook, and 0-7 to the Playoffs",
    tagline: "Hired at 0-7, installing a college defense in 7 days, and beating Waterloo in the play-in rematch.",
    themeColor: "from-emerald-500/20 to-teal-500/5",
    icon: Trophy,
    badges: ["0-7 to Playoffs", "Waterloo Rematch 17-8", "Tendency Adjustment", "OWIFA Play-In"],
    statPill: { label: "Play-In Rematch", value: "17-8 Victory" },
    quoteHighlight: "Seeded into an immediate 8th vs. 9th play-in rematch against Waterloo, our athletes executed live for a 17-8 victory.",
    paragraphs: [
      "Operating under the club's own student executive structure, the leadership parted ways with previous coaches and hired our group just one week before their final tournament—with the squad sitting at 0-7. Braden stepped in as head coach, while Theo and I served as co-defensive coordinators. In seven days, we installed an entirely new defensive system and revamped the offense.",
      "Tournament day came: we lost a tight 17-10 battle to Guelph, then fell 18-3 to Waterloo. But on the sideline, Theo and I spotted a distinct Waterloo offensive tendency. Seeded into an immediate 8th vs. 9th play-in rematch against Waterloo, we walked our players through the tendency and trusted them to adjust live. They executed flawlessly, taking a 17-8 victory to punch their ticket to the OWIFA playoffs before falling 20-0 to eventual champion Western. It proved that female athletes with real football knowledge will execute under pressure every time.",
    ],
    photoSlot: {
      title: "Photo Slot: The 0-7 Turnaround & Playoff Game",
      subtitle: "The sideline against Waterloo, team huddle, or playoff tournament team shot.",
    },
  },
  {
    id: "culture",
    number: "06",
    era: "2024–2026 • Rebuilding",
    navLabel: "Program Rebuilding",
    title: "Handing Out Flyers & Rebuilding from the Ground Up",
    tagline: "Creating an elite safe culture, Theo's hiring at 25, and official recognition.",
    themeColor: "from-cyan-500/20 to-blue-500/5",
    icon: Zap,
    badges: ["Head Coach", "Theo (Recruiting Coordinator at 25)", "Ontario Recognition", "Campus Flyers"],
    statPill: { label: "Status Approved", value: "Varsity 2026" },
    quoteHighlight: "Theo was hired as men's tackle Recruiting Coordinator—one of Canada's youngest full-time university coaches at just 25 years old.",
    paragraphs: [
      "When Braden transferred to Windsor, Theo and I took over as Head Coach and Defensive Coordinator. Theo worked relentlessly, serving as a Graduate Assistant before being hired as York Lions men's tackle full-time Recruiting Coordinator—becoming one of Canada's youngest full-time university coaches at just 25 years old.",
      "We poured everything into the club, walking campus handing out flyers to make it an empowering, safe, and serious program. By 2026, women's flag football was officially approved to transition to full varsity status across Ontario universities—and we are fighting daily to ensure our women receive the varsity recognition they've earned.",
    ],
    tacticalNote: {
      title: "Official Varsity Recognition",
      description: "Pushing from club designation toward official provincial varsity athletics, building the administrative and coaching framework to match.",
    },
  },
  {
    id: "flagos",
    number: "07",
    era: "2025–Present • The Birth of FlagOS",
    navLabel: "The Birth of FlagOS",
    title: "Ninety Players on the Turf, and the Birth of FlagOS",
    tagline: "90 tryout attendees, the volunteer play-by-play wizard, and an honest two-sided platform.",
    themeColor: "from-emerald-500/25 to-cyan-500/10",
    icon: Award,
    badges: ["90 Tryout Attendees", "YUWFFL", "Play-by-Play Wizard", "Extreme Volunteer Constraints", "Two Operating Modes", "Honest Pricing"],
    statPill: { label: "Core Operating Philosophy", value: "No Corporate Greed" },
    quoteHighlight: "No corporate greed, no locking features behind higher-priced tiers, just honest pricing based on active user-base.",
    paragraphs: [
      "When 90 athletes showed up for 5v5 tryouts, I couldn't stomach cutting 75+ passionate women. I created our own campus league (YUWFFL) so everyone could play. While we weren’t exactly successful in retaining all 90 athletes as classes and jobs pulled people away, the core community flourished. But I couldn't run field operations while coaching our travel team.",
      "My volunteer assistant coaches were former varsity tackle teammates working under extreme volunteer constraints. Existing software was clunky and confusing. Using my workflow automation experience at Partners for Planning (P4P) and software engineering background, I built the Play-by-Play Wizard so my assistant coaches could manage everything without a great deal of stress or effort from their phones with automated downs and yardage.",
      "The platform expanded into two separate operating modes: an effortless game-day operating system for leagues on one side, and a specialized coaching portal with wristband generators and playbooks on the other. No one outside our team knew about it, but friends and players loved it so much that I took a leap of faith to build FlagOS. No corporate greed, no locking features behind higher-priced tiers, just honest pricing based on active user-base.",
    ],
    photoSlot: {
      title: "Photo Slot: The 90-Player Tryout & Team",
      subtitle: "Tryout field packed with players, campus flyers, or full team huddle.",
    },
  },
];

export default function MyStoryPage() {
  const router = useRouter();
  const { user, isPlatformAdmin, loading } = useAuth();
  const [activeChapterId, setActiveChapterId] = useState<string>("recess");
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const isMe =
    user?.email?.trim().toLowerCase() === "dextersargent@gmail.com" ||
    Boolean(isPlatformAdmin);

  // If someone who is not Dexter navigates directly to this route, redirect them to the home page
  useEffect(() => {
    if (!loading && !isMe) {
      router.replace("/");
    }
  }, [isMe, loading, router]);

  // Track active section and scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100)));
      }

      // Check which chapter is currently in view
      const scrollY = window.scrollY + 200;
      for (let i = CHAPTERS.length - 1; i >= 0; i--) {
        const el = document.getElementById(CHAPTERS[i].id);
        if (el && el.offsetTop <= scrollY) {
          setActiveChapterId(CHAPTERS[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToChapter = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const topOffset = el.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: topOffset, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07090E] text-neutral-400">
        <div className="flex items-center gap-2 text-sm font-mono">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Opening personal archive...</span>
        </div>
      </div>
    );
  }

  if (!isMe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-black px-4 text-center font-sans">
        <div className="max-w-md space-y-4 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 shadow-2xl">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Private Page
          </h1>
          <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
            This personal story page is currently restricted.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07080D] text-slate-900 dark:text-white font-sans transition-colors duration-200 selection:bg-emerald-500/20 selection:text-emerald-300 relative overflow-x-clip">
      {/* Top Reading Progress Bar */}
      <div
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 z-50 transition-all duration-150"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Ambient Lighting Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[65rem] h-[32rem] bg-gradient-to-b from-emerald-500/10 via-cyan-500/5 to-transparent blur-[130px] pointer-events-none" />

      {/* Top Editorial Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-[#07080D]/85 border-b border-slate-200/80 dark:border-white/10 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </Link>

          <Link href="/" className="flex items-center gap-2">
            <FlagOSLogo size="sm" />
            <FlagOSText className="text-lg font-black tracking-tight" />
          </Link>

          <div className="flex items-center gap-2.5">
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      {/* Main Magazine Layout */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12 relative z-10">
        {/* Editorial Hero Section */}
        <section className="text-center space-y-6 max-w-4xl mx-auto pt-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 shadow-sm">
            <Heart className="w-3.5 h-3.5 text-emerald-500 fill-current" />
            <span>Founder&rsquo;s Documentary • The Real Origin Story</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight leading-[1.04] text-slate-900 dark:text-white">
            Why I Built <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 bg-clip-text text-transparent">FlagOS</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-neutral-300 leading-relaxed font-light max-w-3xl mx-auto">
            I’m not a software company or a venture-backed startup. I’m a former varsity football player and software engineering student who stepped in to coach a women’s flag program, saw what our sideline was up against, and decided to build the tools our athletes deserved.
          </p>

          {/* Dexter's Signature Credentials Strip */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-5 py-2.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-neutral-300 shadow-sm">
            <span className="font-extrabold text-slate-900 dark:text-white">Dexter Sargent</span>
            <span className="opacity-40">•</span>
            <span>York Lions Alum (2021-2024)</span>
            <span className="opacity-40">•</span>
            <span>Software Engineering Student</span>
            <span className="opacity-40">•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Head Coach, York University Womens Football</span>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/70 border border-slate-200 dark:border-white/10 text-center shadow-sm backdrop-blur-md">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 block font-mono">
                4 Yrs
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider block mt-0.5">
                York Lions Football
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/70 border border-slate-200 dark:border-white/10 text-center shadow-sm backdrop-blur-md">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 block font-mono">
                0-7 &rarr; 17-8
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider block mt-0.5">
                Playoff Rematch
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/70 border border-slate-200 dark:border-white/10 text-center shadow-sm backdrop-blur-md">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 block font-mono">
                90
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider block mt-0.5">
                Tryout Athletes
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/70 border border-slate-200 dark:border-white/10 text-center shadow-sm backdrop-blur-md">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 block font-mono">
                100%
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider block mt-0.5">
                Frictionless Sideline
              </span>
            </div>
          </div>
        </section>

        {/* Sticky Chapter Navigation Ribbon */}
        <nav
          aria-label="Story Chapters"
          className="sticky top-14 z-30 p-1.5 rounded-2xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-md"
        >
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 pl-2 pr-1 shrink-0">
              Chapters:
            </span>
            {CHAPTERS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => scrollToChapter(ch.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeChapterId === ch.id
                    ? "bg-emerald-500 text-black shadow-md font-black"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                <span className="font-mono text-[10px] opacity-75">{ch.number}</span>
                <span>{ch.navLabel}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Longform Editorial Chapter Spreads */}
        <div className="space-y-12">
          {CHAPTERS.map((ch, idx) => {
            const IconComponent = ch.icon;
            return (
              <article
                key={ch.id}
                id={ch.id}
                className="scroll-mt-32 p-6 sm:p-10 md:p-12 rounded-3xl bg-white dark:bg-gradient-to-br dark:from-neutral-900/90 dark:via-neutral-900/60 dark:to-neutral-950 border border-slate-200 dark:border-white/10 shadow-xl relative overflow-hidden backdrop-blur-md transition-all hover:border-slate-300 dark:hover:border-white/20"
              >
                {/* Ambient chapter glow */}
                <div
                  className={`absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl ${ch.themeColor} rounded-full blur-3xl pointer-events-none`}
                />

                {/* Chapter Metadata Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-200/80 dark:border-white/10 relative z-10">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm flex items-center justify-center">
                      {ch.number}
                    </span>
                    <div>
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                        {ch.era}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                        Chapter {idx + 1} of {CHAPTERS.length}
                      </span>
                    </div>
                  </div>

                  {ch.statPill && (
                    <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono">
                      <span className="text-slate-500 dark:text-neutral-400">{ch.statPill.label}: </span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-black">{ch.statPill.value}</strong>
                    </div>
                  )}
                </div>

                {/* Chapter Title & Tagline */}
                <div className="pt-8 pb-4 relative z-10 space-y-2">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-[1.08]">
                    {ch.title}
                  </h2>
                  <p className="text-sm sm:text-base font-medium italic text-slate-500 dark:text-neutral-400">
                    &ldquo;{ch.tagline}&rdquo;
                  </p>

                  {/* Badges strip */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {ch.badges.map((badge, bIdx) => (
                      <span
                        key={bIdx}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-neutral-300"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 2-Column Split: Prose + Media Callouts */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 pt-4 relative z-10 items-start">
                  {/* Left Column: Narrative Prose & Pull-Quote */}
                  <div className="lg:col-span-7 space-y-6">
                    {ch.quoteHighlight && (
                      <blockquote className="p-4 sm:p-5 rounded-2xl bg-emerald-500/5 border-l-4 border-emerald-500 text-slate-800 dark:text-neutral-200 text-sm sm:text-base italic leading-relaxed">
                        &ldquo;{ch.quoteHighlight}&rdquo;
                      </blockquote>
                    )}

                    <div className="space-y-4 text-base sm:text-lg text-slate-700 dark:text-neutral-300 leading-relaxed font-normal">
                      {ch.paragraphs.map((p, pIdx) => (
                        <p key={pIdx}>{p}</p>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Photo Slot / Tactical Card */}
                  <div className="lg:col-span-5 space-y-4">
                    {ch.photoSlot && (
                      <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/20 bg-slate-100/70 dark:bg-neutral-950/80 p-6 text-center space-y-3 group hover:border-emerald-500/50 transition-colors">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-neutral-400 flex items-center justify-center group-hover:text-emerald-500 group-hover:scale-105 transition-all">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            {ch.photoSlot.title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 leading-relaxed">
                            {ch.photoSlot.subtitle}
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 dark:bg-white/10 text-[11px] font-mono font-medium text-slate-600 dark:text-neutral-400">
                          <BookmarkCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Archived Memory Slot</span>
                        </div>
                      </div>
                    )}

                    {ch.tacticalNote && (
                      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-5 space-y-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                          Tactical Note
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {ch.tacticalNote.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                          {ch.tacticalNote.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chapter Bottom Jump to Next */}
                {idx < CHAPTERS.length - 1 && (
                  <div className="pt-6 mt-6 border-t border-slate-100 dark:border-white/5 flex justify-end relative z-10">
                    <button
                      onClick={() => scrollToChapter(CHAPTERS[idx + 1].id)}
                      className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      <span>Next: Chapter {CHAPTERS[idx + 1].number}</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* Personal Sign-off Card */}
        <section className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-6">
          <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 shadow-xl space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                A Note to Coaches &amp; Players
              </span>
              <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Built with Heart, For the Game
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-neutral-400 leading-relaxed">
                Whether you’re running a competitive university club, a weekend travel circuit, or an adult semi-contact league, I hope FlagOS gives you back your hours and gives your athletes the respect and recognition they deserve on the field.
              </p>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-t border-slate-100 dark:border-white/5">
              <div className="space-y-1">
                <span className="text-lg font-black text-slate-900 dark:text-white block">
                  Dexter Sargent
                </span>
                <p className="text-xs text-slate-500 dark:text-neutral-400 font-medium">
                  Head Coach • York Lions Football Alum (#50) • NS All-Star • Final-Year Software Engineering • Creator of FlagOS
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  dextersargent@gmail.com
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-bold transition-all"
                >
                  Return to Home
                </Link>
                <a
                  href="mailto:dextersargent@gmail.com"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send a Note</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Editorial Footer */}
      <footer className="border-t border-slate-200/80 dark:border-white/10 py-10 text-center text-xs text-slate-500 dark:text-neutral-500">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <p>© {new Date().getFullYear()} FlagOS • Built with pride for the flag football community.</p>
        </div>
      </footer>
    </div>
  );
}
