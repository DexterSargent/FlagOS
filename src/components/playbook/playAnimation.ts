import {
  getPlayerMotionPath,
  playerHasMotion,
  type PlayerNode,
  type RoutePoint,
} from "@/lib/playbookTypes";

/** Seconds a full play takes at 1x speed. */
export const PLAY_ANIMATION_DURATION_SECONDS = 3.2;
/** Fraction of the timeline used for pre-snap motion when any offensive player has motion. */
export const PRE_SNAP_MOTION_PHASE = 0.35;

export interface MeasuredPath {
  points: RoutePoint[];
  /** cumulative[i] is the distance travelled when reaching points[i]. */
  cumulative: number[];
  total: number;
}

export function measurePath(points: RoutePoint[]): MeasuredPath {
  const cumulative = [0];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    total += Math.sqrt(dx * dx + dy * dy);
    cumulative.push(total);
  }
  return { points, cumulative, total };
}

export function interpolateMeasuredPath(path: MeasuredPath, progress: number): { x: number; y: number } {
  const { points, cumulative, total } = path;
  if (points.length === 0) return { x: 50, y: 50 };
  if (points.length === 1 || progress <= 0) return { x: points[0].x, y: points[0].y };
  const last = points[points.length - 1];
  if (progress >= 1) return { x: last.x, y: last.y };
  if (total === 0) return { x: points[0].x, y: points[0].y };

  const targetDist = progress * total;
  const segmentCount = points.length - 1;
  for (let i = 0; i < segmentCount; i++) {
    const accumulated = cumulative[i];
    const segDist = cumulative[i + 1] - accumulated;
    if (cumulative[i + 1] >= targetDist || i === segmentCount - 1) {
      const segProgress = Math.min(1, Math.max(0, segDist > 0 ? (targetDist - accumulated) / segDist : 0));
      const currentP = points[i];
      const nextP = points[i + 1];
      return {
        x: currentP.x + (nextP.x - currentP.x) * segProgress,
        y: currentP.y + (nextP.y - currentP.y) * segProgress,
      };
    }
  }
  return { x: last.x, y: last.y };
}

export function interpolatePointsAlongPath(points: RoutePoint[], progress: number): { x: number; y: number } {
  return interpolateMeasuredPath(measurePath(points), progress);
}

interface PlayerAnimationPlan {
  player: PlayerNode;
  hasMotion: boolean;
  /** Alignment followed by motion waypoints; null when the player has no motion waypoints. */
  motionPath: MeasuredPath | null;
  motionEnd: RoutePoint | null;
  /** Route origin (motion end or alignment) followed by route waypoints; null without a post-snap route. */
  routePath: MeasuredPath | null;
}

function buildPlan(player: PlayerNode): PlayerAnimationPlan {
  const hasMotion = player.side === "offense" && playerHasMotion(player);
  const motionPts = hasMotion ? getPlayerMotionPath(player) : null;
  const start = { x: player.x, y: player.y };
  const motionEnd = motionPts && motionPts.length > 0 ? motionPts[motionPts.length - 1] : null;
  const hasPostSnapRoute = Boolean(
    player.route && player.route.length > 0 && (player.routeType !== "motion" || !motionPts)
  );
  return {
    player,
    hasMotion,
    motionPath: motionPts && motionPts.length > 0 ? measurePath([start, ...motionPts]) : null,
    motionEnd,
    routePath: hasPostSnapRoute && player.route ? measurePath([motionEnd ?? start, ...player.route]) : null,
  };
}

export interface PlayAnimationModel {
  hasAnyMotion: boolean;
  getPosition(player: PlayerNode, progress: number, animating: boolean): { x: number; y: number };
}

/**
 * Precomputes motion/route geometry for a set of players so each animation frame only interpolates.
 * Rebuild whenever the players array changes.
 */
export function createPlayAnimationModel(players: PlayerNode[]): PlayAnimationModel {
  const plans = new Map<PlayerNode, PlayerAnimationPlan>();
  const offenseById = new Map<string, PlayerNode>();
  let hasAnyMotion = false;
  for (const player of players) {
    const plan = buildPlan(player);
    plans.set(player, plan);
    if (plan.hasMotion) hasAnyMotion = true;
    if (player.side === "offense" && !offenseById.has(player.id)) offenseById.set(player.id, player);
  }

  const planFor = (player: PlayerNode) => plans.get(player) ?? buildPlan(player);

  const getBasePosition = (player: PlayerNode, progress: number, animating: boolean) => {
    const plan = planFor(player);

    if (hasAnyMotion) {
      if (progress <= PRE_SNAP_MOTION_PHASE) {
        // Pre-snap phase: motion players run their motion path; all others hold alignment.
        if (plan.motionPath) {
          const motionProg = Math.min(1, Math.max(0, progress / PRE_SNAP_MOTION_PHASE));
          return interpolateMeasuredPath(plan.motionPath, motionProg);
        }
        return { x: player.x, y: player.y };
      }

      const postSnapProg = Math.min(1, Math.max(0, (progress - PRE_SNAP_MOTION_PHASE) / 0.65));
      if (plan.routePath) return interpolateMeasuredPath(plan.routePath, postSnapProg);
      if (plan.motionEnd) return plan.motionEnd;
      if (animating && player.label === "QB") return { x: player.x, y: player.y + postSnapProg * 2.5 };
      return { x: player.x, y: player.y };
    }

    if (plan.routePath) return interpolateMeasuredPath(plan.routePath, progress);
    if (animating && player.label === "QB") return { x: player.x, y: player.y + progress * 2.5 };
    return { x: player.x, y: player.y };
  };

  return {
    hasAnyMotion,
    getPosition(player, progress, animating) {
      if (player.side === "defense" && player.coverageType === "man" && player.manTargetId) {
        const receiver = offenseById.get(player.manTargetId);
        if (receiver) {
          // Man defenders keep their alignment cushion and mirror the receiver's displacement.
          const receiverPos = getBasePosition(receiver, progress, animating);
          return {
            x: player.x + receiverPos.x - receiver.x,
            y: player.y + receiverPos.y - receiver.y,
          };
        }
      }
      return getBasePosition(player, progress, animating);
    },
  };
}

export function advanceAnimationProgress(
  current: number,
  deltaSeconds: number,
  speed: number
): { progress: number; done: boolean } {
  const next = current + deltaSeconds * ((1 / PLAY_ANIMATION_DURATION_SECONDS) * speed);
  return next >= 1 ? { progress: 1, done: true } : { progress: next, done: false };
}

export interface AnimationProgressStore {
  get: () => number;
  set: (next: number) => void;
  subscribe: (listener: () => void) => () => void;
}

/** Tiny external store so per-frame progress only re-renders subscribed field layers. */
export function createAnimationProgressStore(initial = 0): AnimationProgressStore {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
