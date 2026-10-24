"use client";

import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from "react";
import type { ToolWalkthrough } from "@/lib/walkthroughData";

interface GuideEntry {
  key: string;
  walkthrough: ToolWalkthrough;
  priority: number;
}

interface PageGuideContextValue {
  active: ToolWalkthrough | null;
  register: (entry: GuideEntry) => void;
  unregister: (key: string) => void;
}

const PageGuideContext = createContext<PageGuideContextValue | null>(null);

/** Holds the guided tour for the current screen so the header Guide button always sits in the same spot. */
export function PageGuideProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<GuideEntry[]>([]);

  const register = useCallback((entry: GuideEntry) => {
    setEntries((prev) => [...prev.filter((e) => e.key !== entry.key), entry]);
  }, []);
  const unregister = useCallback((key: string) => {
    setEntries((prev) => prev.filter((e) => e.key !== key));
  }, []);

  const active = useMemo(() => {
    let best: GuideEntry | null = null;
    for (const e of entries) if (!best || e.priority >= best.priority) best = e;
    return best?.walkthrough ?? null;
  }, [entries]);

  const value = useMemo(() => ({ active, register, unregister }), [active, register, unregister]);
  return <PageGuideContext.Provider value={value}>{children}</PageGuideContext.Provider>;
}

/**
 * Registers this screen's tour with the header Guide button. Higher priority wins, so a
 * nested tool (e.g. the play designer) can override its page's tour while it's mounted.
 */
export function usePageGuide(walkthrough: ToolWalkthrough | null | undefined, priority = 0) {
  const ctx = useContext(PageGuideContext);
  const key = useId();
  const register = ctx?.register;
  const unregister = ctx?.unregister;

  useEffect(() => {
    if (!register || !unregister || !walkthrough) return;
    register({ key, walkthrough, priority });
    return () => unregister(key);
  }, [register, unregister, key, walkthrough, priority]);
}

export function useActivePageGuide(): ToolWalkthrough | null {
  return useContext(PageGuideContext)?.active ?? null;
}
