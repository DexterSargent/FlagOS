"use client";

import React, { useState } from "react";
import { Compass } from "lucide-react";
import { useActivePageGuide } from "@/lib/pageGuide";
import WalkthroughModal from "./WalkthroughModal";

/** The one Guide button, rendered in the same header spot (left of the theme toggle) on every page. */
export default function PageGuideButton({
  className = "",
  labelClassName = "hidden sm:inline",
}: {
  className?: string;
  labelClassName?: string;
}) {
  const walkthrough = useActivePageGuide();
  const [isOpen, setIsOpen] = useState(false);

  if (!walkthrough) return null;

  return (
    <>
      <button
        type="button"
        data-testid="page-guide-button"
        onClick={() => setIsOpen(true)}
        aria-label={`Open ${walkthrough.toolName} guided tour`}
        title={`Walk through every button on this ${walkthrough.toolName} screen`}
        className={`inline-flex items-center justify-center gap-1.5 h-8 min-w-8 px-2 sm:px-2.5 rounded-xl text-xs font-black shrink-0 cursor-pointer transition-all shadow-sm border bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border-cyan-500/40 ${className}`}
      >
        <Compass className="w-4 h-4 shrink-0 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
        <span className={labelClassName}>Guide</span>
      </button>
      <WalkthroughModal walkthrough={walkthrough} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
