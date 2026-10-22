"use client";

import { useSyncExternalStore } from "react";

const EMBED_QUERY = 1;
const IN_IFRAME = 2;
const DEMO_FLAG = 4;
const PLAYBOOK_PATH = 8;

function noopSubscribe() {
  return () => {};
}

function readEmbedBits(): number {
  let bits = 0;
  try {
    const search = window.location.search;
    if (new URLSearchParams(search).get("embed") === "true" || search.includes("embed=true")) bits |= EMBED_QUERY;
    if (window.self !== window.top) bits |= IN_IFRAME;
    if (window.location.pathname.includes("/playbook")) bits |= PLAYBOOK_PATH;
    if (
      search.includes("demo=true") ||
      sessionStorage.getItem("flagos_demo_active") === "true" ||
      localStorage.getItem("flagos_demo_active") === "true"
    ) bits |= DEMO_FLAG;
  } catch {
    // Cross-origin frame access or blocked storage: treat as not embedded/demo.
  }
  return bits;
}

/**
 * Hydration-safe view of the browser's embed/demo flags. The server snapshot is
 * always "not embedded", so server HTML matches the first client render and the
 * real values are applied immediately after hydration.
 */
export function useEmbedState() {
  const bits = useSyncExternalStore(noopSubscribe, readEmbedBits, () => 0);
  return {
    embedQuery: (bits & EMBED_QUERY) !== 0,
    inIframe: (bits & IN_IFRAME) !== 0,
    demoFlag: (bits & DEMO_FLAG) !== 0,
    playbookPath: (bits & PLAYBOOK_PATH) !== 0,
  };
}
