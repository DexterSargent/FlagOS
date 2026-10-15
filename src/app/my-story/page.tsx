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
  Flame,
  Award,
  Calendar,
  Compass,
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-14 sm:space-y-20">
        {/* Article Header */}
        <section className="space-y-6 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 shadow-sm">
            <Heart className="w-3.5 h-3.5 text-emerald-500 fill-current" />
            <span>Founder&rsquo;s Story</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight leading-[1.08] text-slate-900 dark:text-white">
            Why I Built FlagOS
          </h1>

          <p className="text-base sm:text-xl text-slate-600 dark:text-neutral-400 leading-relaxed font-normal">
            I’m not a software company or a venture-backed startup. I’m a former varsity football player and software engineering student who stepped in to coach a women’s flag program, saw what our sideline was up against, and decided to build the tools our athletes deserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-2 text-xs font-mono text-slate-500 dark:text-neutral-500">
            <span>By Dexter Sargent</span>
            <span>•</span>
            <span>York Lions #50 (2021-2024)</span>
            <span>•</span>
            <span>Software Engineering Student</span>
            <span>•</span>
            <span>Head Coach, York University Womens Football (2024-present)</span>
          </div>
        </section>

        {/* Picture Slot 1: Childhood / The Two Footballs */}
        <div className="rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-slate-100/70 dark:bg-neutral-900/40 p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3 transition-colors hover:border-emerald-500/40 group">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-neutral-400 flex items-center justify-center shadow-sm group-hover:text-emerald-500 group-hover:scale-105 transition-all">
            <Camera className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md">
            <p className="text-sm font-bold text-slate-800 dark:text-neutral-200">
              Photo Slot: Where It Began
            </p>
            <p className="text-xs text-slate-500 dark:text-neutral-500">
              Backyard footballs, childhood playing days, or early sports memories.
            </p>
          </div>
        </div>

        {/* Chapter 1: The Two Footballs & The Persuasive Letter */}
        <article className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-base sm:text-lg leading-relaxed text-slate-700 dark:text-neutral-300 font-normal">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              01
            </span>
            <span>Love at first catch</span>
          </h2>

          <p>
            When I was in the third grade, I played football for the very first time at recess. It wasn’t organized, and nobody had pads or helmets, but I fell head-over-heels in love with the game instantly. I couldn’t stop thinking about it, I started playing with the older kids every day. One day I went home and asked both of my parents if they could buy me a football, without telling either of them that I had asked the other.
          </p>

          <p>
            The next day, both of them walked through the door a brand-new football for me. Suddenly I had two.
          </p>

          <p>
            From that day on, I was the kid who brought the football to school. I was the kid who was convincing his friends we should play football at recess after the older kids moved on to junior high. I'd ask my dad to come play catch with me every day. I would go out into the yard and spend hours throwing the ball high up into the air, tracking it against the sky, and catching it with one hand. Every now and then, my neighbour would look out their window, see me tossing the ball up to myself alone, and walk over to throw it around with me. I appreciated that neighbour, but the truth was I loved being out there with that football just as much whether I was completely alone or with someone else.
          </p>

          <p>
            A year later in the fourth grade, our grade 4/5 split class did a unit on persuasive writing. The assignment was to write a persuasive letter addressed to someone in your life, about something you really cared about. You didn't have to give it to them, the teacher just wanted us to write passionately. An older kid and I that I would play with at recess decided that we would use assignment to write a persuasive letter to our parents convincing them to let us register for the Dartmouth Destroyers youth tackle football team in the fall. It worked. My friend played for one season and decided it wasn’t for him. I was hooked for life.
          </p>
        </article>

        {/* Picture Slot 2: Nova Scotia High School Football & Tape */}
        <div className="rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-slate-100/70 dark:bg-neutral-900/40 p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3 transition-colors hover:border-emerald-500/40 group">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-neutral-400 flex items-center justify-center shadow-sm group-hover:text-emerald-500 group-hover:scale-105 transition-all">
            <Camera className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md">
            <p className="text-sm font-bold text-slate-800 dark:text-neutral-200">
              Photo Slot: Nova Scotia High School Football &amp; Tape
            </p>
            <p className="text-xs text-slate-500 dark:text-neutral-500">
              High school game action, All-Star banquet, or early recruitment film session.
            </p>
          </div>
        </div>

        {/* Chapter 2: The Cold-Email Grind & Leaving Home */}
        <article className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-base sm:text-lg leading-relaxed text-slate-700 dark:text-neutral-300 font-normal">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              02
            </span>
            <span>Nova Scotia All-Star, The Cold-Email Grind, and Leaving Home</span>
          </h2>

          <p>
            Because opportunities for competitive tackle football were limited in Nova Scotia, I grew up playing flag football alongside tackle. That dual experience shaped my football IQ and route instincts early on. Prior to my 10th and 11th-grade years, I played for <strong className="font-bold text-slate-900 dark:text-white">Team Nova Scotia Flag Football</strong>. Before grade 10, I lined up at defensive back and wide receiver (DB/WR), earning the <strong className="font-bold text-slate-900 dark:text-white">Team Sportsmanship Award</strong> at the Football Nova Scotia awards ceremony. In an unforgettable twist of fate, that banquet was where I first met <strong className="font-bold text-slate-900 dark:text-white">Brian Jones</strong>, who had just won the Grey Cup with the Toronto Argonauts and was bringing the cup back home to Nova Scotia. Years later, Brian would become my special teams coach and head coach at York University.
          </p>

          <p>
            When you play high school football in Nova Scotia, you don&rsquo;t get national television broadcasts or recruiters flying in on private jets. If you want to play at the university level, you have to put yourself on the map with sheer persistence.
          </p>

          <p>
            In my 11th-grade season, I was chosen as a team captain and had a strong season at safety, culminating in being named a <strong className="font-bold text-slate-900 dark:text-white">Nova Scotia High School Football All-Star Safety</strong>. That was the moment that shifted everything in my head. For the first time, I genuinely started to believe I had the skill and instincts to play at the next level. I edited my own game film and emailed my tape to practically every university coach across the country, starting brief introductory conversations with anyone who wrote back.
          </p>

          <p>
            Heading into my senior season, I took my preparation to another gear. I hit the weight room hard, packed on size to reach <strong className="font-bold text-slate-900 dark:text-white">6&rsquo;3&rdquo; and 205 lbs</strong>, and moved down into the box to play Middle Linebacker (MLB). That senior year, I earned All-Star honours for a second time. When I sent that updated tape out across the country, the response changed completely—the interest was real.
          </p>

          <p>
            I received a few local offers from universities on the East Coast, a $1,500 offer from the University of Toronto (U of T), and a full <strong className="font-bold text-slate-900 dark:text-white">$4,500 athletic scholarship from York University</strong>—the absolute maximum athletic financial award permissible under OUA rules.
          </p>

          <p>
            I loved the East Coast and it was hard to leave home, but my future came down to two non-negotiables: <strong className="font-bold text-slate-900 dark:text-white">I wanted to play competitive varsity football, and I wanted to earn an engineering degree</strong>. Because both together were not offered at any university on the East Coast, I packed my bags for Toronto so I wouldn&rsquo;t have to compromise on either ambition.
          </p>
        </article>

        {/* Picture Slot 3: York University Football */}
        <div className="rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-slate-100/70 dark:bg-neutral-900/40 p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3 transition-colors hover:border-emerald-500/40 group">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-neutral-400 flex items-center justify-center shadow-sm group-hover:text-emerald-500 group-hover:scale-105 transition-all">
            <Camera className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md">
            <p className="text-sm font-bold text-slate-800 dark:text-neutral-200">
              Photo Slot: York University Football
            </p>
            <p className="text-xs text-slate-500 dark:text-neutral-500">
              York Lions jersey, game action (Linebacker / DE / Tight End), or 2023 Captain portrait.
            </p>
          </div>
        </div>

        {/* Chapter 3: Four Years at York */}
        <article className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-base sm:text-lg leading-relaxed text-slate-700 dark:text-neutral-300 font-normal">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              03
            </span>
            <span>Four Years with the York Lions (2021–2024)</span>
          </h2>

          <p>
            Like anyone who dedicates a decade to a sport, I had my share of ups and downs with football—injuries, tough losses, early mornings, and the relentless physical toll. But I kept grinding, and from 2021 to 2024, I played university football for York University.
          </p>

          <p>
            Before I got my full shot on defense, I earned every single inch on <strong className="font-bold text-slate-900 dark:text-white">special teams</strong>. In my first year, the coaching staff entrusted me with calling the cadence on the punt team as a true rookie, and by midway through that first season, I was starting across all four special teams units.
          </p>

          <p>
            In my second year (2022), I continued starting on all specials. One moment I will never forget came on a Friday night game right before Thanksgiving against Windsor: I scooped up a blocked kick and took it in for a touchdown right before halftime, putting us ahead 10-9 while my entire family was in the stands watching—the first time our team had led at the half all season (even though we ended up dropping the game). That year, I also threw key lead blocks on return units that helped spring my teammate and roommate, Alfred Olay, to be selected as York&rsquo;s first U SPORTS 1st Team All-Canadian in nearly 20 years as a returner.
          </p>

          <p>
            Despite those milestones on special teams, the conclusion of that 2022 season was one of the most frustrating periods of my career. I felt stuck: I wasn&rsquo;t being given real opportunities to compete on defense, two out of my three roommates were leaving the program, and we were all exhausted from losing. Frustrated with the lack of defensive opportunity and sick of losing, I made the hard decision to <strong className="font-bold text-slate-900 dark:text-white">quit the York team</strong> following the 2022 season.
          </p>

          <p>
            I was completely off the team for months and had mentally closed that chapter. Then, just <strong className="font-bold text-slate-900 dark:text-white">three weeks before 2023 training camp</strong>, my phone rang. It was <strong className="font-bold text-slate-900 dark:text-white">Brian Jones</strong>—the same coach I had met years earlier with the Grey Cup in Nova Scotia, who had coached my special teams in 2022 and was now stepping in as co-head coach for 2023. Brian asked me directly if I was certain I was done with football.
          </p>

          <p>
            I told him I wasn&rsquo;t. I decided to come back—even though I had no plan and nowhere to live in Toronto. For the first week, I stayed at my sister&rsquo;s place while she was away traveling. When she returned, I was essentially homeless. My former roommate Theo took me in without hesitation. I slept on Theo&rsquo;s pull-out couch alongside the rest of his roommates and my teammates, and they treated me like just another roommate for two to three weeks to begin the season. Eventually, I found a temporary, overpriced, rundown room for a single month, sleeping directly on the mattress pulled from Theo&rsquo;s pull-out couch. Once that season ended, I moved in with Braden and Alfred, living together for the remainder of our university careers.
          </p>

          <p>
            That 2023 comeback season became the defining chapter of my playing days. When our best player went down for the year in Week 2, Brian Jones personally chose and named me a <strong className="font-bold text-slate-900 dark:text-white">team captain</strong>—it wasn&rsquo;t a team vote, but a coach&rsquo;s decision trusting me to step up and anchor the locker room through adversity. When major injuries hit our defensive front, I was asked to start across the defense at SAM, WILL, and MIKE linebacker at different points—while continuing to start on all four special teams units. Over four seasons, I lined up wherever York needed me: linebacker, defensive end, and tight end. Playing university ball taught me what real football culture feels like: accountability, preparation, complex schemes, and the deep brotherhood forged through shared struggle.
          </p>

          <p>
            At the exact same time, I was balancing varsity athletics and working at my job with a demanding academic workload: alongside football, I was pursuing a <strong className="font-bold text-slate-900 dark:text-white">Software Engineering degree</strong>, and I am now in my <strong className="font-bold text-slate-900 dark:text-white">final year</strong>. Juggling 6:00 AM film sessions, weight-room blocks, practice schedules, engineering problem sets, and late-night coding projects wasn&rsquo;t easy, but it taught me relentless discipline and focus.
          </p>

          <p>
            Little did I know that my biggest football journey was about to start on a completely different sideline.
          </p>
        </article>

        {/* Chapter 4: Reading Week & The Call to Coach */}
        <article className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-base sm:text-lg leading-relaxed text-slate-700 dark:text-neutral-300 font-normal">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              04
            </span>
            <span>A Reading Week Favor That Changed Everything</span>
          </h2>

          <p>
            Right before my final season of university football, our brand-new head coach came into the locker room with a question: the women’s flag football team had an upcoming 11v11 season with OWIFA (Ontario Women’s Intercollegiate Football Association) over reading week, and they needed extra coaching help. Did anyone want to volunteer?
          </p>

          <p>
            A bunch of guys came out. To be honest, most of us just wanted to make a great first impression on our new head coach. During that first week of practices, there were definitely more coaches on the turf than actual players. But while others moved on after reading week, something clicked for me and some of my teammates. We genuinely loved the game, we saw the potential in these athletes, and we decided to keep showing up.
          </p>

          <p>
            My friend Theo and I noted early on that you could even argue the women loved the game more. They were eager to learn and were truly sponges when we brought all the knowledge we had accrued over years of high-level football. They had all of the care, but largely lacked the ego of the teammates we were used to in tackle locker rooms.
          </p>

          <p>
            It also became clear to us very quickly that the program had serious problems. Numbers were low. Practices were disorganized and lacked direction. The playbooks were stripped down to the bare minimum, and the existing coaching staff treated the athletes as though they weren’t capable of understanding real football concepts. Seeing dedicated female competitors held back and talked down to didn’t sit right with us. These women loved the game as much as we did, and they deserved real coaching, real schemes, and real respect.
          </p>

          <p>
            We kept coming out, determined to help however we could.
          </p>
        </article>

        {/* Picture Slot 4: The 0-7 Turnaround & Playoff Run */}
        <div className="rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-slate-100/70 dark:bg-neutral-900/40 p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3 transition-colors hover:border-emerald-500/40 group">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-neutral-400 flex items-center justify-center shadow-sm group-hover:text-emerald-500 group-hover:scale-105 transition-all">
            <Camera className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md">
            <p className="text-sm font-bold text-slate-800 dark:text-neutral-200">
              Photo Slot: The 0-7 Turnaround &amp; Playoff Game
            </p>
            <p className="text-xs text-slate-500 dark:text-neutral-500">
              The sideline against Waterloo, team huddle, or playoff tournament team shot.
            </p>
          </div>
        </div>

        {/* Chapter 5: The One-Week Turnaround */}
        <article className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-base sm:text-lg leading-relaxed text-slate-700 dark:text-neutral-300 font-normal">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              05
            </span>
            <span>One Week, A New Playbook, and 0-7 to the Playoffs</span>
          </h2>

          <p>
            Because this was a club team, it operated under its own student executive structure rather than university athletics administration. Mid-season, after having us come out and share our football knowledge, the club&rsquo;s executive leadership made a definitive decision: they chose to part ways with their previous coaches and officially hired our group to take over—just <strong className="font-bold text-slate-900 dark:text-white">one week before their final tournament</strong>.
          </p>

          <p>
            At that moment, the team was sitting at <strong className="font-bold text-slate-900 dark:text-white">0-7</strong> on the year.
          </p>

          <p>
            My roommate Braden stepped up as head coach, and Theo and I took on the roles of co-defensive coordinators. We didn’t take the easy route by simplifying things; we did the exact opposite. We trusted the women with a modern, sophisticated scheme. In just seven days, we installed an entirely new defensive system and revamped the offensive progressions.
          </p>

          <p>
            When tournament day arrived, we were tested right out of the gate. In our first game as coaches, we fought through a tough, physical battle against Guelph, narrowly falling <strong className="font-bold text-slate-900 dark:text-white">17-10</strong>. Even in a loss, you could feel the energy shifting—this was a team competing with real confidence and structure. In our second game, we dropped an <strong className="font-bold text-slate-900 dark:text-white">18-3</strong> decision to Waterloo. But standing on the sideline between series, Theo and I noticed a distinct, repeated offensive tendency in Waterloo&rsquo;s playcalling.
          </p>

          <p>
            Because of tournament seeding, our next matchup was an immediate <strong className="font-bold text-slate-900 dark:text-white">8th vs. 9th play-in game—a direct rematch against Waterloo</strong> with an OWIFA playoff berth on the line. Rather than overcomplicating things or panic-switching schemes, we huddled our players, walked them through the specific tendency we had scouted, and trusted them to adjust live on the field.
          </p>

          <p>
            They executed to perfection. They took away Waterloo&rsquo;s primary reads, anticipated their rhythm, and dominated the rematch to take a commanding <strong className="font-bold text-slate-900 dark:text-white">17-8 victory</strong>. In just seven days under a new coaching staff, an 0-7 squad had adjusted on the fly and punched their ticket into the OWIFA playoffs. We advanced into the playoff bracket where we faced the eventual tournament champions in Western, fighting hard before falling 20-0. That run proved everything to us: when female athletes are given real football knowledge, mutual respect, and trust, they will rise to the occasion and execute under pressure.
          </p>
        </article>

        {/* Chapter 6: Building a Safe, High-Performance Culture */}
        <article className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-base sm:text-lg leading-relaxed text-slate-700 dark:text-neutral-300 font-normal">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              06
            </span>
            <span>Handing Out Flyers &amp; Rebuilding from the Ground Up</span>
          </h2>

          <p>
            The way collegiate women’s flag football works in Ontario is split into two halves: competitive 5v5 in the autumn, followed by 11v11 semi-contact in the winter. The following fall, I was playing my final season for the York tackle team, so Braden coached that 5v5 semester before transferring to the University of Windsor.
          </p>

          <p>
            When Braden moved on, Theo and I were the two natural candidates to take over the program. We sat down and agreed that I would step into the Head Coach role, while Theo would serve as Defensive Coordinator. But in reality, Theo has been a true co-head coach with me every step of the way. Theo is one of the most driven football minds I know: he worked his tail off as a Graduate Assistant with the York Lions men&rsquo;s tackle team and was hired as their full-time <strong className="font-bold text-slate-900 dark:text-white">Recruiting Coordinator</strong>—becoming one of the youngest full-time university football coaches in the country at just 25 years old.
          </p>

          <p>
            Having that level of football acumen, energy, and relentless work ethic set the standard for our program. From that moment on, we poured everything we had into transforming the club. We wanted everyone on campus to know that the old environment was gone for good. This was now an empowering, safe, and serious football program where female athletes were coached hard, respected completely, and given every tool to succeed. Theo and I walked across campus handing out flyers by hand, talking to students, holding info sessions, and spreading the word.
          </p>

          <div className="p-6 sm:p-8 rounded-3xl bg-emerald-500/5 dark:bg-emerald-500/10 border-l-4 border-emerald-500 my-8 space-y-2">
            <p className="text-lg sm:text-xl font-bold italic text-slate-800 dark:text-neutral-100 leading-snug">
              &ldquo;We wanted our players to know they were taken seriously as athletes. When you give players high expectations and real tools, they rise to the occasion every single time.&rdquo;
            </p>
            <p className="text-xs font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">
              — Dexter Sargent &amp; Theo
            </p>
          </div>

          <p>
            The momentum kept building year over year. And in 2026, a monumental announcement arrived: <strong className="font-bold text-slate-900 dark:text-white">women’s flag football was officially approved to transition to full varsity status</strong>. We still don’t know if our university will formally include our program in the initial varsity wave—but we are fighting every day to make sure our women get the varsity recognition they have earned.
          </p>
        </article>

        {/* Picture Slot 5: The 90-Player Tryout & Team Photo */}
        <div className="rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-slate-100/70 dark:bg-neutral-900/40 p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3 transition-colors hover:border-emerald-500/40 group">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-neutral-400 flex items-center justify-center shadow-sm group-hover:text-emerald-500 group-hover:scale-105 transition-all">
            <Camera className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md">
            <p className="text-sm font-bold text-slate-800 dark:text-neutral-200">
              Photo Slot: The 90-Player Tryout &amp; Team
            </p>
            <p className="text-xs text-slate-500 dark:text-neutral-500">
              Tryout field packed with players, campus flyers, or full team huddle.
            </p>
          </div>
        </div>

        {/* Chapter 7: The 90 Players and Why FlagOS Exists */}
        <article className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-base sm:text-lg leading-relaxed text-slate-700 dark:text-neutral-300 font-normal">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              07
            </span>
            <span>Ninety Players on the Turf, and the Birth of FlagOS</span>
          </h2>

          <p>
            That grassroots effort culminated in a moment I will never forget: we opened tryouts for our competitive 5v5 flag roster, and <strong className="font-bold text-slate-900 dark:text-white">90 athletes showed up to compete</strong>.
          </p>

          <p>
            The turf was packed. But for a coach, having 90 players arrive for a 5v5 roster creates an immediate puzzle: your tournament travel roster only holds a fraction of that number. How do you honor the commitment of every single one of those 90 athletes? How do you keep them engaged, connected, and playing so that when our 11v11 semi-contact league kicks off in the winter, we haven’t lost that incredible energy?
          </p>

          <p>
            The hardest part of coaching is turning away people who want to be there. I couldn&rsquo;t stomach telling 75+ passionate women that there was no place for them on the field. The obvious answer was to create our own league right on campus where everyone could play, develop their skills, and stay part of our football program.
          </p>

          <p>
            But that created an immediate operational challenge: <strong className="font-bold text-slate-900 dark:text-white">I couldn&rsquo;t physically be down there on the fields running the games</strong>. As Head Coach, my full focus on game days and practices had to be with our competitive tournament roster, running offensive schemes, preparing our defense, and coaching our team.
          </p>

          <p>
            That was the true genesis of the idea. Outside of football, my professional background is in workflow automation, which I do with an Ontario non-profit called <strong className="font-bold text-slate-900 dark:text-white">Partners for Planning (P4P)</strong>—an organization dedicated to helping families and individuals with disabilities navigate complex systems and plan for the future. That work taught me the power of taking stressful, time-consuming administrative burdens and building automated tools that take the weight off people&rsquo;s shoulders.
          </p>

          <p>
            Pairing that automation job with everything I was learning in my <strong className="font-bold text-slate-900 dark:text-white">software engineering degree</strong>, I had both the technical foundation and the practical drive to build our own solution from scratch.
          </p>

          <p>
            I decided to bring that exact same philosophy to our football club. I needed an operating system so turnkey, automated, and frictionless that <strong className="font-bold text-slate-900 dark:text-white">my assistant coaches could manage everything without a great deal of stress or effort</strong> while I was coaching the main team.
          </p>

          <p>
            The system didn&rsquo;t start with big, bloated dashboards or complex scheduling algorithms. It started far simpler than that: it was birthed entirely by the <strong className="font-bold text-slate-900 dark:text-white">play-by-play wizard</strong>.
          </p>

          <p>
            In student club sports, you operate under <strong className="font-bold text-slate-900 dark:text-white">extreme volunteer constraints</strong>. The volunteer assistant coaches helping me run games were my close friends, most of whom were my former varsity tackle teammates. They had generously stepped up to support our program, but they had busy classes, jobs, and zero formal statkeeping training. Existing sports software demanded clunky dropdowns, manual mental math, and confusing form inputs that fell apart under live game speed.
          </p>

          <p>
            I came up with the play-by-play wizard to provide <strong className="font-bold text-slate-900 dark:text-white">full, authentic statkeeping</strong> while respecting those volunteer limits—making stat entry as <strong className="font-bold text-slate-900 dark:text-white">efficient, dynamic, and user-friendly as possible</strong>. With clean step-by-step taps, auto-advancing downs, contextual player buttons, and automated yardage math, my friends could accurately score a game from their phones without stress or mistakes.
          </p>

          <p>
            Now, to be completely candid and not misrepresent how it went: we weren&rsquo;t exactly successful in retaining all 90 athletes as the semester wore on. In university club sports, class workloads, jobs, and commitments inevitably pull people in different directions. But the core community held strong—we played real games out on the turf every single week using that wizard on the sidelines.
          </p>

          <p>
            Every week after game days, I would head home, reflect on what worked and what felt clunky, and build more stuff. I spent countless late nights refining the workflow, adding new capabilities, and polishing features based directly on what our players and assistant coaches were experiencing out on the field. From that initial wizard, the rest of the <strong className="font-bold text-slate-900 dark:text-white">YUWFFL (York University Women&rsquo;s Flag Football League) platform</strong> grew—automated schedules, live scoreboards, and season-long player profiles.
          </p>

          <p>
            Soon after, our tournament squad needed high-level tactical tools of its own. So I built a separate, specialized portal specifically for our competitive team—complete with interactive route-drawing, custom game call sheets, wristband generators, and private play installations. That experience directly spurred the idea for <strong className="font-bold text-slate-900 dark:text-white">FlagOS&rsquo;s two separate operating modes</strong>: a public, frictionless game-day operating system for leagues and tournaments on one side, and a secure, private coaching portal for competitive programs on the other.
          </p>

          <p>
            Watching that system power both our campus league and our competitive team proved that this wasn&rsquo;t just a weekend pet project—it was the operating system flag football had always needed. Coaches and league organizers didn’t ask me to build this; in fact, no one outside our team even knew about it. But my friends who coached with me and the players who used it every week told me how much they genuinely loved it and how much it elevated their experience. Seeing their passion and knowing what this could do for the sport, I took a <strong className="font-bold text-slate-900 dark:text-white">leap of faith</strong>—and that leap of faith is what grew into <strong className="font-bold text-slate-900 dark:text-white">FlagOS</strong>.
          </p>

          <p>
            I didn&rsquo;t build this to sell a product. I built it because I coach this game, I love these players, and our community deserved better infrastructure.
          </p>

          <p>
            That same mindset guides how I approach pricing. I don&rsquo;t intend to squeeze every last dollar out of people, and I refuse to let FlagOS fall victim to corporate greed. I&rsquo;ve set the price at what I genuinely think is fair: the cost scales based on your active user-base, so small grassroots leagues aren&rsquo;t burdened while larger organizations carry their fair share of server load.
          </p>

          <p>
            And whenever I build and roll out new features, they will simply be added for everyone—not locked behind higher-priced tiers or arbitrary enterprise paywalls, unless a capability incurs substantial raw compute costs to deliver. At the end of the day, I just want honest, fair compensation for this tool I built for the sport I love.
          </p>
        </article>

        {/* Personal Sign-off Card */}
        <section className="pt-8 border-t border-slate-200 dark:border-white/10 space-y-6">
          <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                A Note to Coaches &amp; Players
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
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
                  Head Coach • York Lions Football Alum (#42) • NS All-Star • Final-Year Software Engineering • Creator of FlagOS
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
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
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20"
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
