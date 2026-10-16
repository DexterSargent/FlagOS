"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUpRight, Lock } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { FlagOSText } from "@/components/FlagOSText";
import { FlagOSLogo } from "@/components/FlagOSLogo";
import ThemeToggle from "@/components/ThemeToggle";

const STORY = [
  {
    id: "first-football",
    number: "01",
    period: "Dartmouth, Nova Scotia",
    title: "It started with two footballs.",
    lead: "In Grade 3, I played football at recess and was hooked. I asked both my parents for a football, separately. The next day, they each came home with one.",
    paragraphs: [
      "I brought a ball to school every day after that. In Grade 4, a friend and I wrote a persuasive letter asking our parents to let us play for the Dartmouth Destroyers. It worked. My friend stayed for one season; I kept going.",
      "Growing up in Nova Scotia, I played both tackle and flag football. There were fewer opportunities to play tackle, so flag was part of how I learned the game—not a break from it.",
    ],
    momentLabel: "The first big ask",
    moment: "A Grade 4 letter got me onto the Dartmouth Destroyers.",
  },
  {
    id: "leaving-home",
    number: "02",
    period: "High school → York University",
    title: "I made my own way to Toronto.",
    lead: "In Grade 11, I made an all-star team, cut my own game film, and emailed it to university coaches across the country.",
    paragraphs: [
      "I played for Team Nova Scotia Flag Football and received its Sportsmanship Award. At that banquet, I met Brian Jones, fresh off a Grey Cup win with the Toronto Argonauts. Years later, he would coach me at York.",
      "The next year, I was named an all-star again. I had grown into a 6'3\", 205-pound middle linebacker and received offers from several schools, including a $4,500 athletic scholarship from York. I chose Toronto with two goals: play university football and study software engineering.",
    ],
    momentLabel: "The leap",
    moment: "A self-made highlight reel helped turn a cold email into a place at York.",
  },
  {
    id: "york",
    number: "03",
    period: "York Lions · 2021–2024",
    title: "I learned how much the team matters.",
    lead: "I started on special teams. In 2022, against Windsor, I recovered a blocked kick and ran it in for a touchdown with my family watching.",
    paragraphs: [
      "I also blocked for my roommate, Alfred Olay, on the way to becoming York's first U SPORTS first-team All-Canadian returner in nearly 20 years.",
      "After the 2022 season, worn down by losing and unsure of my place on defense, I quit. Three weeks before camp the next year, Brian Jones called to ask if I was really done. I wasn't. I came back with nowhere to stay and slept on Theo's pull-out couch. By Week 2, I was a captain. I played linebacker, tight end, and defensive end while finishing my software engineering degree and working.",
    ],
    momentLabel: "A turning point",
    moment: "I left the team, got a call, and came back. The next season, I was named captain.",
  },
  {
    id: "coaching",
    number: "04",
    period: "Winter 2024",
    title: "A week helping out became something bigger.",
    lead: "Over reading week, Theo and I volunteered to help York's women's flag team prepare for its OWIFA season.",
    paragraphs: [
      "The players were serious about learning. They wanted to understand coverages, matchups, and why a play worked—not just memorize where to line up. But the program wasn't getting the structure or level of coaching those athletes were ready for.",
      "We started teaching the game the way we had learned it: with real schemes, clear explanations, and respect for the players' ability to execute. It changed what I thought coaching could look like.",
    ],
    momentLabel: "What I saw",
    moment: "The players didn't need football simplified. They needed the chance to learn it.",
  },
  {
    id: "turnaround",
    number: "05",
    period: "The OWIFA play-in",
    title: "At 0–7, we had one week to prepare.",
    lead: "The student executive brought our coaching group in a week before the final tournament. Braden became head coach; Theo and I took on defense.",
    paragraphs: [
      "We installed a new defensive system and reworked the offense. On tournament day, we lost close games to Guelph and Waterloo. Before the 8th-versus-9th play-in rematch with Waterloo, Theo and I noticed a tendency in their offense and prepared the team for it.",
      "The players made the adjustment on the field and won 17–8 to reach the playoffs. We later lost to eventual champion Western, but the win against Waterloo stayed with me. A team that had started 0–7 had learned a new system, read the game, and executed under pressure.",
      "When Braden later transferred to Windsor, Theo and I took over as head coach and defensive coordinator. We kept building the club, handing out flyers and trying to make it a serious, welcoming place to play. In 2026, women's flag football was approved to move toward varsity status across Ontario universities.",
    ],
    momentLabel: "The result",
    moment: "0–7 to a 17–8 play-in win—and a team that had earned the chance to keep growing.",
  },
  {
    id: "flagos",
    number: "06",
    period: "From the sideline to FlagOS",
    title: "The software came from a problem we had.",
    lead: "Ninety athletes came to 5v5 tryouts. I didn't want the answer to be turning most of them away, so I started the York University Women's Flag Football League.",
    paragraphs: [
      "We couldn't keep every player involved as classes and work took over, but the league gave more athletes a chance to play. At the same time, I was coaching a travel team and trying to handle field operations. Those jobs pulled me in opposite directions.",
      "My volunteer assistants were former varsity teammates. The tools we had for tracking a game were clunky and hard to use. Drawing on my software engineering studies and workflow automation work at Partners for Planning, I built a phone-friendly play-by-play tool to handle the routine details—like downs and yardage—so coaches could focus on the game.",
      "That tool became FlagOS: game-day operations for leagues, alongside playbooks and coaching tools for teams. I want the basics to stay useful and accessible, with pricing that reflects the size of a league rather than putting essential features behind expensive tiers.",
    ],
    momentLabel: "Why FlagOS exists",
    moment: "I built it first for the people beside me on the sideline. The platform grew from there.",
  },
] as const;

export default function MyStoryPage() {
  const router = useRouter();
  const { user, isPlatformAdmin, loading } = useAuth();
  const [scrollProgress, setScrollProgress] = useState(0);

  const isMe =
    user?.email?.trim().toLowerCase() === "dextersargent@gmail.com" ||
    Boolean(isPlatformAdmin);

  useEffect(() => {
    if (!loading && !isMe) router.replace("/");
  }, [isMe, loading, router]);

  useEffect(() => {
    const updateProgress = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0);
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F4EF] text-sm text-neutral-500 dark:bg-[#0D100D] dark:text-neutral-400">
        Loading…
      </div>
    );
  }

  if (!isMe) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F4EF] px-4 text-center dark:bg-[#0D100D]">
        <div className="max-w-sm rounded-2xl border border-black/10 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-[#151915]">
          <Lock className="mx-auto mb-4 h-6 w-6 text-[#3CA505]" />
          <h1 className="text-xl font-semibold">Private page</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            This personal story is only available to its owner.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#287A06] hover:underline dark:text-[#70CB42]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to FlagOS
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[#F5F4EF] font-sans text-[#20241F] selection:bg-[#3CA505]/20 dark:bg-[#0D100D] dark:text-[#F2F3EE]">
      <div
        aria-hidden="true"
        className="fixed left-0 top-0 z-[60] h-0.5 bg-[#3CA505] transition-[width] duration-150"
        style={{ width: `${scrollProgress}%` }}
      />

      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#F5F4EF]/95 backdrop-blur-md dark:border-white/10 dark:bg-[#0D100D]/95">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-[#287A06] dark:text-neutral-300 dark:hover:text-[#70CB42]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">FlagOS</span>
          </Link>
          <Link href="/" aria-label="FlagOS home" className="flex items-center gap-2">
            <FlagOSLogo size="sm" />
            <FlagOSText className="text-base font-bold tracking-tight" />
          </Link>
          <ThemeToggle size="sm" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <section className="grid gap-10 pb-14 pt-14 sm:pb-20 sm:pt-20 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#287A06] dark:text-[#70CB42]">
              Dexter Sargent <span className="px-2 text-neutral-400">/</span> My story
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl md:text-7xl">
              I grew up carrying a football to school.
              <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
                Years later, I built the tools I wished our coaches had.
              </span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-300 sm:text-lg sm:leading-8">
              From Dartmouth to York, football has taken me from player to coach
              to builder. FlagOS began on the sideline, with a practical question:
              how do you make it easier for a small volunteer staff to run a game
              well?
            </p>
          </div>

          <aside className="border-l-2 border-[#3CA505] pl-5 md:col-span-4 md:ml-auto md:max-w-xs">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
              The through line
            </p>
            <p className="mt-3 text-lg font-medium leading-7">
              Give people the room to play. Give coaches the tools to teach.
            </p>
            <a
              href="#first-football"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#287A06] hover:underline dark:text-[#70CB42]"
            >
              Read the story
              <ArrowDown className="h-4 w-4" />
            </a>
          </aside>
        </section>

        <section aria-label="A few milestones" className="grid grid-cols-3 border-y border-black/10 py-5 dark:border-white/10">
          <div className="pr-3">
            <p className="text-2xl font-semibold tracking-tight sm:text-3xl">4 years</p>
            <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">with York Lions football</p>
          </div>
          <div className="border-l border-black/10 px-4 dark:border-white/10 sm:px-6">
            <p className="text-2xl font-semibold tracking-tight sm:text-3xl">17–8</p>
            <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">the Waterloo play-in win</p>
          </div>
          <div className="border-l border-black/10 pl-4 dark:border-white/10 sm:pl-6">
            <p className="text-2xl font-semibold tracking-tight sm:text-3xl">90</p>
            <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">athletes at 5v5 tryouts</p>
          </div>
        </section>

        <nav aria-label="Story contents" className="flex flex-wrap gap-x-5 gap-y-2 py-7">
          {STORY.map((chapter) => (
            <a
              key={chapter.id}
              href={`#${chapter.id}`}
              className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-[#287A06] dark:text-neutral-400 dark:hover:text-[#70CB42]"
            >
              <span className="font-mono text-[11px] text-[#3CA505]">{chapter.number}</span>
              {chapter.period}
            </a>
          ))}
        </nav>

        <div>
          {STORY.map((chapter) => (
            <article
              key={chapter.id}
              id={chapter.id}
              className="scroll-mt-24 grid gap-7 border-t border-black/10 py-10 dark:border-white/10 sm:gap-10 sm:py-14 md:grid-cols-12"
            >
              <div className="md:col-span-2">
                <span className="font-mono text-sm text-[#287A06] dark:text-[#70CB42]">
                  {chapter.number}
                </span>
                <p className="mt-2 max-w-[10rem] text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                  {chapter.period}
                </p>
              </div>

              <div className="md:col-span-7">
                <h2 className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
                  {chapter.title}
                </h2>
                <p className="mt-5 max-w-2xl text-lg font-medium leading-7 text-neutral-700 dark:text-neutral-200 sm:text-xl sm:leading-8">
                  {chapter.lead}
                </p>
                <div className="mt-5 max-w-2xl space-y-4 text-[15px] leading-7 text-neutral-600 dark:text-neutral-300">
                  {chapter.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>

              <aside className="self-start border-l border-[#3CA505]/50 pl-4 md:col-span-3 md:mt-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
                  {chapter.momentLabel}
                </p>
                <p className="mt-2 text-sm font-medium leading-6">{chapter.moment}</p>
              </aside>
            </article>
          ))}
        </div>

        <section className="mt-4 border-t border-black/10 py-10 dark:border-white/10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#287A06] dark:text-[#70CB42]">
            What I’m building now
          </p>
          <div className="mt-4 grid gap-6 md:grid-cols-12 md:items-end">
            <h2 className="text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl md:col-span-8">
              Useful tools for the people who keep a season moving.
            </h2>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#287A06] hover:underline dark:text-[#70CB42] md:col-span-4 md:justify-self-end"
            >
              Explore FlagOS
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-600 dark:text-neutral-300">
            The goal is straightforward: make the work around football easier to
            manage, so coaches and volunteers can spend more attention on the
            people and the game.
          </p>
        </section>

        <footer className="flex flex-col gap-3 border-t border-black/10 py-6 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <span>Dexter Sargent · Founder, FlagOS</span>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 transition hover:text-[#287A06] dark:hover:text-[#70CB42]"
          >
            Back to FlagOS
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </footer>
      </main>
    </div>
  );
}
