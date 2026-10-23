"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Lock,
  Camera,
  Upload,
  Plus,
  Trash2,
  Image as ImageIcon,
  X,
  Check,
  ExternalLink,
  Clock,
  Sparkles,
  MapPin,
  Calendar,
  Award,
  Trophy,
  Quote,
  BookOpen,
  Share2,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { FlagOSText } from "@/components/FlagOSText";
import { FlagOSLogo } from "@/components/FlagOSLogo";
import ThemeToggle from "@/components/ThemeToggle";
import AccountMenu from "@/components/AccountMenu";

interface StorySection {
  id: string;
  number: string;
  era: string;
  location: string;
  title: string;
  paragraphs: string[];
  suggestedPhoto: string;
  photoPromptLabel: string;
  quote?: {
    text: string;
    attribution: string;
  };
  stat?: {
    value: string;
    label: string;
  };
}

interface StoredPhoto {
  url: string;
  caption?: string;
  addedAt?: string;
}

type StoredPhotosMap = Record<string, StoredPhoto>;

const STORY_SECTIONS: StorySection[] = [
  {
    id: "first-football",
    number: "01",
    era: "Elementary School",
    location: "Dartmouth, Nova Scotia",
    title: "Childhood Roots in Dartmouth",
    suggestedPhoto: "Childhood team photo, first football, or Dartmouth Destroyers gear",
    photoPromptLabel: "Dartmouth Destroyers & Youth Football",
    stat: {
      value: "Grade 3",
      label: "First Football & Lifelong Dedication",
    },
    paragraphs: [
      "In the third grade, I played football for the first time with some older kids at my school and immediately fell in love with the game. Soon after, I asked both of my parents to buy me a football without telling the other, and they both came home with one for me. From then on, I was always the kid who brought a football to school. When the older kids went to junior high, I would beg my friends to spend their recesses and lunches playing football with me on the field. The next year, in a grade 4/5 split classroom, during our persuasive writing unit, I wrote a letter to convince my mom to let me join the Dartmouth Destroyers, laying out my case line by line: why it was safe, how I would keep my grades up, and how I would care for my gear. My mom agreed, setting off my lifelong involvement with the sport.",
    ],
  },
  {
    id: "leaving-home",
    number: "02",
    era: "High School & Cold-Email Era",
    location: "Halifax / Dartmouth, NS",
    title: "High School & The Recruiting Grind",
    suggestedPhoto: "High school game tape clipping, film cut-up, or multi-position lineup",
    photoPromptLabel: "Highlight Tape & Recruiting Grind",
    stat: {
      value: "Full OUA",
      label: "Dual Athletic & Engineering Scholarship",
    },
    paragraphs: [
      "Growing up, opportunities for tackle football were limited; I always played both flag and tackle football to get my fill, lining up at safety, linebacker, cornerback, quarterback, tight end, and just about any other position they would let me play throughout high school. Coming out of Nova Scotia, Canada, getting recruited didn’t mean NIL and ten-million-dollar locker rooms, it meant putting in hours of cold-emailing, clipping game film, and sending highlight tapes directly to every university head coach and defensive coordinator in the country. That effort paid off when I earned a full OUA athletic scholarship to York University alongside academic scholarships for software engineering. I packed my bags for Toronto, ready to balance competitive athletics with an engineering degree.",
    ],
  },
  {
    id: "york",
    number: "03",
    era: "2019 – 2023",
    location: "York University, Toronto",
    title: "York University Varsity Career",
    suggestedPhoto: "York Lions varsity jersey #50, Thanksgiving blocked kick TD return, or living room couch",
    photoPromptLabel: "York Lions #50 & Varsity Brotherhood",
    stat: {
      value: "4 Seasons",
      label: "Varsity Linebacker & Team Captain",
    },
    paragraphs: [
      "I spent four seasons as a varsity athlete with the York Lions, playing linebacker and key special teams units. One of the highlights of my playing career came right before Thanksgiving in 2022 against Windsor, when I scooped up a blocked kick and returned it for a touchdown right before halftime with my family in the stands. Balancing engineering coursework with varsity football was exhausting, and despite moments like that, overwhelmed by team struggle and a lack of clear opportunity after the 2022 season, I stepped away from the program. But before the 2023 training camp, I felt pulled back to finish what I started. I returned on a whim, academically ineligible and with nowhere to live. My teammate Theo, having lived with me the year before, took me in alongside his roommates. They opened their door and let me sleep on a couch in their living room for weeks while we went through training camp and began our season. Staying there and having nowhere to go except the main gathering space forged a bond between us. In Week 3 of that season, I was named a team captain after we lost one of our top players and captains for the season, reflecting the leadership and resilience Theo and I pushed each other to bring every day. After a few weeks on the couch, I moved into a dingy, overpriced apartment to finish out the year before eventually moving in with other teammates at season's end.",
    ],
  },
  {
    id: "coaching",
    number: "04",
    era: "Reading Week 2024",
    location: "OWIFA Championship Circuit",
    title: "Coaching York Women's Flag Football",
    suggestedPhoto: "York Women's Flag Football huddle, playoff win celebration, or whiteboard installation",
    photoPromptLabel: "York Women's Flag Football & 17-8 Playoff Win",
    stat: {
      value: "17 - 8",
      label: "Playoff Qualification Victory vs Waterloo",
    },
    paragraphs: [
      "During Reading Week in 2024, when the new head coach of the men's team asked people to come out and help the women’s flag team, everybody jumped at the opportunity so we could make a good impression on our new coach. Theo and I volunteered. We quickly realized how much potential the women's flag team had, fell in love with it, and kept coming back to share our knowledge. After a few weeks, the program parted ways with their previous coaches and asked us to take over. We found a group of dedicated athletes who loved the game and wanted to learn, establishing a balanced coaching standard: combining my engineering mindset for structured tactical schemes with Theo's relentless effort and determination. Sitting at 0-7, our coaching staff took over full leadership just one week before the OWIFA play-in tournament. Many people in this situation would look to simplify, go with what works, but we knew our athletes had far more capacity if they were treated like the intelligent football players they are. We overhauled everything, installing an entirely new, more complex defensive playbook in a single week. After losing our first two in close games, we headed into the play-in game against Waterloo 0-9. We executed smoothly and won 17-8 to qualify for the playoffs, proving what we could accomplish when we provided clear structure.",
    ],
  },
  {
    id: "turnaround",
    number: "05",
    era: "2024 – 2026",
    location: "National USports Movement",
    title: "Rebuilding & Varsity Status",
    suggestedPhoto: "Campus recruitment flyers, team tryouts, or USports announcement",
    photoPromptLabel: "Campus Recruiting & USports Recognition",
    stat: {
      value: "2027",
      label: "USports Inaugural Varsity Pilot Program",
    },
    paragraphs: [
      "After the playoff run, we turned our focus toward building the long-term foundation of the program. We handed out flyers across campus and organized recruitment events. Theo worked countless hours as a graduate assistant, which directly led to his hiring as a full-time university coach and recruiting coordinator for the men's team at age 25, one of the youngest full-time university football coaches in the nation. Together, we continued pushing for women's flag football to achieve official varsity recognition across Canadian universities, and in 2026, it was announced that USports would pilot a varsity flag football program beginning in 2027. It is now up to us to convince the school that our athletes deserve varsity recognition.",
    ],
  },
  {
    id: "flagos",
    number: "06",
    era: "Late Night Engineering",
    location: "FlagOS Software Architecture",
    title: "Building FlagOS",
    suggestedPhoto: "FlagOS sideline interface, wristband designer, or late-night code build",
    photoPromptLabel: "FlagOS Sideline Software & YUWFFL",
    stat: {
      value: "$30 / mo",
      label: "Community Accessible Pricing",
    },
    paragraphs: [
      "When 90 students showed up for tryouts the following season, we knew we needed to maintain numbers for our 11v11 season that comes after our 5v5 season. I created the York University Women's Flag Football League (YUWFFL) so everyone had a place to play and to help maintain our participation numbers outside of our competitive travel team. Since my primary focus had to remain on managing the competitive team, I built FlagOS out of necessity to reduce the administrative load on my volunteer assistant coaches. The team acted as a product tester and focus group as we used the early versions of the app; I would go home after practices, tweak it, add features, and stay up until 4am night after night building it, because I knew firsthand, that I had built something that works. Although we didn't maintain all 90 athletes as classes, jobs, and a disinterest in less competitive football pulled people away, we successfully used the system to run the entire league. I tried to keep pricing fair and accessible ($30/month for team playbooks and custom wristband generation, or $40/month + $15 per team for full league management) to give community programs practical tools built by coaches who lived through the grind.",
    ],
  },
];

const STORAGE_KEY = "flagos_story_photos";

export default function MyStoryPage() {
  const router = useRouter();
  const { user, isPlatformAdmin, loading } = useAuth();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSectionId, setActiveSectionId] = useState("first-football");
  const [photos, setPhotos] = useState<StoredPhotosMap>({});
  const [copiedLink, setCopiedLink] = useState(false);

  // Modal State for adding/updating a photo
  const [activeModalSection, setActiveModalSection] = useState<StorySection | null>(null);
  const [modalImageUrl, setModalImageUrl] = useState("");
  const [modalCaption, setModalCaption] = useState("");
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isMe =
    user?.email?.trim().toLowerCase() === "dextersargent@flagos.ca" ||
    user?.email?.trim().toLowerCase() === "dextersargent@gmail.com" ||
    Boolean(isPlatformAdmin);

  // Load photos from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setPhotos(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Unable to read story photos from localStorage", e);
    }
  }, []);

  // Save photos to localStorage
  const savePhotosMap = (updated: StoredPhotosMap) => {
    setPhotos(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Unable to save story photos to localStorage", e);
    }
  };

  useEffect(() => {
    if (!loading && !isMe) router.replace("/");
  }, [isMe, loading, router]);

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
      setScrollProgress(progress);

      // Determine active section for sidebar/timeline highlight
      const sectionElements = STORY_SECTIONS.map((s) => ({
        id: s.id,
        el: document.getElementById(s.id),
      }));

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const item = sectionElements[i];
        if (item.el) {
          const rect = item.el.getBoundingClientRect();
          if (rect.top <= 260) {
            setActiveSectionId(item.id);
            break;
          }
        }
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const openPhotoModal = (section: StorySection) => {
    setActiveModalSection(section);
    const existing = photos[section.id];
    setModalImageUrl(existing?.url || "");
    setModalCaption(existing?.caption || "");
  };

  const closePhotoModal = () => {
    setActiveModalSection(null);
    setModalImageUrl("");
    setModalCaption("");
    setIsReadingFile(false);
  };

  const handleSaveModalPhoto = () => {
    if (!activeModalSection) return;
    if (!modalImageUrl.trim()) {
      // Remove photo if URL is cleared
      const updated = { ...photos };
      delete updated[activeModalSection.id];
      savePhotosMap(updated);
      closePhotoModal();
      return;
    }

    const updated = {
      ...photos,
      [activeModalSection.id]: {
        url: modalImageUrl.trim(),
        caption: modalCaption.trim(),
        addedAt: new Date().toISOString(),
      },
    };
    savePhotosMap(updated);
    closePhotoModal();
  };

  const handleRemovePhoto = (sectionId: string) => {
    const updated = { ...photos };
    delete updated[sectionId];
    savePhotosMap(updated);
    closePhotoModal();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReadingFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setModalImageUrl(reader.result);
      }
      setIsReadingFile(false);
    };
    reader.onerror = () => {
      setIsReadingFile(false);
      alert("Failed to read image file. Please try another image.");
    };
    reader.readAsDataURL(file);
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9F8F5] text-sm text-neutral-500 dark:bg-[#080B08] dark:text-neutral-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3CA505] border-t-transparent" />
          <span className="font-mono text-xs tracking-wider uppercase">Loading Story…</span>
        </div>
      </div>
    );
  }

  if (!isMe) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9F8F5] px-4 text-center dark:bg-[#080B08]">
        <div className="max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#121612]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#3CA505]/10 text-[#3CA505]">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Private Founder Story
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            This personal documentary memoir is restricted to Dexter Sargent and FlagOS team administrators.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#3CA505] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#3CA505]/25 transition hover:bg-[#328b04]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to FlagOS
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[#F9F8F5] font-sans text-[#1D211C] selection:bg-[#3CA505]/25 dark:bg-[#080B08] dark:text-[#EDF0EB]">
      {/* Top Reading Progress Bar */}
      <div
        aria-hidden="true"
        className="fixed left-0 top-0 z-[60] h-1 bg-gradient-to-r from-[#287A06] via-[#3CA505] to-[#70CB42] transition-[width] duration-150 shadow-[0_0_12px_rgba(60,165,5,0.6)]"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Modern Sticky Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-black/[0.08] bg-[#F9F8F5]/90 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#080B08]/90 transition-colors">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-lg border border-black/5 bg-black/[0.03] px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-[#3CA505]/40 hover:bg-[#3CA505]/10 hover:text-[#287A06] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300 dark:hover:border-[#3CA505]/50 dark:hover:text-[#70CB42]"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to FlagOS</span>
            </Link>

            <div className="hidden h-4 w-px bg-black/10 dark:bg-white/10 sm:block" />

            <Link href="/" aria-label="FlagOS home" className="flex items-center gap-2.5">
              <FlagOSLogo size="sm" />
              <FlagOSText className="text-base font-bold tracking-tight" />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              title="Copy link to story"
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/5 bg-black/[0.03] px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-black/[0.07] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300 dark:hover:bg-white/[0.08]"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#3CA505]" />
                  <span className="text-[#3CA505]">Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>
            <ThemeToggle size="sm" />
            <AccountMenu />
          </div>
        </div>
      </header>

      {/* Main Content Layout with Sticky Chapter Index */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          {/* Table of Contents Sticky Rail on Desktop */}
          <aside className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-24 space-y-6">
              <nav
                aria-label="Story contents"
                className="rounded-2xl border border-black/[0.08] bg-white/80 p-5 shadow-sm backdrop-blur-md dark:border-white/[0.08] dark:bg-[#111611]/80"
              >
                <div className="mb-4 flex items-center justify-between border-b border-black/[0.06] pb-3 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#3CA505]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                      Chapters &amp; Timeline
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-neutral-500">6 Chapters</span>
                </div>

                <div className="space-y-1.5">
                  {STORY_SECTIONS.map((section) => {
                    const isActive = activeSectionId === section.id;
                    const hasPhoto = Boolean(photos[section.id]?.url);

                    return (
                      <a
                        key={section.id}
                        href={`#${section.id}`}
                        className={`group flex items-start gap-3 rounded-xl p-2.5 text-xs transition-all ${
                          isActive
                            ? "bg-[#3CA505]/10 text-[#287A06] font-semibold dark:bg-[#3CA505]/20 dark:text-[#70CB42]"
                            : "text-neutral-600 hover:bg-black/[0.04] dark:text-neutral-400 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            isActive ? "text-[#3CA505]" : "text-neutral-400 group-hover:text-neutral-600 dark:text-neutral-500"
                          }`}
                        >
                          {section.number}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{section.title}</p>
                          <p className="truncate text-[10px] text-neutral-500 dark:text-neutral-400">
                            {section.era}
                          </p>
                        </div>
                        {hasPhoto && (
                          <span
                            title="Photo attached"
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#3CA505]/20 text-[#3CA505]"
                          >
                            <ImageIcon className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </a>
                    );
                  })}
                </div>
              </nav>

              {/* Photo Status Quick Card */}
              <div className="rounded-2xl border border-black/[0.08] bg-black/[0.02] p-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  <Camera className="h-4 w-4 text-[#3CA505]" />
                  <span>Interactive Photo Frames</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Every chapter features an interactive frame ready for your athletic photos. Click on any frame to upload images or paste URLs right from your browser.
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500">
                  <span>Photos attached:</span>
                  <span className="font-mono font-bold text-[#3CA505]">
                    {Object.keys(photos).length} / {STORY_SECTIONS.length}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* Mobile / Tablet Horizontal Chapter Jump Bar */}
          <div className="mb-8 block lg:hidden">
            <nav
              aria-label="Chapter quick jump bar"
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
            >
              {STORY_SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm transition hover:border-[#3CA505] hover:text-[#287A06] dark:border-white/10 dark:bg-[#121612] dark:text-neutral-300"
                >
                  <span className="font-mono text-[10px] text-[#3CA505] font-bold">
                    {section.number}
                  </span>
                  <span>{section.title}</span>
                </a>
              ))}
            </nav>
          </div>

          {/* Narrative Articles Column */}
          <div className="lg:col-span-8 space-y-16 sm:space-y-20">
            {STORY_SECTIONS.map((section, idx) => {
              const currentPhoto = photos[section.id];

              return (
                <article
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-24 border-t border-black/10 pt-10 dark:border-white/10 sm:pt-14"
                >
                  {/* Chapter Header Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center justify-center rounded-md bg-[#3CA505]/15 px-2 py-0.5 font-mono text-xs font-bold text-[#287A06] dark:bg-[#3CA505]/20 dark:text-[#70CB42]">
                        {section.number}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Chapter {section.number}
                      </span>
                      <span className="text-neutral-300 dark:text-neutral-700">•</span>
                      <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <MapPin className="h-3 w-3" />
                        {section.location}
                      </span>
                    </div>

                    <span className="rounded-full bg-black/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-white/[0.04] dark:text-neutral-400">
                      {section.era}
                    </span>
                  </div>

                  {/* Chapter Title */}
                  <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#1D211C] dark:text-[#EDF0EB] sm:text-3xl md:text-4xl [text-wrap:balance]">
                    {section.title}
                  </h2>

                  {/* Body Paragraphs */}
                  <div className="mt-6 space-y-5 text-base leading-relaxed text-neutral-700 dark:text-neutral-300 sm:text-lg sm:leading-8 [text-wrap:pretty]">
                    {section.paragraphs.map((p, pIdx) => (
                      <p key={pIdx}>{p}</p>
                    ))}
                  </div>

                  {/* Section Highlight Quote (if any) */}
                  {section.quote && (
                    <div className="my-8 rounded-2xl border-l-4 border-[#3CA505] bg-black/[0.02] p-5 sm:p-6 dark:bg-white/[0.02]">
                      <p className="text-base italic leading-relaxed text-neutral-800 dark:text-neutral-200 sm:text-lg">
                        &ldquo;{section.quote.text}&rdquo;
                      </p>
                      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#287A06] dark:text-[#70CB42]">
                        — {section.quote.attribution}
                      </p>
                    </div>
                  )}

                  {/* Chapter Photo Frame Showcase */}
                  <div className="mt-8">
                    {currentPhoto?.url ? (
                      /* Display Attached Photo */
                      <div className="group relative overflow-hidden rounded-2xl border border-black/10 bg-black/5 shadow-md dark:border-white/10 dark:bg-white/5">
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={currentPhoto.url}
                            alt={currentPhoto.caption || section.title}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />

                          {/* Hover action bar */}
                          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/50 opacity-0 backdrop-blur-xs transition-opacity duration-200 group-hover:opacity-100">
                            <button
                              onClick={() => openPhotoModal(section)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-neutral-900 shadow-lg hover:bg-neutral-100"
                            >
                              <Camera className="h-3.5 w-3.5" />
                              Change Photo
                            </button>
                            <button
                              onClick={() => handleRemovePhoto(section.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600/90 px-3.5 py-2 text-xs font-semibold text-white shadow-lg hover:bg-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* Caption Bar */}
                        <div className="flex items-center justify-between border-t border-black/10 bg-white/90 px-4 py-2.5 text-xs text-neutral-600 backdrop-blur-md dark:border-white/10 dark:bg-[#121612]/90 dark:text-neutral-400">
                          <span className="italic truncate pr-2">
                            {currentPhoto.caption || section.photoPromptLabel}
                          </span>
                          <button
                            onClick={() => openPhotoModal(section)}
                            className="shrink-0 font-medium text-[#287A06] hover:underline dark:text-[#70CB42]"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Empty Interactive Photo Frame Placeholder */
                      <div
                        onClick={() => openPhotoModal(section)}
                        className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-black/15 bg-gradient-to-b from-black/[0.02] to-black/[0.05] p-6 text-center transition-all duration-300 hover:border-[#3CA505]/60 hover:bg-[#3CA505]/[0.03] dark:border-white/15 dark:from-white/[0.02] dark:to-white/[0.04] dark:hover:border-[#70CB42]/60 dark:hover:bg-[#3CA505]/[0.05] sm:p-8"
                      >
                        {/* Blueprint grid subtle pattern */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                          style={{
                            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
                            backgroundSize: "20px 20px",
                          }}
                        />

                        <div className="relative mx-auto flex max-w-md flex-col items-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-white text-[#3CA505] shadow-sm transition-transform group-hover:scale-110 dark:border-white/10 dark:bg-[#151915]">
                            <Camera className="h-6 w-6" />
                          </div>

                          <h3 className="mt-3 text-sm font-bold text-neutral-800 dark:text-neutral-200">
                            {section.photoPromptLabel}
                          </h3>

                          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                            {section.suggestedPhoto}
                          </p>

                          <div className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#3CA505]/10 px-4 py-2 text-xs font-bold text-[#287A06] transition group-hover:bg-[#3CA505] group-hover:text-white dark:bg-[#3CA505]/20 dark:text-[#70CB42] dark:group-hover:bg-[#3CA505] dark:group-hover:text-white">
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add Photo to Chapter {section.number}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

            {/* Author Byline & Contact Card */}
            <div className="mt-16 rounded-3xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#111611]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E31837] to-[#8A0C1E] text-white font-bold text-lg shadow-md ring-4 ring-black/5 dark:ring-white/5">
                    DS
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                      Dexter Sargent
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Head Coach, York University Women&apos;s Flag Football &bull; Software Engineer
                    </p>
                    <p className="mt-1 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                      Dexter Sargent •{" "}
                      <a
                        href="mailto:dextersargent@gmail.com"
                        className="text-[#287A06] hover:underline dark:text-[#70CB42]"
                      >
                        dextersargent@gmail.com
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <Link
                    href="/teams/york_lions/schedule"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-black/[0.03] px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-black/[0.08] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300 dark:hover:bg-white/[0.08]"
                  >
                    <span>York Schedule</span>
                  </Link>
                  <Link
                    href="/teams/york_lions/playbook"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-black/[0.03] px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-black/[0.08] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300 dark:hover:bg-white/[0.08]"
                  >
                    <span>Playbook Builder</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Editorial Footer */}
            <footer className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-black/10 pt-8 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-400 sm:flex-row">
              <div className="flex items-center gap-2">
                <FlagOSLogo size="xs" />
                <span>FlagOS · Built by Coaches for Community Athletics</span>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 font-semibold text-[#287A06] hover:underline dark:text-[#70CB42]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to FlagOS
              </Link>
            </footer>
          </div>
        </div>
      </div>

      {/* Interactive Photo Upload / URL Modal */}
      {activeModalSection && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="photo-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-lg rounded-3xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#141814] sm:p-7">
            {/* Close Button */}
            <button
              onClick={closePhotoModal}
              className="absolute right-5 top-5 rounded-full p-1.5 text-neutral-400 hover:bg-black/5 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3CA505]/15 text-[#3CA505]">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <h3 id="photo-modal-title" className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Add Photo to Chapter {activeModalSection.number}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {activeModalSection.title}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {/* Option 1: File Upload */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Upload Image from Device
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isReadingFile}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/20 bg-black/[0.02] p-4 text-xs font-medium text-neutral-700 transition hover:border-[#3CA505] hover:bg-[#3CA505]/5 dark:border-white/20 dark:bg-white/[0.02] dark:text-neutral-300 dark:hover:border-[#70CB42]"
                >
                  <Upload className="h-4 w-4 text-[#3CA505]" />
                  <span>
                    {isReadingFile ? "Processing image…" : "Choose image file (PNG, JPG, WebP)"}
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
                <span className="text-[11px] uppercase tracking-wider text-neutral-400">or</span>
                <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
              </div>

              {/* Option 2: Image URL */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Paste Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={modalImageUrl}
                  onChange={(e) => setModalImageUrl(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-black/[0.02] px-3.5 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#3CA505] focus:outline-hidden dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-100"
                />
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Caption / Credit (Optional)
                </label>
                <input
                  type="text"
                  placeholder={`e.g. ${activeModalSection.photoPromptLabel}, 2022`}
                  value={modalCaption}
                  onChange={(e) => setModalCaption(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-black/[0.02] px-3.5 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#3CA505] focus:outline-hidden dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-100"
                />
              </div>

              {/* Image Preview Box */}
              {modalImageUrl && (
                <div className="mt-3">
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                    Preview
                  </label>
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-black/10 bg-neutral-900 dark:border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={modalImageUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {modalCaption && (
                    <p className="mt-1 text-[11px] italic text-neutral-500 text-center">
                      {modalCaption}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-black/10 pt-4 dark:border-white/10">
              {photos[activeModalSection.id] ? (
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(activeModalSection.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove Photo
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closePhotoModal}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModalPhoto}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#3CA505] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#3CA505]/20 transition hover:bg-[#328b04]"
                >
                  <Check className="h-3.5 w-3.5" />
                  Save Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
