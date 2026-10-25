"use client";

import { usePageGuide } from "@/lib/pageGuide";
import { SIGNED_IN_HOME_WALKTHROUGH } from "@/lib/walkthroughs/public";

import Link from "next/link";
import {
  BarChart3,
  BicepsFlexed,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Crown,
  Globe,
  LayoutDashboard,
  Lock,
  MapPin,
  PauseCircle,
  PlayCircle,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Shield,
  Users,
  Whistle,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import {
  LeagueMembership,
  MembershipGame,
  Memberships,
  TeamMembership,
  useMyMemberships,
} from "@/lib/useMyMemberships";
import { TeamLogo } from "@/components/TeamAssets";
import SiteHeader from "@/components/SiteHeader";
import PoweredByFooter from "@/components/PoweredByFooter";
import { GAME_STATE_LABEL, getGameDisplayState, useNow, type GameDisplayState } from "@/lib/gameLiveState";

// Date-only strings parse as UTC and display a day early in western time zones.
function gameDate(game: MembershipGame): Date | null {
  if (!game.date) return null;
  const value = /^\d{4}-\d{2}-\d{2}$/.test(game.date)
    ? `${game.date}T${/^\d{1,2}:\d{2}$/.test(game.time) ? game.time.padStart(5, "0") : "12:00"}:00`
    : game.date;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatGameWhen(game: MembershipGame): string {
  const date = gameDate(game);
  if (!date) return "Date TBD";
  const day = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  if (!/^\d{1,2}:\d{2}$/.test(game.time)) return day;
  return `${day} · ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function opponentName(team: TeamMembership, game: MembershipGame): string {
  const isHome = game.homeTeamId === team.id;
  return (isHome ? game.awayTeamName : game.homeTeamName) || "TBD";
}

function gameResult(team: TeamMembership, game: MembershipGame) {
  if (game.homeScore === null || game.awayScore === null) return null;
  const isHome = game.homeTeamId === team.id;
  const ours = isHome ? game.homeScore : game.awayScore;
  const theirs = isHome ? game.awayScore : game.homeScore;
  return { ours, theirs, outcome: ours > theirs ? "W" : ours < theirs ? "L" : "T" };
}

/** League games open the league box score; independent-team coaches run games from the stat keeper, players see the schedule. */
function gameHref(team: TeamMembership, game: MembershipGame): string {
  if (team.leagueId) return `/matches/${game.id}`;
  return isCoach(team) ? `/teams/${team.id}/matches/${game.id}/stat-keeper` : `/teams/${team.id}/schedule`;
}

const isCoach = (team: TeamMembership) => team.roles.includes("coach");
const isPlayer = (team: TeamMembership) => team.roles.includes("player");

function RoleChip({ kind, label }: { kind: "commissioner" | "coach" | "player"; label: string }) {
  const styles = {
    commissioner: "border-amber-500/30 bg-amber-500/10 text-amber-500",
    coach: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
    player: "border-sky-500/30 bg-sky-500/10 text-sky-500",
  }[kind];
  const Icon = kind === "commissioner" ? Crown : kind === "coach" ? Whistle : BicepsFlexed;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${styles}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: typeof BookOpen; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-token bg-surface-inset px-2.5 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </Link>
  );
}

function TeamRow({ team }: { team: TeamMembership }) {
  const result = team.lastGame ? gameResult(team, team.lastGame) : null;
  const playerOnly = isPlayer(team) && !isCoach(team);
  return (
    <div className="rounded-xl border border-token bg-surface-inset/60 p-3 space-y-3">
      <div className="flex items-start gap-3">
        <Link href={`/teams/${team.id}`} className="shrink-0" aria-label={`${team.name} team hub`}>
          <TeamLogo teamName={team.name} logoUrl={team.logoUrl} primaryColor={team.primaryColor} className="w-11 h-11" />
        </Link>
        <div className="min-w-0 flex-1 space-y-1">
          <Link href={`/teams/${team.id}`} className="block text-sm font-black text-text-primary hover:underline leading-tight">
            {team.name}
          </Link>
          <div className="flex flex-wrap items-center gap-1.5">
            {isCoach(team) && <RoleChip kind="coach" label="Coach" />}
            {isPlayer(team) && (
              <RoleChip kind="player" label={team.player?.number ? `Player · #${team.player.number}` : "Player"} />
            )}
          </div>
        </div>
        {result && team.lastGame && (
          <Link
            href={gameHref(team, team.lastGame)}
            className="shrink-0 text-right leading-tight"
            aria-label={`Last game: ${result.outcome} ${result.ours}-${result.theirs} vs ${opponentName(team, team.lastGame)}`}
          >
            <span className={`block text-xs font-black ${result.outcome === "W" ? "text-emerald-500" : result.outcome === "L" ? "text-rose-500" : "text-text-secondary"}`}>
              {result.outcome} <span className="tabular-nums whitespace-nowrap">{result.ours}–{result.theirs}</span>
            </span>
            <span className="block max-w-[7.5rem] truncate text-[10px] text-text-muted">vs {opponentName(team, team.lastGame)}</span>
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <QuickLink href={`/teams/${team.id}/schedule`} icon={CalendarDays} label="Schedule" />
        <QuickLink href={`/teams/${team.id}/playbook`} icon={BookOpen} label="Playbook" />
        <QuickLink href={`/teams/${team.id}/roster`} icon={Users} label={isCoach(team) ? "Manage Roster" : "Roster"} />
        <QuickLink href={playerOnly ? "/profile" : `/teams/${team.id}/stats`} icon={BarChart3} label={playerOnly ? "My Stats" : "Stats"} />
      </div>
    </div>
  );
}

function CardShell({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-token bg-surface-raised p-4 sm:p-5 space-y-4 shadow-sm">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: accent || "var(--league-primary, #3ca505)" }} />
      {children}
    </article>
  );
}

function LeagueCard({ league }: { league: LeagueMembership }) {
  const coachCount = league.teams.filter(isCoach).length;
  const playerCount = league.teams.filter(isPlayer).length;
  return (
    <CardShell accent={league.primaryColor}>
      <div className="flex items-start gap-3">
        <TeamLogo teamName={league.name} logoUrl={league.logoUrl} primaryColor={league.primaryColor} className="w-12 h-12" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
            <span>League</span>
            {league.visibility === "private" && (
              <span className="inline-flex items-center gap-0.5"><Lock className="h-3 w-3" aria-hidden />Private</span>
            )}
          </div>
          <h3 className="text-base font-black text-text-primary leading-tight">{league.name}</h3>
          {league.seasonTitle && <p className="text-xs text-text-muted">{league.seasonTitle}</p>}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {league.isCommissioner && <RoleChip kind="commissioner" label="Commissioner" />}
            {coachCount > 0 && <RoleChip kind="coach" label={coachCount > 1 ? `Coach · ${coachCount} teams` : "Coach"} />}
            {playerCount > 0 && <RoleChip kind="player" label="Player" />}
          </div>
        </div>
      </div>

      <Link
        href={`/league/${league.id}`}
        className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
          league.isCommissioner
            ? "bg-amber-500 text-black hover:bg-amber-400"
            : "border border-token bg-surface-inset text-text-primary hover:bg-surface-hover"
        }`}
      >
        <span className="inline-flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4" aria-hidden />
          {league.isCommissioner ? "Open League" : "League Home"}
        </span>
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>

      {league.teams.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Your {league.teams.length > 1 ? "teams" : "team"}</p>
          {league.teams.map((team) => <TeamRow key={team.id} team={team} />)}
        </div>
      )}
    </CardShell>
  );
}

function IndependentTeamCard({ team }: { team: TeamMembership }) {
  return (
    <CardShell accent={team.primaryColor}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
        <Shield className="h-3 w-3" aria-hidden />
        Independent team
      </div>
      <TeamRow team={team} />
      <Link
        href={`/teams/${team.id}`}
        className="flex items-center justify-between gap-2 rounded-xl border border-token bg-surface-inset px-3 py-2.5 text-sm font-bold text-text-primary transition-colors hover:bg-surface-hover"
      >
        <span className="inline-flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4" aria-hidden />
          Team hub
        </span>
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    </CardShell>
  );
}

function UpNext({ memberships }: { memberships: Memberships }) {
  const now = useNow();
  const teams = [...memberships.leagues.flatMap((league) => league.teams), ...memberships.independentTeams];
  const seen = new Set<string>();
  const stateRank: Record<GameDisplayState, number> = { live: 0, paused: 1, upcoming: 2, final: 3 };
  const games = teams
    .filter((team) => team.nextGame)
    .map((team) => ({ team, game: team.nextGame!, state: getGameDisplayState(team.nextGame, now) }))
    .filter(({ game }) => (seen.has(game.id) ? false : (seen.add(game.id), true)))
    .sort((a, b) => {
      if (a.state !== b.state) return stateRank[a.state] - stateRank[b.state];
      return `${a.game.date} ${a.game.time}`.localeCompare(`${b.game.date} ${b.game.time}`);
    });
  if (!games.length) return null;

  return (
    <section data-tour="home-next" aria-labelledby="up-next-title" className="space-y-3">
      <h2 id="up-next-title" className="text-xs font-black uppercase tracking-widest text-text-muted">Up next</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map(({ team, game, state }) => {
          const live = state === "live";
          const started = live || state === "paused";
          const result = started ? gameResult(team, game) : null;
          return (
            <Link
              key={`${team.id}-${game.id}`}
              href={gameHref(team, game)}
              className={`group rounded-2xl border p-4 transition-colors ${
                live
                  ? "border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10"
                  : started
                    ? "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10"
                    : "border-token bg-surface-raised hover:bg-surface-hover"
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                {live ? (
                  <span className="inline-flex items-center gap-1 uppercase tracking-wider text-rose-500">
                    <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden />
                    {GAME_STATE_LABEL.live}
                  </span>
                ) : started ? (
                  <span className="inline-flex items-center gap-1 uppercase tracking-wider text-amber-500">
                    <PauseCircle className="h-3.5 w-3.5" aria-hidden />
                    {GAME_STATE_LABEL.paused}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-text-secondary">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    {formatGameWhen(game)}
                  </span>
                )}
                {result && (
                  <span className="tabular-nums whitespace-nowrap font-black text-text-primary">{result.ours}–{result.theirs}</span>
                )}
              </div>
              <p className="mt-2 text-sm font-black text-text-primary leading-snug">
                {team.name} <span className="font-semibold text-text-muted">vs</span> {opponentName(team, game)}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-text-muted">
                <span className="inline-flex min-w-0 items-center gap-1">
                  {game.location && <><MapPin className="h-3 w-3 shrink-0" aria-hidden /><span className="truncate">{game.location}</span></>}
                </span>
                <span className="inline-flex shrink-0 items-center gap-0.5 font-bold text-text-secondary group-hover:text-text-primary">
                  {live ? (isCoach(team) && !team.leagueId ? "Open stat keeper" : "Watch") : started && isCoach(team) && !team.leagueId ? "Resume stat keeper" : "Details"}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

const startOptions = [
  { href: "/pricing", icon: Plus, title: "Create a league", body: "Schedules, live scoring, standings and stats for your whole league." },
  { href: "/pricing", icon: Shield, title: "Start a team", body: "Run your own team portal with playbooks, roster and game tracking." },
  { href: "/leagues", icon: Search, title: "Find a league", body: "Browse public leagues and see who's playing near you." },
];

function StartSomething({ emphasized }: { emphasized: boolean }) {
  return (
    <section data-tour="home-start" aria-labelledby="start-title" className="space-y-3">
      <h2 id="start-title" className="text-xs font-black uppercase tracking-widest text-text-muted">
        {emphasized ? "Get started" : "Start something new"}
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {startOptions.map(({ href, icon: Icon, title, body }) => (
          <Link
            key={title}
            href={href}
            className={`flex items-start gap-3 rounded-2xl border border-token p-4 transition-colors hover:bg-surface-hover ${
              emphasized ? "bg-surface-raised" : "bg-surface-raised/60"
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="space-y-0.5">
              <span className="block text-sm font-black text-text-primary">{title}</span>
              <span className="block text-xs text-text-muted leading-relaxed">{body}</span>
            </span>
          </Link>
        ))}
      </div>
      <Link
        href="/league/default?demo=true"
        onClick={() => {
          sessionStorage.setItem("flagos_demo_active", "true");
          localStorage.setItem("flagos_demo_active", "true");
        }}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-primary"
      >
        <PlayCircle className="h-3.5 w-3.5" aria-hidden />
        Explore the demo league
      </Link>
    </section>
  );
}

function LoadingCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading your leagues and teams">
      {[0, 1].map((key) => (
        <div key={key} className="h-56 animate-pulse rounded-2xl border border-token bg-surface-raised" />
      ))}
    </div>
  );
}

function summarize(memberships: Memberships): string {
  const allTeams = [...memberships.leagues.flatMap((league) => league.teams), ...memberships.independentTeams];
  const parts = [
    [memberships.leagues.filter((league) => league.isCommissioner).length, "league you run", "leagues you run"],
    [allTeams.filter(isCoach).length, "team you coach", "teams you coach"],
    [allTeams.filter(isPlayer).length, "team you play on", "teams you play on"],
  ] as const;
  return parts
    .filter(([count]) => count > 0)
    .map(([count, one, many]) => `${count} ${count === 1 ? one : many}`)
    .join(" · ");
}

/** Home for signed-in accounts: everything they're part of first, with roles shown per league and team. */
export default function SignedInHome() {
  usePageGuide(SIGNED_IN_HOME_WALKTHROUGH, 1);
  const { user, userProfile, playerData, isPlatformAdmin } = useAuth();
  const { data, loading, refreshing, error, retry } = useMyMemberships(user?.uid);

  const firstName = (value: unknown) => (typeof value === "string" ? value.trim().split(/\s+/)[0] : "");
  const name = firstName(user?.displayName) || firstName(userProfile?.displayName) || firstName(playerData?.playerName);
  const hasAny = Boolean(data && (data.leagues.length || data.independentTeams.length));
  const leagues = data
    ? [...data.leagues].sort((a, b) => Number(b.isCommissioner) - Number(a.isCommissioner) || a.name.localeCompare(b.name))
    : [];
  const showLoading = loading || (!user && !data);

  return (
    <div className="flex min-h-screen flex-col bg-surface-base text-text-primary">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-6 sm:px-6 sm:py-10">
        <section data-tour="home-welcome" className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              {name ? `Welcome back, ${name}` : "Welcome back"}
            </h1>
            <p className="text-sm text-text-muted">
              {data && hasAny ? summarize(data) : "Your leagues, teams and games, all in one place."}
              {refreshing && data && <RefreshCw className="ml-2 inline h-3 w-3 animate-spin align-[-1px]" aria-label="Refreshing" />}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isPlatformAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-500 hover:bg-amber-500/15"
              >
                <Shield className="h-3.5 w-3.5" aria-hidden />
                Platform Admin
              </Link>
            )}
            <Link
              href="/leagues"
              className="inline-flex items-center gap-1.5 rounded-xl border border-token bg-surface-raised px-3 py-2 text-xs font-bold text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            >
              <Globe className="h-3.5 w-3.5" aria-hidden />
              League Directory
            </Link>
          </div>
        </section>

        {data && <UpNext memberships={data} />}

        <section data-tour="home-memberships" aria-labelledby="mine-title" className="space-y-3">
          <h2 id="mine-title" className="text-xs font-black uppercase tracking-widest text-text-muted">Your leagues &amp; teams</h2>
          {showLoading ? (
            <LoadingCards />
          ) : error && !data ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-text-secondary">
              <p>We couldn&apos;t load your leagues and teams. {error}</p>
              <button type="button" onClick={retry} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-text-primary hover:underline">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Try again
              </button>
            </div>
          ) : hasAny ? (
            <div className="grid items-start gap-4 md:grid-cols-2">
              {leagues.map((league) => <LeagueCard key={league.id} league={league} />)}
              {data!.independentTeams.map((team) => <IndependentTeamCard key={team.id} team={team} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-token bg-surface-raised/60 p-6 text-center space-y-2">
              <p className="text-base font-black">You&apos;re not on a league or team yet</p>
              <p className="mx-auto max-w-md text-sm text-text-muted">
                Commissioners and coaches add people by email. If you were invited with a different address,{" "}
                <Link href="/account" className="font-semibold text-text-primary underline">connect it to your account</Link>.
              </p>
            </div>
          )}
        </section>

        <StartSomething emphasized={!showLoading && !hasAny} />
      </div>
      <PoweredByFooter />
    </div>
  );
}
