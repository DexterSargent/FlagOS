"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Code, Navigation, Crosshair, Check, ChevronDown, ChevronUp } from "lucide-react";

interface ComponentInspection {
  name: string;
  file?: string;
  line?: number;
  rect: DOMRect;
}

function getFiberFromElement(element: Element | null): any {
  if (!element) return null;
  const key = Object.keys(element).find(
    (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$")
  );
  return key ? (element as any)[key] : null;
}

function findComponentInfo(target: Element | null): { name: string; file?: string; line?: number } | null {
  let curr: Element | null = target;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    let fiber = getFiberFromElement(curr);
    while (fiber) {
      if (fiber._debugSource?.fileName) {
        const typeName =
          typeof fiber.type === "string"
            ? fiber.type
            : fiber.type?.displayName || fiber.type?.name || "Component";
        return {
          name: typeName,
          file: fiber._debugSource.fileName,
          line: fiber._debugSource.lineNumber,
        };
      }

      if (typeof fiber.type === "function") {
        const name = fiber.type.displayName || fiber.type.name;
        if (
          name &&
          !["RootLayout", "ThemeProvider", "AuthProvider", "LeagueProvider", "AuthGuard", "DevIdeFollower"].includes(name)
        ) {
          return { name };
        }
      }
      fiber = fiber.return;
    }
    curr = curr.parentElement;
  }
  return null;
}

export default function DevIdeFollower() {
  const pathname = usePathname();

  // Only run in development
  const isDev = process.env.NODE_ENV === "development";

  const [autoFollow, setAutoFollow] = useState(true);
  const [inspectorActive, setInspectorActive] = useState(true);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [hoveredComponent, setHoveredComponent] = useState<ComponentInspection | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const prevPathnameRef = useRef<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const savedAuto = localStorage.getItem("flagos_dev_auto_route");
      if (savedAuto !== null) setAutoFollow(savedAuto === "true");

      const savedInsp = localStorage.getItem("flagos_dev_inspector");
      if (savedInsp !== null) setInspectorActive(savedInsp === "true");
    } catch {}
  }, []);

  const showStatus = useCallback((msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  const openTarget = useCallback(
    async (payload: { file?: string; component?: string; route?: string; line?: number }) => {
      try {
        const res = await fetch("/api/dev/open-in-editor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.ok) {
          const display = payload.component ? `<${payload.component}>` : data.file || "file";
          showStatus(`Focused ${display}`);
        }
      } catch (err) {
        console.warn("[DevIDE] Failed to open in IDE:", err);
      }
    },
    [showStatus]
  );

  // 1. Auto-Follow Route Navigation
  useEffect(() => {
    if (!isDev || !autoFollow || !pathname) return;
    if (prevPathnameRef.current === pathname) return;
    prevPathnameRef.current = pathname;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      openTarget({ route: pathname });
    }, 350);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [pathname, autoFollow, isDev, openTarget]);

  // 2. Option / Alt key tracker for component inspector
  useEffect(() => {
    if (!isDev || !inspectorActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt" || e.altKey) {
        setIsAltPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt" || !e.altKey) {
        setIsAltPressed(false);
        setHoveredComponent(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isDev, inspectorActive]);

  // 3. Hover and Click handling while Alt is pressed
  useEffect(() => {
    if (!isDev || !inspectorActive || !isAltPressed) {
      setHoveredComponent(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target || target.closest("#dev-ide-follower-ui")) {
        setHoveredComponent(null);
        return;
      }

      const info = findComponentInfo(target);
      if (info) {
        const rect = target.getBoundingClientRect();
        setHoveredComponent({
          ...info,
          rect,
        });
      } else {
        setHoveredComponent(null);
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!isAltPressed) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target || target.closest("#dev-ide-follower-ui")) return;

      e.preventDefault();
      e.stopPropagation();

      const info = findComponentInfo(target);
      if (info) {
        openTarget({
          file: info.file,
          component: info.name,
          line: info.line,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove, true);
    window.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove, true);
      window.removeEventListener("click", handleClick, true);
    };
  }, [isDev, inspectorActive, isAltPressed, openTarget]);

  if (!isDev) return null;

  return (
    <>
      {/* Component Highlighting Rect */}
      {isAltPressed && hoveredComponent && (
        <div
          className="fixed pointer-events-none z-[9999999] transition-all duration-75 border-2 border-emerald-500 bg-emerald-500/15 rounded-md shadow-[0_0_20px_rgba(16,185,129,0.4)]"
          style={{
            top: `${hoveredComponent.rect.top}px`,
            left: `${hoveredComponent.rect.left}px`,
            width: `${hoveredComponent.rect.width}px`,
            height: `${hoveredComponent.rect.height}px`,
          }}
        >
          <div
            className="absolute -top-7 left-0 px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-tight bg-emerald-600 text-white shadow-md flex items-center gap-1.5 whitespace-nowrap pointer-events-none"
          >
            <Crosshair className="w-3 h-3 animate-spin" />
            <span>&lt;{hoveredComponent.name}&gt;</span>
            <span className="text-emerald-200 text-[10px] font-normal opacity-90">
              (Click to open)
            </span>
          </div>
        </div>
      )}

      {/* Floating Status Toast */}
      {statusMessage && (
        <div className="fixed bottom-14 left-4 z-[9999999] flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 dark:bg-white/95 text-white dark:text-slate-950 text-xs font-medium shadow-xl border border-emerald-500/30 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Floating Control Badge */}
      <div
        id="dev-ide-follower-ui"
        className="fixed bottom-3 left-3 z-[9999998] font-sans text-xs select-none"
      >
        {!isExpanded ? (
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700/60 shadow-lg backdrop-blur-md transition cursor-pointer hover:border-emerald-500/50"
            title="IDE Auto-Follower & Component Inspector"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200 tracking-tight">VS Code Sync</span>
            <ChevronUp className="w-3 h-3 text-slate-400" />
          </button>
        ) : (
          <div className="w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 shadow-2xl text-slate-900 dark:text-white backdrop-blur-lg">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
              <div className="flex items-center gap-1.5">
                <Code className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-xs">VS Code Sync & Inspector</span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {/* Auto Follow Routes */}
              <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition">
                <div className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-blue-500" />
                  <div>
                    <div className="text-[11px] font-semibold">Auto-Follow Routes</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Pulls up page.tsx as you browse
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoFollow}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setAutoFollow(val);
                    localStorage.setItem("flagos_dev_auto_route", String(val));
                  }}
                  className="rounded text-emerald-600 focus:ring-0 cursor-pointer"
                />
              </label>

              {/* Option+Click Inspector */}
              <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5 text-emerald-500" />
                  <div>
                    <div className="text-[11px] font-semibold">Option + Click Inspector</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Hold Option &amp; click any UI element
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={inspectorActive}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setInspectorActive(val);
                    localStorage.setItem("flagos_dev_inspector", String(val));
                  }}
                  className="rounded text-emerald-600 focus:ring-0 cursor-pointer"
                />
              </label>

              {/* Quick Actions */}
              <div className="pt-1 flex gap-1.5">
                <button
                  onClick={() => openTarget({ route: pathname })}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition text-center cursor-pointer shadow-sm"
                >
                  Open Current Page
                </button>
              </div>

              <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center pt-1 border-t border-slate-100 dark:border-slate-800/60">
                Tip: Hold <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[9px]">Option</kbd> in browser to inspect
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

