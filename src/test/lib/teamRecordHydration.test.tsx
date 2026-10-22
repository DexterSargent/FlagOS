import React, { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase", () => ({ db: {}, auth: {} }));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(() => new Promise(() => {})),
}));

import { useTeamRecord } from "@/lib/teamRecord";

function Probe() {
  const { team } = useTeamRecord("cached_team");
  return <h1>{team?.name ?? "Loading"}</h1>;
}

describe("useTeamRecord hydration", () => {
  afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = "";
  });

  it("matches server markup during hydration, then paints the cached team", async () => {
    const serverHtml = renderToString(<Probe />);
    expect(serverHtml).toContain("Loading");

    localStorage.setItem("flagos_team_record_cached_team", JSON.stringify({ id: "cached_team", name: "Cached Lions" }));
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.appendChild(container);

    const recoverableErrors: unknown[] = [];
    await act(async () => {
      hydrateRoot(container, <Probe />, { onRecoverableError: (error) => recoverableErrors.push(error) });
    });

    expect(recoverableErrors).toEqual([]);
    expect(container.textContent).toBe("Cached Lions");
  });
});
