"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Heart,
  Users,
  Trophy,
  Shield,
  Sparkles,
  Lock,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { FlagOSText } from "@/components/FlagOSText";
import { FlagOSLogo } from "@/components/FlagOSLogo";
import ThemeToggle from "@/components/ThemeToggle";

export default function MyStoryPage() {
  const router = useRouter();
  const { user, isPlatformAdmin, loading } = useAuth();

  const isMe =
    user?.email?.trim().toLowerCase() === "dextersargent@gmail.com" ||
    Boolean(isPlatformAdmin);

  // If someone who is not Dexter navigates directly to this route, redirect them to the home page
  useEffect(() => {
    if (!loading && !isMe) {
      router.replace("/");
    }
  }, [isMe, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-black text-slate-500 dark:text-neutral-400">
        <div className="flex items-center gap-2 text-sm font-mono">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Loading story...</span>
        </div>
      </div>
    );
  }

  if (!isMe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-black px-4 text-center">
        <div className="max-w-md space-y-4 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 shadow-xl">
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
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white transition-colors duration-200 selection:bg-emerald-500/20">
      {/* Top Editorial Navigation */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-black/80 border-b border-slate-200/80 dark:border-white/10 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
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

      {/* Main Narrative Article */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-12 sm:space-y-16">
        {/* Article Header */}
        <section className="space-y-6 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 shadow-sm">
            <Heart className="w-3.5 h-3.5 text-emerald-500 fill-current" />
            <span>Why I Built FlagOS</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight leading-[1.05] text-slate-900 dark:text-white">
            Built by a coach, <br />
            <span className="text-emerald-600 dark:text-emerald-400">not a company.</span>
          </h1>

          <p className="text-base sm:text-xl text-slate-600 dark:text-neutral-400 leading-relaxed font-medium">
            I’m not a software company or a startup pitching a product. I’m just a guy who coaches flag football and built a system to solve a real problem I lived through on our own sidelines.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2 text-xs font-mono text-slate-500 dark:text-neutral-500">
            <span>By Dexter Sargent</span>
            <span>•</span>
            <span>Coach &amp; Creator</span>
          </div>
        </section>

        {/* Featured Picture Slot 1 (Full Width Banner Frame) */}
        <div className="rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-slate-100/70 dark:bg-neutral-900/40 p-8 sm:p-14 text-center flex flex-col items-center justify-center gap-3 transition-colors hover:border-emerald-500/40 group">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-neutral-400 flex items-center justify-center shadow-sm group-hover:text-emerald-500 group-hover:scale-105 transition-all">
            <Camera className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800 dark:text-neutral-200">
              Featured Photo Slot
            </p>
            <p className="text-xs text-slate-500 dark:text-neutral-500 max-w-sm">
              Add a gameday photo, team huddle, or tryout picture here.
            </p>
          </div>
        </div>

        {/* Story Section 1: The Tryout */}
        <article className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-base sm:text-lg leading-relaxed text-slate-700 dark:text-neutral-300 font-normal">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white pt-4">
            How It All Started: The 90-Player Tryout
          </h2>

          <p>
            A while back, our coaching staff held open tryouts for our competitive 5v5 flag football team. We expected a solid group, but nothing prepared us for the turnout: <strong className="font-bold text-slate-900 dark:text-white">90 people came out to compete</strong>.
          </p>

          <p>
            The energy was electric. We had athletes of all backgrounds running routes with laser focus, diving for flag pulls, and bringing pure passion to every single snap. It was the kind of evening that reminds you why you coach.
          </p>

          <p>
            For a competitive 5v5 squad, your active roster only holds so many spots. But seeing ninety players leave everything on the turf got me thinking about what came next. Our 11v11 semi-contact flag league was scheduled right after the 5v5 circuit. I didn’t want those ninety athletes to disperse into thin air or lose that spark. I wanted to keep every single one of them engaged, competing, and proud to play.
          </p>
        </article>

        {/* Side-by-Side Photo Grid (Picture Slots 2 & 3) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-slate-100/70 dark:bg-neutral-900/40 p-8 text-center flex flex-col items-center justify-center gap-3 transition-colors hover:border-emerald-500/40 group min-h-[220px]">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-neutral-400 flex items-center justify-center shadow-sm group-hover:text-emerald-500 group-hover:scale-105 transition-all">
              <Camera className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                Photo Slot: 5v5 Tryout Day
              </p>
              <p className="text-[11px] text-slate-500 dark:text-neutral-500">
                The players, the speed, and the first day out.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-slate-100/70 dark:bg-neutral-900/40 p-8 text-center flex flex-col items-center justify-center gap-3 transition-colors hover:border-emerald-500/40 group min-h-[220px]">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-neutral-400 flex items-center justify-center shadow-sm group-hover:text-emerald-500 group-hover:scale-105 transition-all">
              <Camera className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                Photo Slot: 11v11 Semi-Contact Gameday
              </p>
              <p className="text-[11px] text-slate-500 dark:text-neutral-500">
                Under the lights, full squads, and game night.
              </p>
            </div>
          </div>
        </div>

        {/* Story Section 2: Building What Was Missing */}
        <article className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-base sm:text-lg leading-relaxed text-slate-700 dark:text-neutral-300 font-normal">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white pt-4">
            A Coach’s Problem Needs a Coach’s Solution
          </h2>

          <p>
            Flag football is one of the fastest-growing sports in the world, but the tools we had to organize leagues felt twenty years behind. We were juggling messy spreadsheets, copy-pasting schedules into group chats, and losing track of player accomplishments.
          </p>

          <p>
            Players care about their progress. When someone makes a diving grab on 4th down or pulls off a game-saving sack, that shouldn’t vanish into memory when the final whistle blows. They want to check the box score, see where their team sits in the standings, and talk about the plays on the ride home.
          </p>

          <p>
            I didn’t set out to build a commercial software product. I sat down at my laptop late after practices because I wanted our league to feel legitimate, organized, and exciting for everyone who committed their weekends to it.
          </p>

          {/* Quote Block */}
          <div className="p-6 sm:p-8 rounded-3xl bg-emerald-500/5 dark:bg-emerald-500/10 border-l-4 border-emerald-500 my-8 space-y-2">
            <p className="text-lg sm:text-xl font-bold italic text-slate-800 dark:text-neutral-100 leading-snug">
              &ldquo;I wanted our players to feel like they were part of something real—where their stats followed them, games started on time, and every drive mattered.&rdquo;
            </p>
            <p className="text-xs font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">
              — Dexter Sargent
            </p>
          </div>

          <p>
            Slowly, piece by piece, that project became FlagOS. What started as an internal tool to manage our 11v11 semi-contact transition turned into an entire system: instant schedule generation, clock-aware play-by-play logging, and true player stat continuity across seasons.
          </p>
        </article>

        {/* Personal Sign-off & Note */}
        <section className="pt-8 border-t border-slate-200 dark:border-white/10 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Just Honest Football Infrastructure
            </h3>
            <p className="text-sm text-slate-600 dark:text-neutral-400 leading-relaxed">
              If you’re a coach, player, or commissioner running your own league, I hope FlagOS gives you back your time and gives your players the experience they deserve. If you ever have feedback, ideas, or just want to talk flag football, feel free to reach out anytime.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 dark:border-white/5">
              <div className="space-y-0.5">
                <span className="text-base font-black text-slate-900 dark:text-white">
                  Dexter Sargent
                </span>
                <p className="text-xs text-slate-500 dark:text-neutral-500 font-mono">
                  dextersargent@gmail.com
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-bold transition-all"
                >
                  Return to Home
                </Link>
                <a
                  href="mailto:dextersargent@gmail.com"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20"
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
      <footer className="border-t border-slate-200/80 dark:border-white/10 py-8 text-center text-xs text-slate-500 dark:text-neutral-500">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <p>© {new Date().getFullYear()} FlagOS • Built with pride for the flag football community.</p>
        </div>
      </footer>
    </div>
  );
}
