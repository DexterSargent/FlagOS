import { describe, it, expect, vi } from "vitest";
import type { PlayerNode, RoutePoint } from "@/lib/playbookTypes";
import {
  advanceAnimationProgress,
  createAnimationProgressStore,
  createPlayAnimationModel,
  interpolatePointsAlongPath,
  measurePath,
} from "@/components/playbook/playAnimation";

// Original per-frame implementation kept as a reference oracle.
function referenceInterpolate(points: RoutePoint[], progress: number) {
  if (points.length === 0) return { x: 50, y: 50 };
  if (points.length === 1 || progress <= 0) return { x: points[0].x, y: points[0].y };
  if (progress >= 1) return { x: points[points.length - 1].x, y: points[points.length - 1].y };
  const dists: number[] = [];
  let totalDist = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const d = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    dists.push(d);
    totalDist += d;
  }
  if (totalDist === 0) return { x: points[0].x, y: points[0].y };
  const targetDist = progress * totalDist;
  let accumulated = 0;
  for (let i = 0; i < dists.length; i++) {
    const segDist = dists[i];
    if (accumulated + segDist >= targetDist || i === dists.length - 1) {
      const segProgress = Math.min(1, Math.max(0, segDist > 0 ? (targetDist - accumulated) / segDist : 0));
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * segProgress,
        y: points[i].y + (points[i + 1].y - points[i].y) * segProgress,
      };
    }
    accumulated += segDist;
  }
  return points[points.length - 1];
}

const receiver: PlayerNode = {
  id: "x", label: "X", role: "WR", side: "offense", x: 15, y: 70,
  route: [{ x: 15, y: 50 }, { x: 50, y: 50 }],
};
const qb: PlayerNode = { id: "qb", label: "QB", role: "QB", side: "offense", x: 50, y: 82, route: [] };
const manDefender: PlayerNode = {
  id: "cb", label: "CB1", role: "Cornerback", side: "defense", x: 18, y: 62,
  coverageType: "man", manTargetId: "x", route: [{ x: 90, y: 10 }],
};

describe("playAnimation geometry", () => {
  const paths: RoutePoint[][] = [
    [],
    [{ x: 10, y: 10 }],
    [{ x: 10, y: 10 }, { x: 10, y: 10 }],
    [{ x: 10, y: 70 }, { x: 10, y: 50 }, { x: 10, y: 50 }, { x: 40, y: 45 }],
    [{ x: 50, y: 70 }, { x: 80, y: 40 }, { x: 20, y: 30 }, { x: 60, y: 10 }],
  ];
  it.each(paths.map((path, index) => [index, path] as const))("matches the original interpolation for path %s", (_, path) => {
    for (const progress of [-0.2, 0, 0.01, 0.2, 0.333, 0.5, 0.75, 0.999, 1, 1.4]) {
      const actual = interpolatePointsAlongPath(path, progress);
      const expected = referenceInterpolate(path, progress);
      expect(actual.x).toBeCloseTo(expected.x, 10);
      expect(actual.y).toBeCloseTo(expected.y, 10);
    }
  });

  it("measures cumulative segment lengths once", () => {
    const measured = measurePath([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 10 }]);
    expect(measured.cumulative).toEqual([0, 5, 11]);
    expect(measured.total).toBe(11);
  });
});

function expectPoint(actual: { x: number; y: number }, expected: { x: number; y: number }) {
  expect(actual.x).toBeCloseTo(expected.x, 9);
  expect(actual.y).toBeCloseTo(expected.y, 9);
}

describe("createPlayAnimationModel", () => {
  it("moves man defenders by exactly the receiver's displacement", () => {
    const model = createPlayAnimationModel([receiver, manDefender]);
    for (const progress of [0, 0.25, 0.5, 1]) {
      const rec = model.getPosition(receiver, progress, false);
      const db = model.getPosition(manDefender, progress, false);
      expect(db.x - rec.x).toBeCloseTo(manDefender.x - receiver.x);
      expect(db.y - rec.y).toBeCloseTo(manDefender.y - receiver.y);
    }
  });

  it("mirrors pre-snap motion and holds non-motion players until the snap", () => {
    const motionReceiver = { ...receiver, motionPath: [{ x: 35, y: 70 }], motionName: "Jet Motion" };
    const holder: PlayerNode = { ...receiver, id: "z", label: "Z", x: 85, route: [{ x: 85, y: 50 }] };
    const model = createPlayAnimationModel([motionReceiver, holder, manDefender]);
    expect(model.hasAnyMotion).toBe(true);
    expectPoint(model.getPosition(motionReceiver, 0.175, false), { x: 25, y: 70 });
    expectPoint(model.getPosition(holder, 0.3, false), { x: 85, y: 70 });
    expectPoint(model.getPosition(manDefender, 0.175, false), { x: 28, y: 62 });
    expectPoint(model.getPosition(holder, 1, false), { x: 85, y: 50 });
    const db = model.getPosition(manDefender, 0.675, false);
    const rec = model.getPosition(motionReceiver, 0.675, false);
    expect(db.x - rec.x).toBeCloseTo(3);
    expect(db.y - rec.y).toBeCloseTo(-8);
  });

  it("keeps a motion player at the motion end when no post-snap route exists", () => {
    const motionOnly: PlayerNode = { ...receiver, route: [], motionPath: [{ x: 35, y: 70 }], hasMotion: true };
    const model = createPlayAnimationModel([motionOnly]);
    expectPoint(model.getPosition(motionOnly, 0.9, true), { x: 35, y: 70 });
  });

  it("uses a defender's own route when the man target is missing or not offense", () => {
    const missing = { ...manDefender, manTargetId: "missing" };
    const self = { ...manDefender, manTargetId: manDefender.id };
    const model = createPlayAnimationModel([receiver, missing, self]);
    expectPoint(model.getPosition(missing, 1, false), { x: 90, y: 10 });
    expectPoint(model.getPosition(self, 1, false), { x: 90, y: 10 });
  });

  it("only drops the QB back while the play is running", () => {
    const model = createPlayAnimationModel([qb, receiver]);
    expectPoint(model.getPosition(qb, 0.4, false), { x: 50, y: 82 });
    expectPoint(model.getPosition(qb, 0.4, true), { x: 50, y: 83 });
  });

  it("handles player objects that were not part of the model", () => {
    const model = createPlayAnimationModel([]);
    expectPoint(model.getPosition(receiver, 1, false), { x: 50, y: 50 });
  });
});

describe("animation progress store", () => {
  it("advances at the 3.2s base duration and clamps at the end", () => {
    expect(advanceAnimationProgress(0, 1.6, 1).progress).toBeCloseTo(0.5);
    expect(advanceAnimationProgress(0, 1.6, 1).done).toBe(false);
    expect(advanceAnimationProgress(0, 1.6, 0.5).progress).toBeCloseTo(0.25);
    expect(advanceAnimationProgress(0.9, 1, 1.5)).toEqual({ progress: 1, done: true });
  });

  it("notifies subscribers only on change", () => {
    const store = createAnimationProgressStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.set(0);
    expect(listener).not.toHaveBeenCalled();
    store.set(0.4);
    expect(store.get()).toBe(0.4);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.set(0.8);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
