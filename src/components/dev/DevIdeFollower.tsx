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
    (k) =>
      k.startsWith("__reactFiber$") ||
      k.startsWith("__reactInternalInstance$") ||
      k.startsWith("__reactContainer$")
  );
  return key ? (element as any)[key] : null;
}

function parseStackForLocation(stackStr: unknown): { file?: string; line?: number } | null {
  if (typeof stackStr !== "string") return null;
  const match = stackStr.match(
    /(?:at\s+.*?\s+\()?((\/(?:[^\s\):]+)(?:\.tsx|\.ts|\.jsx|\.js))(?::(\d+))?)/i
  );
  if (match) {
    return {
      file: match[2],
      line: match[3] ? parseInt(match[3], 10) : undefined,
    };
  }
  return null;
}

function getComponentName(type: any): string | null {
  if (!type) return null;
  if (typeof type === "string") return null; // DOM tag like 'div'
  if (typeof type === "function") return type.displayName || type.name || null;
  if (typeof type === "object") {
    return (
      type.displayName ||
      type.name ||
      type.render?.displayName ||
      type.render?.name ||
      type.type?.displayName ||
      type.type?.name ||
      null
    );
  }
  return null;
}

const IGNORED_NAMES = new Set([
  "RootLayout",
  "ThemeProvider",
  "AuthProvider",
  "LeagueProvider",
  "AuthGuard",
  "DevIdeFollower",
  "Fragment",
]);

function findComponentInfo(target: Element | null): { name: string; file?: string; line?: number } | null {
  let curr: Element | null = target;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    let fiber = getFiberFromElement(curr);
    while (fiber) {
      const name = getComponentName(fiber.type) || getComponentName(fiber.elementType);

      // 1. Direct debugSource (Babel / SWC dev transform)
      if (fiber._debugSource?.fileName) {
        const compName = name || "Component";
        if (!IGNORED_NAMES.has(compName)) {
          return {
            name: compName,
            file: fiber._debugSource.fileName,
            line: fiber._debugSource.lineNumber,
          };
        }
      }

      // 2. React 19 _debugStack
      if (fiber._debugStack) {
        const stackLoc = parseStackForLocation(
          typeof fiber._debugStack === "string" ? fiber._debugStack : fiber._debugStack.stack
        );
        const compName = name || "Component";
        if (stackLoc?.file && !IGNORED_NAMES.has(compName)) {
          return {
            name: compName,
            file: stackLoc.file,
            line: stackLoc.line,
          };
        }
      }

      // 3. Matched custom component by function/class name
      if (name && !IGNORED_NAMES.has(name)) {
        return { name };
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
  const [isModifierDown, setIsModifierDown] = useState(false);
  const [hoveredComponent, setHoveredComponent] = useState<ComponentInspection | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const prevPathnameRef = useRef<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTargetRef = useRef<{ file?: string; name: string; line?: number } | null>(null);

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
          showStatus(`Focused ${display} in VS Code`);
        } else {
          showStatus(`Could not find ${payload.component || payload.route}`);
        }
      } catch (err) {
        console.warn("[DevIDE] Failed to open in VS Code:", err);
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

  // 2. Track modifier keys (Control or Alt/Option on Mac)
  useEffect(() => {
    if (!isDev || !inspectorActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Alt" || e.ctrlKey || e.altKey) {
        setIsModifierDown(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.altKey && (e.key === "Control" || e.key === "Alt")) {
        setIsModifierDown(false);
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

  // 3. Inspect on mouse move & handle click / contextmenu (Mac Ctrl+Click)
  useEffect(() => {
    if (!isDev || !inspectorActive) return;

    const isTrigger = (e: MouseEvent) => Boolean(e.ctrlKey || e.altKey || isModifierDown);

    const handleMouseMove = (e: MouseEvent) => {
      if (!isTrigger(e)) {
        if (hoveredComponent) setHoveredComponent(null);
        return;
      }

      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target || target.closest("#dev-ide-follower-ui")) {
        setHoveredComponent(null);
        return;
      }

      const info = findComponentInfo(target);
      if (info) {
        const rect = target.getBoundingClientRect();
        lastTargetRef.current = info;
        setHoveredComponent({
          ...info,
          rect,
        });
      } else {
        setHoveredComponent(null);
      }
    };

    const triggerOpen = (e: MouseEvent) => {
      if (!isTrigger(e)) return;

      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target || target.closest("#dev-ide-follower-ui")) return;

      e.preventDefault();
      e.stopPropagation();

      const info = findComponentInfo(target) || lastTargetRef.current;
      if (info) {
        openTarget({
          file: info.file,
          component: info.name,
          line: info.line,
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      triggerOpen(e);
    };

    // On macOS, Ctrl+Click fires a contextmenu event. We must intercept it to prevent the context menu
    // and jump directly to the component.
    const handleContextMenu = (e: MouseEvent) => {
      if (e.ctrlKey || e.altKey || isModifierDown) {
        e.preventDefault();
        e.stopPropagation();
        triggerOpen(e);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, true);
    window.addEventListener("click", handleClick, true);
    window.addEventListener("contextmenu", handleContextMenu, true);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove, true);
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("contextmenu", handleContextMenu, true);
    };
  }, [isDev, inspectorActive, isModifierDown, hoveredComponent, openTarget]);

  if (!isDev) return null;

  const showHighlight = (isModifierDown || hoveredComponent) && hoveredComponent;

  return (
    <>
      {/* Component Highlighting Rect */}
      {showHighlight && (
        <div
          className="fixed pointer-events-none z-[9999999] transition-all duration-75 border-2 border-emerald-500 bg-emerald-500/15 rounded-md shadow-[0_0_20px_rgba(16,185,129,0.4)]"
          style={{
            top: `${hoveredComponent.rect.top}px`,
            left: `${hoveredComponent.rect.left}px`,
            width: `${hoveredComponent.rect.width}px`,
            height: `${hoveredComponent.rect.height}px`,
          }}
        >
          <div className="absolute -top-7 left-0 px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-tight bg-emerald-600 text-white shadow-md flex items-center gap-1.5 whitespace-nowrap pointer-events-none">
            <Crosshair className="w-3 h-3 animate-spin" />
            <span>&lt;{hoveredComponent.name}&gt;</span>
            <span className="text-emerald-200 text-[10px] font-normal opacity-90">
              (Click to open in VS Code)
            </span>
          </div>
        </div>
      )}

      {/* Floating Status Toast */}
      {statusMessage && (
        <div className="fixed bottom-14 left-4 z-[9999999] flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-950 text-xs font-semibold shadow-2xl border border-emerald-500/40 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/85 hover:bg-slate-900 text-white border border-slate-700/60 shadow-lg backdrop-blur-md transition cursor-pointer hover:border-emerald-500/50"
            title="VS Code Auto-Follower & Component Inspector"
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

              {/* Ctrl/Option Click Inspector */}
              <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5 text-emerald-500" />
                  <div>
                    <div className="text-[11px] font-semibold">Ctrl + Click Inspector</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Hold Ctrl or Option &amp; click any UI element
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
                Hold <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[9px]">Ctrl</kbd> or <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[9px]">Option</kbd> and click any element
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
