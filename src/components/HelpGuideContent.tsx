"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X, Compass, Map, Sparkles } from "lucide-react";
import { getHelpTopic } from "@/lib/helpContent";
import { getToolWalkthroughForRoute } from "@/lib/walkthroughData";
import WalkthroughModal, { WalkthroughViewMode } from "./walkthrough/WalkthroughModal";

export default function HelpGuideContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const topic = getHelpTopic(pathname);
  const walkthrough = getToolWalkthroughForRoute(pathname);

  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [walkthroughMode, setWalkthroughMode] = useState<WalkthroughViewMode>("tour");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !walkthroughOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, walkthroughOpen]);

  const handleStartWalkthrough = (mode: WalkthroughViewMode) => {
    setWalkthroughMode(mode);
    setWalkthroughOpen(true);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 bg-black/60"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${topic.title} help`}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-2xl bg-neutral-900 border border-white/10 text-white p-5 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">How this page works</p>
              <h2 className="text-lg font-black uppercase">{topic.title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close help guide"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Interactive Walkthrough Actions when available */}
          {walkthrough && (
            <div className="my-3 p-3 rounded-2xl bg-gradient-to-r from-cyan-500/15 to-amber-500/15 border border-cyan-500/30 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-cyan-300">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Interactive Learning Tools</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleStartWalkthrough("tour")}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black transition-all cursor-pointer shadow-md active:scale-95"
                >
                  <Compass className="w-4 h-4 stroke-[2.5]" />
                  <span>Guided Tour</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStartWalkthrough("map")}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition-all cursor-pointer shadow-md active:scale-95"
                >
                  <Map className="w-4 h-4 stroke-[2.5]" />
                  <span>Button Map</span>
                </button>
              </div>
            </div>
          )}

          <p className="text-sm text-neutral-300 mb-3">{topic.summary}</p>
          <ol className="space-y-2 mb-3">
            {topic.steps.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#3CA505] text-black text-xs font-black flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-neutral-200">{step}</span>
              </li>
            ))}
          </ol>
          {topic.tips && topic.tips.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Tips</p>
              <ul className="list-disc pl-4 space-y-1 text-xs text-neutral-300">
                {topic.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Walkthrough Modal */}
      {walkthrough && (
        <WalkthroughModal
          walkthrough={walkthrough}
          initialMode={walkthroughMode}
          isOpen={walkthroughOpen}
          onClose={() => setWalkthroughOpen(false)}
        />
      )}
    </>
  );
}
