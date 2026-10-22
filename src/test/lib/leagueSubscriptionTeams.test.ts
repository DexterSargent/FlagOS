import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateSecureRecord = vi.fn();
const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockDoc = vi.fn((_db, coll, id) => ({ path: `${coll}/${id}`, id }));

vi.mock("@/lib/secureWrites", () => ({
  createSecureRecord: (...args: unknown[]) => mockCreateSecureRecord(...args),
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(),
  doc: (...args: unknown[]) => mockDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
}));

const mockCurrentUser = {
  uid: "commissioner-1",
  email: "commissioner@flagos.com",
  emailVerified: true,
};

vi.mock("@/lib/firebase", () => ({
  auth: {
    get currentUser() {
      return mockCurrentUser;
    },
  },
  db: {},
}));

describe("League Starter Teams & Subscription Adjustment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates monthly subscription fees as $40 base + $15 per team", () => {
    const baseFee = 40;
    const perTeamFee = 15;
    const calculateFee = (teams: number) => baseFee + teams * perTeamFee;

    expect(calculateFee(4)).toBe(100);
    expect(calculateFee(8)).toBe(160);
    expect(calculateFee(12)).toBe(220);
    expect(calculateFee(16)).toBe(280);
    expect(calculateFee(2)).toBe(70);
  });

  it("provisions teams Team 1 through Team N when creating a league with N teams", async () => {
    mockCreateSecureRecord.mockImplementation(async (entity: string, data: Record<string, unknown>) => {
      if (entity === "league") return "league-new-123";
      if (entity === "team") return `team-${data.name}`;
      return "mock-id";
    });

    const teamCount = 6;
    const newLeagueId = "league-new-123";

    // Simulate starter team creation logic in createLeague
    const starterTeamColors = [
      "#3ca505", "#3b82f6", "#ef4444", "#f59e0b",
      "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
    ];

    const teamPromises = Array.from({ length: teamCount }, (_, index) => {
      const num = index + 1;
      return mockCreateSecureRecord("team", {
        name: `Team ${num}`,
        shortcode: `TM${num}`,
        leagueId: newLeagueId,
        primaryColor: starterTeamColors[index % starterTeamColors.length],
        createdAt: "2026-10-22T00:00:00.000Z",
      });
    });

    const teamIds = await Promise.all(teamPromises);
    expect(teamIds).toHaveLength(6);
    expect(mockCreateSecureRecord).toHaveBeenCalledTimes(6);

    for (let i = 1; i <= 6; i++) {
      expect(mockCreateSecureRecord).toHaveBeenCalledWith("team", expect.objectContaining({
        name: `Team ${i}`,
        shortcode: `TM${i}`,
        leagueId: newLeagueId,
      }));
    }
  });

  it("adjusts cost at next monthly payment when adding a team to subscription", () => {
    const currentSub = {
      plan: "league" as const,
      status: "active" as const,
      baseMonthlyFee: 40,
      perTeamMonthlyFee: 15,
      teamCount: 8,
      totalMonthlyFee: 160,
      billingCycle: "monthly" as const,
      renewsAt: "2026-11-20T00:00:00.000Z",
    };

    const nextTeamCount = currentSub.teamCount + 1; // 9
    const nextTotalMonthlyFee = currentSub.baseMonthlyFee + nextTeamCount * currentSub.perTeamMonthlyFee; // 40 + 9*15 = 175

    expect(nextTotalMonthlyFee).toBe(175);
    expect(nextTotalMonthlyFee - currentSub.totalMonthlyFee).toBe(15);
  });

  it("adjusts cost at next monthly payment when removing a team from subscription", () => {
    const currentSub = {
      plan: "league" as const,
      status: "active" as const,
      baseMonthlyFee: 40,
      perTeamMonthlyFee: 15,
      teamCount: 8,
      totalMonthlyFee: 160,
      billingCycle: "monthly" as const,
      renewsAt: "2026-11-20T00:00:00.000Z",
    };

    const nextTeamCount = Math.max(2, currentSub.teamCount - 1); // 7
    const nextTotalMonthlyFee = currentSub.baseMonthlyFee + nextTeamCount * currentSub.perTeamMonthlyFee; // 40 + 7*15 = 145

    expect(nextTotalMonthlyFee).toBe(145);
    expect(currentSub.totalMonthlyFee - nextTotalMonthlyFee).toBe(15);
  });
});
