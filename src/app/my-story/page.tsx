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
    title: "Childhood Roots in Dartmouth",
    lead: "In the third grade, I played football for the first time with some older kids at my school and immediately fell in love with the game. Soon after, I asked both of my parents to buy me a football without telling the other, and they both came home with one for me.",
    paragraphs: [
      "From then on, I was always the kid who brought a football to school. When the older kids went to junior high, I would beg my friends to spend their recesses and lunches playing football with me on the field.",
      "The next year, in a grade 4/5 split classroom, during our persuasive writing unit, I wrote a letter to convince my mom to let me join the Dartmouth Destroyers, laying out my case line by line: why it was safe, how I would keep my grades up, and how I would care for my gear. My mom agreed, setting off my lifelong involvement with the sport.",
    ],
    momentLabel: "The first big ask",
    moment: "A Grade 4 persuasive letter convinced my mom to let me join the Dartmouth Destroyers.",
  },
  {
    id: "leaving-home",
    number: "02",
    period: "High School → York University",
    title: "High School & The Recruiting Grind",
    lead: "Growing up, opportunities for tackle football were limited; I always played both flag and tackle football to get my fill, lining up at safety, linebacker, cornerback, quarterback, tight end, and just about any other position they would let me play throughout high school.",
    paragraphs: [
      "Coming out of Nova Scotia, Canada, getting recruited didn’t mean NIL and ten-million-dollar locker rooms, it meant putting in hours of cold-emailing, clipping game film, and sending highlight tapes directly to every university head coach and defensive coordinator in the country.",
      "That effort paid off when I earned a full OUA athletic scholarship to York University alongside academic scholarships for software engineering. I packed my bags for Toronto, ready to balance competitive athletics with an engineering degree.",
    ],
    momentLabel: "The recruiting grind",
    moment: "Cold emails and self-cut film earned a full OUA athletic scholarship to York.",
  },
  {
    id: "york",
    number: "03",
    period: "York Lions · 2021–2024",
    title: "York University Varsity Career",
    lead: "I spent four seasons as a varsity athlete with the York Lions, playing linebacker and key special teams units. One of the highlights of my playing career came right before Thanksgiving in 2022 against Windsor, when I scooped up a blocked kick and returned it for a touchdown right before halftime with my family in the stands.",
    paragraphs: [
      "Balancing engineering coursework with varsity football was exhausting, and despite moments like that, overwhelmed by team struggle and a lack of clear opportunity after the 2022 season, I stepped away from the program. But before the 2023 training camp, I felt pulled back to finish what I started.",
      "I returned on a whim, academically ineligible and with nowhere to live. My teammate Theo, having lived with me the year before, took me in alongside his roommates. They opened their door and let me sleep on a couch in their living room for weeks while we went through training camp and began our season. Staying there and having nowhere to go except the main gathering space forged a bond between us.",
      "In Week 3 of that season, I was named a team captain after we lost one of our top players and captains for the season, reflecting the leadership and resilience Theo and I pushed each other to bring every day. After a few weeks on the couch, I moved into a dingy, overpriced apartment to finish out the year before eventually moving in with other teammates at season's end.",
    ],
    momentLabel: "Resilience & brotherhood",
    moment: "From sleeping on Theo's living room couch to being named team captain in Week 3.",
  },
  {
    id: "coaching",
    number: "04",
    period: "Winter 2024",
    title: "Coaching York Women's Flag Football",
    lead: "During Reading Week in 2024, when the new head coach of the men's team asked people to come out and help the women’s flag team, everybody jumped at the opportunity so we could make a good impression on our new coach. Theo and I volunteered.",
    paragraphs: [
      "We quickly realized how much potential the women's flag team had, fell in love with it, and kept coming back to share our knowledge. After a few weeks, the program parted ways with their previous coaches and asked us to take over. We found a group of dedicated athletes who loved the game and wanted to learn, establishing a balanced coaching standard: combining my engineering mindset for structured tactical schemes with Theo's relentless effort and determination.",
      "Sitting at 0-7, our coaching staff took over full leadership just one week before the OWIFA play-in tournament. Many people in this situation would look to simplify, go with what works, but we knew our athletes had far more capacity if they were treated like the intelligent football players they are. We overhauled everything, installing an entirely new, more complex defensive playbook in a single week.",
      "After losing our first two in close games, we headed into the play-in game against Waterloo 0-9. We executed smoothly and won 17-8 to qualify for the playoffs, proving what we could accomplish when we provided clear structure.",
    ],
    momentLabel: "The 17–8 breakthrough",
    moment: "Installing a complex defensive playbook in one week and winning 17–8 to qualify for the playoffs.",
  },
  {
    id: "turnaround",
    number: "05",
    period: "Spring 2024 → 2027",
    title: "Rebuilding & Varsity Status",
    lead: "After the playoff run, we turned our focus toward building the long-term foundation of the program. We handed out flyers across campus and organized recruitment events.",
    paragraphs: [
      "Theo worked countless hours as a graduate assistant, which directly led to his hiring as a full-time university coach and recruiting coordinator for the men's team at age 25, one of the youngest full-time university football coaches in the nation.",
      "Together, we continued pushing for women's flag football to achieve official varsity recognition across Canadian universities, and in 2026, it was announced that USports would pilot a varsity flag football program beginning in 2027. It is now up to us to convince the school that our athletes deserve varsity recognition.",
    ],
    momentLabel: "The road to varsity",
    moment: "USports announced a varsity pilot for 2027—now we fight for our athletes' varsity recognition.",
  },
  {
    id: "flagos",
    number: "06",
    period: "From the sideline to FlagOS",
    title: "Building FlagOS",
    lead: "When 90 students showed up for tryouts the following season, we knew we needed to maintain numbers for our 11v11 season that comes after our 5v5 season. I created the York University Women's Flag Football League (YUWFFL) so everyone had a place to play and to help maintain our participation numbers outside of our competitive travel team.",
    paragraphs: [
      "Since my primary focus had to remain on managing the competitive team, I built FlagOS out of necessity to reduce the administrative load on my volunteer assistant coaches. The team acted as a product tester and focus group as we used the early versions of the app; I would go home after practices, tweak it, add features, and stay up until 4am night after night building it, because I knew firsthand that I had built something that works.",
      "Although we didn't maintain all 90 athletes as classes, jobs, and a disinterest in less competitive football pulled people away, we successfully used the system to run the entire league. I tried to keep pricing fair and accessible ($30/month for team playbooks and custom wristband generation, or $40/month + $15 per team for full league management) to give community programs practical tools built by coaches who lived through the grind.",
    ],
    momentLabel: "Software born out of necessity",
    moment: "Built late at night for our team, tested on our sideline, and priced fairly for community programs.",
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
              Dexter Sargent <span className="px-2 text-neutral-400">/</span> Head Coach, York University Women&apos;s Flag Football
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl md:text-7xl">
              Building FlagOS: Software Born Out of Necessity
              <span className="mt-4 block text-xl font-normal leading-relaxed tracking-normal text-neutral-600 dark:text-neutral-400 sm:text-2xl sm:leading-snug md:text-3xl">
                Reflections on varsity football, coaching York University, and building accessible tools for community athletics
              </span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-300 sm:text-lg sm:leading-8">
              I spent four years as a varsity football player and team captain at York University while studying software engineering. When I took over coaching the York women&apos;s flag football team, I inherited a program with incredible athletes but zero structural support. Watching our team struggle with fragmented schedules, unorganized playbooks, and overpriced software made it clear how broken amateur sports administration really is. I built FlagOS late at night to give our team practical tools to operate without dealing with excessive software costs or corporate hassle.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.03] px-3.5 py-1.5 text-xs font-medium text-neutral-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3CA505]" />
              Dexter Sargent • Head Coach, York University Women&apos;s Flag Football
            </div>
          </div>

          <aside className="border-l-2 border-[#3CA505] pl-5 md:col-span-4 md:ml-auto md:max-w-xs">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
              The through line
            </p>
            <p className="mt-3 text-lg font-medium leading-7">
              Built late at night to give community programs practical tools without corporate hassle.
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
            <p className="text-2xl font-semibold tracking-tight sm:text-3xl">4 seasons</p>
            <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">varsity player & captain at York</p>
          </div>
          <div className="border-l border-black/10 px-4 dark:border-white/10 sm:px-6">
            <p className="text-2xl font-semibold tracking-tight sm:text-3xl">17–8</p>
            <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">play-in win over Waterloo</p>
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
              Practical tools built by coaches who lived through the grind.
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
            Fair and accessible tools ($30/month for team playbooks and custom wristband generation, or $40/month + $15 per team for full league management) to give community athletics the operational foundation they deserve.
          </p>
        </section>

        <footer className="flex flex-col gap-3 border-t border-black/10 py-6 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <span>Dexter Sargent · Head Coach, York University Women&apos;s Flag Football & Founder, FlagOS</span>
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
