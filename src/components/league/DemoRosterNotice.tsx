"use client";

import { useDemoSandbox } from "@/lib/useDemoSandbox";

export default function DemoRosterNotice() {
  const { sandbox, error } = useDemoSandbox(true);
  if (error) return <p role="alert" className="relative z-10 px-4 py-3 text-sm text-red-500">Could not load demo roster source information.</p>;
  if (!sandbox) return null;
  const source = sandbox.getSandboxRosterSource();
  return (
    <aside aria-label="Demo roster source" className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 text-xs leading-relaxed text-slate-600 dark:text-neutral-400">
      {source ? (
        <p>
          {source.season} NFL roster selection from{" "}
          <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="underline text-cyan-600 dark:text-cyan-400">nflverse</a>
          {" "}(snapshot {source.sourceUpdatedAt.slice(0, 10)}). Nine players per team at session start; flag-football scores and stats are simulated.
        </p>
      ) : (
        <p>This demo session uses an older roster. Use Reset Session to load the latest NFL selection; this clears your demo edits.</p>
      )}
      <p>Daily roster refresh checks apply to new sessions. Existing sessions stay unchanged until reset. Not affiliated with the NFL.</p>
    </aside>
  );
}
