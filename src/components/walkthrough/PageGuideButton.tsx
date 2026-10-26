"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";
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
        title={`Get help with ${walkthrough.toolName}`}
        className={`inline-flex items-center justify-center gap-1.5 h-11 min-w-11 px-2 sm:px-2.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-all shadow-sm border bg-blue-500/10 hover:bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30 ${className}`}
      >
        <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className={labelClassName}>Guide</span>
      </button>
      <WalkthroughModal walkthrough={walkthrough} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
