import { describe, expect, it } from "vitest";
import { assignScheduleSlots, scheduleDayOffsets } from "@/lib/scheduleSlots";

describe("assignScheduleSlots", () => {
  const fields = ["F1", "F2", "F3", "F4", "F5"];
  const times = ["9:00", "10:15", "11:30", "12:45", "2:00"];

  it("never puts two games in the same field and time", () => {
    const { slots } = assignScheduleSlots(16, fields, times);
    const keys = slots.map((s) => `${s!.dayOffset}|${s!.time}|${s!.location}`);
    expect(new Set(keys).size).toBe(16);
  });

  it("fills every field at a kickoff before using the next kickoff", () => {
    const { slots } = assignScheduleSlots(6, fields, times);
    expect(slots.slice(0, 5).every((s) => s!.time === "9:00")).toBe(true);
    expect(slots[5]).toEqual({ dayOffset: 0, time: "10:15", location: "F1" });
  });

  it("returns null for games beyond capacity instead of double-booking", () => {
    const { slots, capacity } = assignScheduleSlots(5, ["F1", "F2"], ["9:00", "10:00"]);
    expect(capacity).toBe(4);
    expect(slots.filter(Boolean)).toHaveLength(4);
    expect(slots[4]).toBeNull();
  });

  it("uses the second weekend day when weekends are selected", () => {
    const { slots } = assignScheduleSlots(3, ["F1"], ["9:00"], scheduleDayOffsets("weekends"));
    expect(slots[0]!.dayOffset).toBe(0);
    expect(slots[1]!.dayOffset).toBe(1);
    expect(slots[2]).toBeNull();
  });
});
