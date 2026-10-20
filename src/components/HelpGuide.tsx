"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle, X } from "lucide-react";
import { getHelpTopic } from "@/lib/helpContent";

export default function HelpGuide() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const topic = getHelpTopic(pathname);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const compactHost = Boolean(pathname?.includes("/play-by-play") || pathname?.endsWith("/playbook"));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open help guide"
        className={`fixed left-3 bottom-3 z-40 items-center justify-center w-10 h-10 rounded-full bg-[#3CA505] text-black shadow-lg hover:brightness-110 transition ${
          compactHost ? "hidden md:flex" : "flex"
        }`}
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <HelpCircle className="w-5 h-5" />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 bg-black/60"
          onClick={() => setOpen(false)}
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
                onClick={() => setOpen(false)}
                aria-label="Close help guide"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
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
      )}
    </>
  );
}
