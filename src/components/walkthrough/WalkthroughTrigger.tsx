"use client";

import React, { useState } from "react";
import { Compass, Map, HelpCircle, ChevronDown, Sparkles } from "lucide-react";
import { ToolWalkthrough } from "@/lib/walkthroughData";
import WalkthroughModal, { WalkthroughViewMode } from "./WalkthroughModal";

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
  const [mode, setMode] = useState<WalkthroughViewMode>("tour");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLaunch = (viewMode: WalkthroughViewMode) => {
    setMode(viewMode);
    setIsOpen(true);
    setIsMenuOpen(false);
  };

  return (
    <>
      <div className={`relative inline-block ${className}`}>
        {variant === "icon" ? (
          <button
            type="button"
            onClick={() => handleLaunch("tour")}
            aria-label={`Open ${walkthrough.toolName} guide`}
            title={`Open ${walkthrough.toolName} walkthrough`}
            className="p-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <Compass className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center">
            {/* Primary Launch Button */}
            <button
              type="button"
              onClick={() => handleLaunch("tour")}
              title={`Launch ${walkthrough.toolName} interactive walkthrough`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-l-xl text-xs font-black transition-all cursor-pointer border-y border-l ${
                variant === "header"
                  ? "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40 shadow-sm"
                  : "bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border-white/10"
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline">Guide &amp; Tour</span>
              <span className="sm:hidden">Guide</span>
            </button>

            {/* Quick Option Dropdown Trigger */}
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="More walkthrough options"
              className={`px-1.5 py-1.5 rounded-r-xl border text-xs font-bold transition-all cursor-pointer ${
                variant === "header"
                  ? "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40"
                  : "bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border-white/10"
              }`}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div
            className="absolute right-0 top-full mt-1.5 w-60 bg-neutral-900 border border-white/15 rounded-2xl p-2 shadow-2xl z-50 space-y-1 text-white animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-2.5 py-1 border-b border-white/10 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
                {walkthrough.toolName}
              </span>
              <span className="text-xs text-neutral-300 font-semibold block">
                Choose Help Format
              </span>
            </div>

            {/* Step-by-Step Tour */}
            <button
              type="button"
              onClick={() => handleLaunch("tour")}
              className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-cyan-500/15 text-left transition-colors cursor-pointer group"
            >
              <Compass className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <div className="text-xs font-black text-white group-hover:text-cyan-300">
                  Step-by-Step Tour
                </div>
                <div className="text-[11px] text-neutral-400">
                  Click through key tools one by one with a spotlight
                </div>
              </div>
            </button>

            {/* Translucent Button Map HUD */}
            <button
              type="button"
              onClick={() => handleLaunch("map")}
              className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-amber-500/15 text-left transition-colors cursor-pointer group"
            >
              <Map className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <div className="text-xs font-black text-white group-hover:text-amber-300">
                  Translucent Button Map
                </div>
                <div className="text-[11px] text-neutral-400">
                  Instant overlay showing what all buttons do
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Actual Walkthrough Engine Modal */}
      <WalkthroughModal
        walkthrough={walkthrough}
        initialMode={mode}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
