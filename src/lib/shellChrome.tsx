"use client";

import { createContext, useContext, useEffect } from "react";

type ShellChromeContextValue = {
  setSuppressLeagueNav: (suppress: boolean) => void;
};

export const ShellChromeContext = createContext<ShellChromeContextValue>({
  setSuppressLeagueNav: () => {},
});

/**
 * Lets a page that lives on a league-style route (e.g. /matches/{id}) opt out of the league
 * header/footer when its content isn't league-scoped, such as an independent team's game.
 */
export function useSuppressLeagueNav(suppress: boolean) {
  const { setSuppressLeagueNav } = useContext(ShellChromeContext);
  useEffect(() => {
    setSuppressLeagueNav(suppress);
    return () => setSuppressLeagueNav(false);
  }, [suppress, setSuppressLeagueNav]);
}
