import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMatchTeamColors } from "@/lib/useMatchTeamColors";

const { records, listeners } = vi.hoisted(() => ({
  records: new Map<string, Record<string, string>>(),
  listeners: new Map<string, (snapshot: { exists: () => boolean; data: () => Record<string, string> }) => void>(),
}));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, _collection, id) => id),
  onSnapshot: vi.fn((id, callback) => {
    listeners.set(id, callback);
    callback({ exists: () => records.has(id), data: () => records.get(id) || {} });
    return () => listeners.delete(id);
  }),
}));

describe("shared match team palettes", () => {
  beforeEach(() => {
    records.clear();
    listeners.clear();
  });

  it("uses stored match colors when the team document is unavailable", () => {
    const { result } = renderHook(() => useMatchTeamColors({ homeTeamId: "falcons", homeTeamPrimaryColor: "#112233", homeTeamSecondaryColor: "#FFFFFF", homeTeamTertiaryColor: "#000000" }, false));
    expect(result.current.home).toEqual({ primary: "#112233", secondary: "#FFFFFF", tertiary: "#000000" });
    expect(listeners.has("falcons")).toBe(true);
  });

  it("updates live and restores the latest saved colors on a new view mount", () => {
    records.set("falcons", { primaryColor: "#990000", secondaryColor: "#FFFFFF", tertiaryColor: "#FFCC00" });
    const match = { homeTeamId: "falcons", awayTeamId: "opponent_external", homeTeamPrimaryColor: "#000000" };
    const first = renderHook(() => useMatchTeamColors(match, false));
    expect(first.result.current.home.primary).toBe("#990000");
    records.set("falcons", { primaryColor: "#123456", secondaryColor: "#EEEEEE", tertiaryColor: "#FFCC00" });
    act(() => listeners.get("falcons")?.({ exists: () => true, data: () => records.get("falcons") || {} }));
    expect(first.result.current.home.primary).toBe("#123456");
    first.unmount();
    const second = renderHook(() => useMatchTeamColors(match, false));
    expect(second.result.current.home).toEqual({ primary: "#123456", secondary: "#EEEEEE", tertiary: "#FFCC00" });
    expect(listeners.has("opponent_external")).toBe(false);
  });
});
