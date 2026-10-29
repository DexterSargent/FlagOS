"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, ArrowRight, X } from "lucide-react";

export function isPathAllowedForFeature(targetPathname: string, currentPathname: string): boolean {
  if (!targetPathname) return true;
  const normTarget = targetPathname.replace(/\/+$/, "") || "/";
  const normCurrent = currentPathname.replace(/\/+$/, "") || "/";

  // Exact match is always allowed
  if (normTarget === normCurrent) return true;

  // Play-by-play wizard: allow same match play-by-play sub-paths or query changes
  if (normCurrent.includes("/play-by-play")) {
    return normTarget === normCurrent || normTarget.endsWith("/play-by-play");
  }

  // Playbook studio: allow same team playbook sub-paths
  if (normCurrent.includes("/playbook")) {
    return normTarget === normCurrent;
  }

  // Schedule view: allow schedule
  if (normCurrent === "/schedule") {
    return normTarget === "/schedule";
  }

  // League view: allow same league
  if (normCurrent.startsWith("/league/")) {
    return normTarget === normCurrent;
  }

  return normTarget === normCurrent;
}

export default function InteractiveDemoGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [isBarredModalOpen, setIsBarredModalOpen] = useState(false);
  const initialPathRef = useRef<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const isEmbed = (
        (window.self !== window.top && window.location.search.includes("embed=true")) ||
        sp.get("embed") === "true"
      );
      setIsEmbedded(isEmbed);
      if (isEmbed && pathname) {
        if (!initialPathRef.current) {
          initialPathRef.current = pathname;
        }
      }
    }
  }, [pathname]);

  useEffect(() => {
    if (!isEmbedded || typeof window === "undefined") return;

    const initialPath = initialPathRef.current || pathname || window.location.pathname;

    // 1. Intercept all link clicks in capture phase before Next.js or browser navigation
    const handleDocumentClick = (e: MouseEvent) => {
      const targetAnchor = (e.target as HTMLElement)?.closest("a");
      if (!targetAnchor) return;

      const href = targetAnchor.getAttribute("href");
      if (!href || href === "#" || href.startsWith("#") || href.startsWith("javascript:")) {
        return;
      }

      if (targetAnchor.getAttribute("target") === "_blank") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setIsBarredModalOpen(true);
        return;
      }

      try {
        const targetUrl = new URL(href, window.location.href);
        if (!isPathAllowedForFeature(targetUrl.pathname, initialPath)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          setIsBarredModalOpen(true);
        }
      } catch {
        e.preventDefault();
        e.stopPropagation();
        setIsBarredModalOpen(true);
      }
    };

    // 2. Intercept programmatic navigation via history.pushState / history.replaceState
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args: [data: unknown, unused: string, url?: string | URL | null]) {
      const url = args[2];
      if (url) {
        try {
          const targetUrl = new URL(url.toString(), window.location.href);
          if (!isPathAllowedForFeature(targetUrl.pathname, initialPath)) {
            setIsBarredModalOpen(true);
            return;
          }
        } catch {}
      }
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function (...args: [data: unknown, unused: string, url?: string | URL | null]) {
      const url = args[2];
      if (url) {
        try {
          const targetUrl = new URL(url.toString(), window.location.href);
          if (!isPathAllowedForFeature(targetUrl.pathname, initialPath)) {
            setIsBarredModalOpen(true);
            return;
          }
        } catch {}
      }
      return originalReplaceState.apply(this, args);
    };

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [isEmbedded, pathname]);

  useEffect(() => {
    if (!isBarredModalOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsBarredModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isBarredModalOpen]);

  if (!isEmbedded || !isBarredModalOpen) {
    return null;
  }

  const handleLaunchFullDemo = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const target = `${origin}/league/default?demo=true`;
    try {
      if (typeof window !== "undefined" && window.top && window.top !== window.self) {
        window.top.location.href = target;
        return;
      }
    } catch {}
    router.push("/league/default?demo=true");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-barred-title"
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-neutral-950/95 border border-cyan-500/30 p-6 sm:p-8 shadow-[0_0_60px_rgba(6,182,212,0.25)] text-center text-white overflow-hidden">
        {/* Glowing backdrop halo */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => setIsBarredModalOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
          <Sparkles className="w-7 h-7 text-cyan-400" />
        </div>

        {/* Badge */}
        <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-300 mb-3">
          Interactive Demo Preview
        </div>

        {/* Title */}
        <h3
          id="demo-barred-title"
          className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mb-3"
        >
          Explore the Full Demo League
        </h3>

        {/* Required Message Text */}
        <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-md mx-auto mb-6">
          To immerse yourself completely please feel free to explore our demo league. Be aware that nothing will be saved, if you refresh the page the data you have altered will reset.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleLaunchFullDemo}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Explore Demo League</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>

          <button
            onClick={() => setIsBarredModalOpen(false)}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-bold text-xs uppercase tracking-wider border border-white/10 transition-all cursor-pointer"
          >
            Stay in Preview
          </button>
        </div>
      </div>
    </div>
  );
}
