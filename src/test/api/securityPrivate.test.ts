import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/security/private/route";
const TEAM_ADMIN_EMAILS = ["head@falcons.com", "assistant@falcons.com"];

const {
  verifyIdTokenMock,
  runTransactionMock,
  collectionMock,
  documentGetMock,
  documentSetMock,
  getAllMock,
  transaction,
} = vi.hoisted(() => {
  const transaction = {
    get: vi.fn(),
    set: vi.fn(),
  };
  return {
    verifyIdTokenMock: vi.fn(),
    runTransactionMock: vi.fn(),
    collectionMock: vi.fn(),
    documentGetMock: vi.fn(),
    documentSetMock: vi.fn(),
    getAllMock: vi.fn(),
    transaction,
  };
});

vi.mock("@/lib/firebaseAdmin", () => ({
  adminAuth: { verifyIdToken: verifyIdTokenMock },
  adminDb: {
    doc: vi.fn((path: string) => ({
      path,
      get: () => documentGetMock(path),
      set: (data: unknown) => documentSetMock(path, data),
    })),
    collection: collectionMock,
    getAll: getAllMock,
    runTransaction: runTransactionMock,
  },
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: vi.fn(() => "server-timestamp") },
}));

const token = {
  uid: "user-1",
  email: "user@example.com",
  email_verified: true,
};

function request(body: unknown, bearer = "Bearer valid-token") {
  return new Request("http://localhost/api/security/private", {
    method: "POST",
    headers: { authorization: bearer, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("private-data API", () => {
  describe("depth chart publication", () => {
    const chart = { id: "chart", name: "Private starters", formationKey: "default:offense", assignments: { QB: ["p1"] } };
    function setupDepth(published: boolean) {
      documentGetMock.mockImplementation(async (path: string) => ({
        exists: true,
        data: () => path === "team_depth_charts/team-1"
          ? { visibleToPlayers: published, charts: [chart] }
          : path === "teams/team-1" ? { name: "Team", leagueId: "league" }
          : path === "team_private/team-1" ? { adminEmails: ["coach@example.com"] } : {},
      }));
    }
    it("returns no assignments or playbook formations when player view is disabled", async () => {
      setupDepth(false);
      const response = await POST(request({ action: "depth_chart", data: { teamId: "team-1" } }));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: { charts: [], formations: [], visibleToPlayers: false, canEdit: false } });
    });
    it("lets coaches see hidden charts and edit them", async () => {
      setupDepth(false);
      verifyIdTokenMock.mockResolvedValue({ ...token, email: "coach@example.com" });
      const response = await POST(request({ action: "depth_chart", data: { teamId: "team-1" } }));
      expect(response.status).toBe(200);
      expect((await response.json()).data).toMatchObject({ charts: [chart], canEdit: true, visibleToPlayers: false });
    });
    it("does not reveal published charts to outsiders", async () => {
      setupDepth(true);
      const response = await POST(request({ action: "depth_chart", data: { teamId: "team-1" } }));
      expect(response.status).toBe(403);
    });
    it.each(["team-1", "another-team"])("checks actual roster membership for %s", async (playerTeamId) => {
      setupDepth(true);
      collectionMock.mockImplementation((name: string) => ({
        where: () => ({ limit: () => ({ get: async () => ({ docs: name === "player_private" ? [{ id: "p1", data: () => ({ email: token.email }) }] : [] }) }) }),
      }));
      getAllMock.mockResolvedValue([{ id: "p1", exists: true, data: () => ({ playerName: "Player", teamId: playerTeamId }), get: (field: string) => field === "teamId" ? playerTeamId : undefined }]);
      const response = await POST(request({ action: "depth_chart", data: { teamId: "team-1" } }));
      expect(response.status).toBe(playerTeamId === "team-1" ? 200 : 403);
      if (playerTeamId === "team-1") expect((await response.json()).data).toMatchObject({ charts: [chart], canEdit: false });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdTokenMock.mockResolvedValue(token);
    runTransactionMock.mockImplementation((callback) => callback(transaction));
    transaction.get.mockResolvedValue({
      exists: false,
      get: () => undefined,
    });
    documentGetMock.mockImplementation(async (path: string) => {
      if (path === "teams/team-1") {
        return {
          exists: true,
          data: () => ({ leagueId: "league-1", name: "Team One" }),
        };
      }
      if (path === "team_private/team-1") {
        return {
          exists: true,
          data: () => ({ adminEmails: ["another@example.com"] }),
        };
      }
      return { exists: false, data: () => undefined };
    });
    collectionMock.mockReturnValue({
      where: vi.fn(() => ({
        limit: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ docs: [], size: 0 }) })),
      })),
      limit: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ docs: [], size: 0 }) })),
    });
    getAllMock.mockResolvedValue([]);
  });

  it("requires a verified identity", async () => {
    verifyIdTokenMock.mockResolvedValue({ ...token, email_verified: false });
    const response = await POST(request({ action: "lookup", data: {} }));

    expect(response.status).toBe(403);
    expect(collectionMock).not.toHaveBeenCalled();
  });

  it("does not return team contacts to a non-admin", async () => {
    const response = await POST(request({
      action: "team",
      data: { teamId: "team-1" },
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "You do not have permission to access this team's private data.",
    });
  });

  it("rejects platform-wide contact listings for ordinary users", async () => {
    const response = await POST(request({ action: "admin_overview", data: {} }));

    expect(response.status).toBe(403);
    expect(collectionMock).not.toHaveBeenCalled();
  });

  it("rejects caller-supplied filters for account email lookup", async () => {
    const response = await POST(request({
      action: "lookup",
      data: { email: "victim@example.com" },
    }));

    expect(response.status).toBe(400);
    expect(collectionMock).not.toHaveBeenCalled();
  });

  it("applies weighted read limits before running expensive actions", async () => {
    verifyIdTokenMock.mockResolvedValue({
      ...token,
      email: "coach@example.com",
    });
    transaction.get.mockResolvedValue({
      exists: true,
      get: (field: string) => field === "minuteStart" ? Date.now() : 7_900,
    });

    const response = await POST(request({ action: "lookup", data: {} }));

    expect(response.status).toBe(429);
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(collectionMock).not.toHaveBeenCalled();
  });

  it("does not throttle the platform admin overview", async () => {
    verifyIdTokenMock.mockResolvedValue({
      ...token,
      email: "dextersargent@flagos.ca",
    });
    transaction.get.mockResolvedValue({
      exists: true,
      get: (field: string) => field === "minuteStart" ? Date.now() : 1_900,
    });

    const response = await POST(request({ action: "admin_overview", data: {} }));

    expect(response.status).not.toBe(429);
  });

  it.each(TEAM_ADMIN_EMAILS)("discovers a stored independent team for coach %s", async (email) => {
    verifyIdTokenMock.mockResolvedValue({ ...token, email });
    collectionMock.mockImplementation((name: string) => ({
      where: (field: string, _op: string, value: string) => ({ limit: () => ({ get: async () => ({ docs: name === "team_private" && field === "adminEmails" && value === email
        ? [{ id: "falcons", data: () => ({ adminEmails: TEAM_ADMIN_EMAILS }) }] : [] }) }) }),
    }));
    getAllMock.mockResolvedValue([{ id: "falcons", exists: true, data: () => ({ name: "Falcons", subscription: { status: "active" } }), get: (field: string) => field === "name" ? "Falcons" : undefined }]);
    const response = await POST(request({ action: "lookup", data: {} }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { teams: [{ id: "falcons", name: "Falcons" }] } });
  });

  it.each(TEAM_ADMIN_EMAILS)("allows stored independent team coach %s to read private contacts", async (email) => {
    verifyIdTokenMock.mockResolvedValue({ ...token, email });
    documentGetMock.mockImplementation(async (path: string) => ({
      exists: ["teams/falcons", "team_private/falcons"].includes(path),
      data: () => path === "teams/falcons" ? { name: "Falcons", subscription: { status: "active" } }
        : path === "team_private/falcons" ? { adminEmails: TEAM_ADMIN_EMAILS } : undefined,
    }));
    const response = await POST(request({ action: "team", data: { teamId: "falcons" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { team: { adminEmails: TEAM_ADMIN_EMAILS } } });
  });

  it("does not invent a team or grant access when its document is missing", async () => {
    verifyIdTokenMock.mockResolvedValue({ ...token, email: TEAM_ADMIN_EMAILS[0] });
    const response = await POST(request({ action: "team", data: { teamId: "missing-team" } }));
    expect(response.status).toBe(404);
  });

  it("accepts a lookup request without a data object", async () => {
    verifyIdTokenMock.mockResolvedValue({ ...token, email: "assistant@falcons.com" });
    const response = await POST(request({ action: "lookup" }));
    expect(response.status).toBe(200);
  });

  it("still requires team lookup data", async () => {
    const response = await POST(request({ action: "team" }));
    expect(response.status).toBe(400);
  });

  it("does not grant a requested coach platform administration", async () => {
    verifyIdTokenMock.mockResolvedValue({ ...token, email: "head@falcons.com" });
    const response = await POST(request({ action: "admin_overview", data: {} }));
    expect(response.status).toBe(403);
  });

  it("does not grant a requested coach another team's private data", async () => {
    verifyIdTokenMock.mockResolvedValue({ ...token, email: "other@falcons.com" });
    const response = await POST(request({ action: "team", data: { teamId: "team-1" } }));
    expect(response.status).toBe(403);
  });
});

describe("memberships", () => {
  const email = "dex@example.com";
  const torontoDay = (offset: number) =>
    new Date(Date.now() + offset * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
  const store: Record<string, Record<string, Record<string, unknown>>> = {
    league_private: { metro: { adminEmails: [email] } },
    leagues: {
      metro: { leagueName: "Metro Flag", visibility: "private" },
      sunday: { leagueName: "Sunday Social", seasonTitle: "Fall" },
    },
    team_private: { york: { adminEmails: [email] } },
    player_private: { p1: { email } },
    players: { p1: { teamId: "sharks", playerName: "Dex", number: 12 } },
    teams: { york: { name: "York Lions", leagueId: "" }, sharks: { name: "Sharks", leagueId: "sunday" } },
    matches: {
      live: { managingTeamId: "york", status: "in_progress", date: torontoDay(0), homeTeamId: "york", homeScore: 7, awayScore: 0, liveHeartbeatAt: { toMillis: () => 1_700_000_000_000 } },
      stale: { managingTeamId: "york", status: "in_progress", date: "2020-01-01", homeTeamId: "york" },
      hidden: { managingTeamId: "york", status: "in_progress", date: torontoDay(0), isHidden: true },
      next: { homeTeamId: "sharks", awayTeamId: "jets", status: "scheduled", date: "2999-01-01", awayTeamName: "Jets" },
      final: { homeTeamId: "jets", awayTeamId: "sharks", status: "completed", date: "2020-01-02", homeScore: 6, awayScore: 13 },
    },
  };
  const snapshot = (id: string, data?: Record<string, unknown>) => ({
    id, exists: Boolean(data), data: () => data, get: (field: string) => data?.[field],
  });
  function query(name: string, filters: [string, string, unknown][] = []): unknown {
    return {
      where: (field: string, op: string, value: unknown) => query(name, [...filters, [field, op, value]]),
      select: () => query(name, filters),
      limit: () => query(name, filters),
      get: async () => ({
        docs: Object.entries(store[name] || {})
          .filter(([, data]) => filters.every(([field, op, value]) =>
            op === "array-contains" ? Array.isArray(data[field]) && (data[field] as unknown[]).includes(value) : data[field] === value))
          .map(([id, data]) => snapshot(id, data)),
        get size() { return this.docs.length; },
      }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdTokenMock.mockResolvedValue({ ...token, email });
    collectionMock.mockImplementation((name: string) => query(name));
    getAllMock.mockImplementation(async (...refs: { path: string }[]) =>
      refs.map(({ path }) => {
        const [collection, id] = path.split("/");
        return snapshot(id, store[collection]?.[id]);
      }));
  });

  it("groups roles per league and returns independent teams separately", async () => {
    const response = await POST(request({ action: "memberships" }));
    expect(response.status).toBe(200);
    const { data } = await response.json();

    const metro = data.leagues.find((league: { id: string }) => league.id === "metro");
    const sunday = data.leagues.find((league: { id: string }) => league.id === "sunday");
    expect(metro).toMatchObject({ name: "Metro Flag", visibility: "private", isCommissioner: true, teams: [] });
    expect(sunday).toMatchObject({ name: "Sunday Social", isCommissioner: false });
    expect(sunday.teams).toEqual([
      expect.objectContaining({
        id: "sharks",
        roles: ["player"],
        player: { id: "p1", name: "Dex", number: "12" },
        nextGame: expect.objectContaining({ id: "next", liveHeartbeatAt: null }),
        lastGame: expect.objectContaining({ id: "final", homeScore: 6, awayScore: 13 }),
      }),
    ]);
    expect(data.independentTeams).toEqual([
      expect.objectContaining({
        id: "york",
        roles: ["coach"],
        nextGame: expect.objectContaining({ id: "live", status: "in_progress", liveHeartbeatAt: 1_700_000_000_000 }),
      }),
    ]);
  });

  it("prefers the next scheduled game over a game paused days ago, but still surfaces paused games", async () => {
    store.matches.live.date = "2020-01-03";
    store.matches.upcoming = { managingTeamId: "york", status: "scheduled", date: "2999-02-01", homeTeamId: "york" };
    try {
      let { data } = await (await POST(request({ action: "memberships" }))).json();
      expect(data.independentTeams[0].nextGame).toMatchObject({ id: "upcoming" });

      delete store.matches.upcoming;
      ({ data } = await (await POST(request({ action: "memberships" }))).json());
      expect(data.independentTeams[0].nextGame).toMatchObject({ id: "live", status: "in_progress" });
    } finally {
      store.matches.live.date = torontoDay(0);
      delete store.matches.upcoming;
    }
  });

  it("mirrors league membership to league_access and reports newly opened private leagues", async () => {
    let access: Record<string, unknown> | undefined;
    documentGetMock.mockImplementation(async (path: string) => path === "league_access/user-1"
      ? { exists: Boolean(access), get: (field: string) => access?.[field] }
      : { exists: false, data: () => undefined, get: () => undefined });
    documentSetMock.mockImplementation(async (_path: string, data: Record<string, unknown>) => { access = data; });
    store.leagues.sunday.visibility = "private";
    try {
      let { data } = await (await POST(request({ action: "memberships" }))).json();
      expect(documentSetMock).toHaveBeenCalledWith("league_access/user-1", expect.objectContaining({ leagueIds: ["sunday"] }));
      expect(data.grantedLeagueIds).toEqual(["sunday"]);

      documentSetMock.mockClear();
      ({ data } = await (await POST(request({ action: "memberships" }))).json());
      expect(documentSetMock).not.toHaveBeenCalled();
      expect(data.grantedLeagueIds).toEqual([]);

      delete store.player_private.p1;
      ({ data } = await (await POST(request({ action: "memberships" }))).json());
      expect(access).toMatchObject({ leagueIds: [] });
    } finally {
      delete store.leagues.sunday.visibility;
      store.player_private.p1 = { email };
    }
  });

  it("rejects caller-supplied filters", async () => {
    const response = await POST(request({ action: "memberships", data: { email: "someone-else@example.com" } }));
    expect(response.status).toBe(400);
  });
});
