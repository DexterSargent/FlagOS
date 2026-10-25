"use client";

import { FlaskConical } from "lucide-react";

export const DEMO_NOTICE_TEXT = "Demo · nothing is saved or charged";

/** Thin reminder shown on demo screens that don't have the role switcher bar. */
export default function DemoNoticeStrip({ className = "" }: { className?: string }) {
  return (
    <div
      role="note"
      data-testid="demo-notice-strip"
      className={`flex shrink-0 items-center justify-center gap-1.5 border-b border-amber-500/30 bg-amber-500/15 px-3 py-1 text-center text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 ${className}`}
    >
      <FlaskConical className="h-3 w-3" aria-hidden="true" />
      {DEMO_NOTICE_TEXT}
    </div>
  );
}
