"use client";

import React, { useState } from "react";
import { Compass } from "lucide-react";
import { ToolWalkthrough } from "@/lib/walkthroughData";
import WalkthroughModal from "./WalkthroughModal";

interface WalkthroughTriggerProps {
  walkthrough: ToolWalkthrough;
  variant?: "toolbar" | "header" | "pill" | "icon";
  className?: string;
}

export default function WalkthroughTrigger({
  walkthrough,
  variant = "toolbar",
  className = "",
}: WalkthroughTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className={`relative inline-block ${className}`}>
        {variant === "icon" ? (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label={`Open ${walkthrough.toolName} guide`}
            title={`Open ${walkthrough.toolName} walkthrough`}
            className="p-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <Compass className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label={`Open ${walkthrough.toolName} guided tour`}
            title={`Walk through every button on this ${walkthrough.toolName} screen`}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
              variant === "header"
                ? "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40 shadow-sm"
                : "bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border-white/10"
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="hidden sm:inline">Guided Tour</span>
            <span className="sm:hidden">Guide</span>
          </button>
        )}
      </div>

      <WalkthroughModal walkthrough={walkthrough} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
