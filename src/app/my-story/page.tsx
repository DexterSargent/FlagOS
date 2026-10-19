"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { FlagOSText } from "@/components/FlagOSText";
import { FlagOSLogo } from "@/components/FlagOSLogo";
import ThemeToggle from "@/components/ThemeToggle";

interface StorySection {
  id: string;
  number: string;
  title: string;
  paragraphs: string[];
}

const STORY_SECTIONS: StorySection[] = [
  {
    id: "first-football",
    number: "01",
    title: "Childhood Roots in Dartmouth",
    paragraphs: [
      "In the third grade, I played football for the first time with some older kids at my school and immediately fell in love with the game. Soon after, I asked both of my parents to buy me a football without telling the other, and they both came home with one for me. From then on, I was always the kid who brought a football to school. When the older kids went to junior high, I would beg my friends to spend their recesses and lunches playing football with me on the field. The next year, in a grade 4/5 split classroom, during our persuasive writing unit, I wrote a letter to convince my mom to let me join the Dartmouth Destroyers, laying out my case line by line: why it was safe, how I would keep my grades up, and how I would care for my gear. My mom agreed, setting off my lifelong involvement with the sport.",
    ],
  },
  {
    id: "leaving-home",
    number: "02",
    title: "High School & The Recruiting Grind",
    paragraphs: [
      "Growing up, opportunities for tackle football were limited; I always played both flag and tackle football to get my fill, lining up at safety, linebacker, cornerback, quarterback, tight end, and just about any other position they would let me play throughout high school. Coming out of Nova Scotia, Canada, getting recruited didn’t mean NIL and ten-million-dollar locker rooms, it meant putting in hours of cold-emailing, clipping game film, and sending highlight tapes directly to every university head coach and defensive coordinator in the country. That effort paid off when I earned a full OUA athletic scholarship to York University alongside academic scholarships for software engineering. I packed my bags for Toronto, ready to balance competitive athletics with an engineering degree.",
    ],
  },
  {
    id: "york",
    number: "03",
    title: "York University Varsity Career",
    paragraphs: [
      "I spent four seasons as a varsity athlete with the York Lions, playing linebacker and key special teams units. One of the highlights of my playing career came right before Thanksgiving in 2022 against Windsor, when I scooped up a blocked kick and returned it for a touchdown right before halftime with my family in the stands. Balancing engineering coursework with varsity football was exhausting, and despite moments like that, overwhelmed by team struggle and a lack of clear opportunity after the 2022 season, I stepped away from the program. But before the 2023 training camp, I felt pulled back to finish what I started. I returned on a whim, academically ineligible and with nowhere to live. My teammate Theo, having lived with me the year before, took me in alongside his roommates. They opened their door and let me sleep on a couch in their living room for weeks while we went through training camp and began our season. Staying there and having nowhere to go except the main gathering space forged a bond between us. In Week 3 of that season, I was named a team captain after we lost one of our top players and captains for the season, reflecting the leadership and resilience Theo and I pushed each other to bring every day. After a few weeks on the couch, I moved into a dingy, overpriced apartment to finish out the year before eventually moving in with other teammates at season's end.",
    ],
  },
  {
    id: "coaching",
    number: "04",
    title: "Coaching York Women's Flag Football",
    paragraphs: [
      "During Reading Week in 2024, when the new head coach of the men's team asked people to come out and help the women’s flag team, everybody jumped at the opportunity so we could make a good impression on our new coach. Theo and I volunteered. We quickly realized how much potential the women's flag team had, fell in love with it, and kept coming back to share our knowledge. After a few weeks, the program parted ways with their previous coaches and asked us to take over. We found a group of dedicated athletes who loved the game and wanted to learn, establishing a balanced coaching standard: combining my engineering mindset for structured tactical schemes with Theo's relentless effort and determination. Sitting at 0-7, our coaching staff took over full leadership just one week before the OWIFA play-in tournament. Many people in this situation would look to simplify, go with what works, but we knew our athletes had far more capacity if they were treated like the intelligent football players they are. We overhauled everything, installing an entirely new, more complex defensive playbook in a single week. After losing our first two in close games, we headed into the play-in game against Waterloo 0-9. We executed smoothly and won 17-8 to qualify for the playoffs, proving what we could accomplish when we provided clear structure.",
    ],
  },
  {
    id: "turnaround",
    number: "05",
    title: "Rebuilding & Varsity Status",
    paragraphs: [
      "After the playoff run, we turned our focus toward building the long-term foundation of the program. We handed out flyers across campus and organized recruitment events. Theo worked countless hours as a graduate assistant, which directly led to his hiring as a full-time university coach and recruiting coordinator for the men's team at age 25, one of the youngest full-time university football coaches in the nation. Together, we continued pushing for women's flag football to achieve official varsity recognition across Canadian universities, and in 2026, it was announced that USports would pilot a varsity flag football program beginning in 2027. It is now up to us to convince the school that our athletes deserve varsity recognition.",
    ],
  },
  {
    id: "flagos",
    number: "06",
    title: "Building FlagOS",
    paragraphs: [
      "When 90 students showed up for tryouts the following season, we knew we needed to maintain numbers for our 11v11 season that comes after our 5v5 season. I created the York University Women's Flag Football League (YUWFFL) so everyone had a place to play and to help maintain our participation numbers outside of our competitive travel team. Since my primary focus had to remain on managing the competitive team, I built FlagOS out of necessity to reduce the administrative load on my volunteer assistant coaches. The team acted as a product tester and focus group as we used the early versions of the app; I would go home after practices, tweak it, add features, and stay up until 4am night after night building it, because I knew firsthand, that I had built something that works. Although we didn't maintain all 90 athletes as classes, jobs, and a disinterest in less competitive football pulled people away, we successfully used the system to run the entire league. I tried to keep pricing fair and accessible ($30/month for team playbooks and custom wristband generation, or $40/month + $15 per team for full league management) to give community programs practical tools built by coaches who lived through the grind.",
    ],
  },
];

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
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
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

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16 md:py-20">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-[#20241F] dark:text-[#F2F3EE] sm:text-5xl sm:leading-[1.15]">
            Building FlagOS: Software Born Out of Necessity
          </h1>
          <p className="mt-4 text-lg font-normal leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-xl">
            Reflections on varsity football, coaching York University, and building accessible tools for community athletics
          </p>

          <p className="mt-8 text-base leading-relaxed text-neutral-800 dark:text-neutral-200 sm:text-lg">
            I spent four years as a varsity football player and team captain at York University while studying software engineering. When I took over coaching the York women&apos;s flag football team, I inherited a program with incredible athletes but zero structural support. Watching our team struggle with fragmented schedules, unorganized playbooks, and overpriced software made it clear how broken amateur sports administration really is. I built FlagOS late at night to give our team practical tools to operate without dealing with excessive software costs or corporate hassle.
          </p>

          <p className="mt-5 text-sm font-semibold tracking-wide text-[#287A06] dark:text-[#70CB42]">
            Dexter Sargent • Head Coach, York University Women&apos;s Flag Football
          </p>
        </header>

        <nav aria-label="Story contents" className="my-8 flex flex-wrap gap-2 border-y border-black/10 py-4 dark:border-white/10">
          {STORY_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-black/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-[#3CA505]/10 hover:text-[#287A06] dark:bg-white/[0.05] dark:text-neutral-300 dark:hover:bg-[#3CA505]/20 dark:hover:text-[#70CB42]"
            >
              <span className="font-mono text-[11px] text-[#3CA505]">{section.number}</span>
              <span>{section.title}</span>
            </a>
          ))}
        </nav>

        <div className="space-y-12 sm:space-y-14">
          {STORY_SECTIONS.map((section) => (
            <article
              key={section.id}
              id={section.id}
              className="scroll-mt-20 border-t border-black/10 pt-8 dark:border-white/10 sm:pt-10"
            >
              <div className="mb-4 flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#3CA505]">
                  {section.number}
                </span>
                <span className="h-1 w-1 rounded-full bg-neutral-400 dark:bg-neutral-600" />
                <span className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Chapter
                </span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-[#20241F] dark:text-[#F2F3EE] sm:text-3xl">
                {section.title}
              </h2>

              <div className="mt-5 space-y-4 text-base leading-relaxed text-neutral-700 dark:text-neutral-300 sm:text-lg sm:leading-8">
                {section.paragraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-14 border-t border-black/10 pt-8 dark:border-white/10">
          <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200 sm:text-lg">
            Dexter Sargent •{" "}
            <a
              href="mailto:dextersargent@gmail.com"
              className="text-[#287A06] hover:underline dark:text-[#70CB42]"
            >
              dextersargent@gmail.com
            </a>
          </p>
        </div>

        <footer className="mt-10 flex items-center justify-between border-t border-black/10 pt-6 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-400">
          <span>FlagOS · Built by Coaches for Community Athletics</span>
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-medium text-[#287A06] hover:underline dark:text-[#70CB42]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to FlagOS
          </Link>
        </footer>
      </main>
    </div>
  );
}
