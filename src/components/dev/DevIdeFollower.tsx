"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Code, Navigation, Crosshair, Check, ChevronDown, ChevronUp, Layers, Cpu } from "lucide-react";

interface ClickableTarget {
  element: HTMLElement;
  rect: DOMRect;
  name: string;
  href?: string;
  onClickText?: string;
  text?: string;
  ariaLabel?: string | null;
  dataTour?: string | null;
  id?: string;
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

function getComponentName(type: any): string | null {
  if (!type) return null;
  if (typeof type === "string") return null;
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

function extractElementDetails(element: HTMLElement, initialFiber: any) {
  let href = element.getAttribute("href") || undefined;
  let onClickText: string | null = null;
  let compName: string | null = null;

  // Check onClick in React fiber
  let currFiber = initialFiber;
  while (currFiber && !onClickText) {
    const fn = currFiber.memoizedProps?.onClick;
    if (fn) {
      if (typeof fn === "function") {
        onClickText = fn.name || null;
        if (!onClickText) {
          const fnStr = fn.toString();
          const match = fnStr.match(/(set[A-Z0-9_a-z]+|handle[A-Z0-9_a-z]+|[a-zA-Z0-9_]+Modal)/);
          if (match) onClickText = match[1];
        }
      }
    }
    if (!compName) {
      compName = getComponentName(currFiber.type);
    }
    currFiber = currFiber.return;
  }

  // Extract clean visible label
  const rawText = (element.innerText || element.textContent || "").split("\n")[0]?.trim() || "";
  const cleanText = rawText.slice(0, 40) || undefined;
  const ariaLabel = element.getAttribute("aria-label") || undefined;
  const dataTour = element.getAttribute("data-tour") || undefined;
  const id = element.id || undefined;

  const displayName =
    compName ||
    (element.tagName.toLowerCase() === "a" ? "Link" : element.tagName.toLowerCase());

  return {
    name: cleanText ? `${displayName} "${cleanText}"` : displayName,
    href,
    onClickText: onClickText || undefined,
    text: cleanText,
    ariaLabel,
    dataTour,
    id,
  };
}

/**
 * Searches up the DOM tree for a truly interactive/clickable element.
 * If the element is non-interactive (static div, paragraph, background, etc.), returns null.
 */
function findInteractiveTarget(target: Element | null): ClickableTarget | null {
  let curr: HTMLElement | null = target as HTMLElement;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    if (curr.closest("#dev-ide-follower-ui")) return null;

    const tag = curr.tagName.toLowerCase();
    const isInteractiveTag = ["button", "a", "input", "select", "textarea", "summary"].includes(tag);
    const role = curr.getAttribute("role");
    const isInteractiveRole = Boolean(
      role && ["button", "link", "checkbox", "switch", "tab", "menuitem", "radio"].includes(role)
    );

    let isPointer = false;
    try {
      isPointer = window.getComputedStyle(curr).cursor === "pointer";
    } catch {}

    const fiber = getFiberFromElement(curr);
    const hasFiberHandler = Boolean(
      fiber?.memoizedProps?.onClick ||
      fiber?.memoizedProps?.onChange ||
      fiber?.memoizedProps?.onSubmit
    );

    if (isInteractiveTag || isInteractiveRole || isPointer || hasFiberHandler) {
      const details = extractElementDetails(curr, fiber);
      const rect = curr.getBoundingClientRect();
      return {
        element: curr,
        rect,
        ...details,
      };
    }

    curr = curr.parentElement;
  }

  return null;
}

export default function DevIdeFollower() {
  const pathname = usePathname();
  const isDev = process.env.NODE_ENV === "development";

  const [autoFollow, setAutoFollow] = useState(true);
  const [inspectorActive, setInspectorActive] = useState(true);

  // Modifier states:
  // Ctrl: UI segment mode (Cyan)
  // Option/Alt: Logic / Backend mode (Amber)
  const [activeMode, setActiveMode] = useState<"ui" | "logic" | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<ClickableTarget | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const prevPathnameRef = useRef<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTargetRef = useRef<ClickableTarget | null>(null);

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
    async (payload: {
      mode: "ui" | "logic";
      component?: string;
      route?: string;
      href?: string;
      onClickText?: string;
      text?: string;
      ariaLabel?: string | null;
      dataTour?: string | null;
      id?: string;
    }) => {
      try {
        const res = await fetch("/api/dev/open-in-editor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.ok) {
          const modeTag = payload.mode === "logic" ? "Logic" : "UI";
          showStatus(`[${modeTag}] ${payload.text || payload.component || "element"} (line ${data.line || 1})`);
        } else {
          showStatus(`Could not locate ${payload.component || payload.route}`);
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
      openTarget({ mode: "ui", route: pathname });
    }, 350);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [pathname, autoFollow, isDev, openTarget]);

  // 2. Track modifier keys
  useEffect(() => {
    if (!isDev || !inspectorActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.key === "Alt") {
        setActiveMode("logic");
      } else if (e.ctrlKey || e.key === "Control") {
        setActiveMode("ui");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.altKey) {
        setActiveMode(null);
        setHoveredTarget(null);
      } else if (e.altKey) {
        setActiveMode("logic");
      } else if (e.ctrlKey) {
        setActiveMode("ui");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isDev, inspectorActive]);

  // 3. Mousemove & Click handler
  useEffect(() => {
    if (!isDev || !inspectorActive) return;

    const getModeFromEvent = (e: MouseEvent): "ui" | "logic" | null => {
      if (e.altKey) return "logic";
      if (e.ctrlKey) return "ui";
      return activeMode;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const mode = getModeFromEvent(e);
      if (!mode) {
        if (hoveredTarget) setHoveredTarget(null);
        return;
      }

      const target = document.elementFromPoint(e.clientX, e.clientY);
      const interactive = findInteractiveTarget(target);

      if (interactive) {
        lastTargetRef.current = interactive;
        setHoveredTarget(interactive);
      } else {
        setHoveredTarget(null);
      }
    };

    const triggerOpen = (e: MouseEvent) => {
      const mode = getModeFromEvent(e);
      if (!mode) return;

      const target = document.elementFromPoint(e.clientX, e.clientY);
      const interactive = findInteractiveTarget(target) || lastTargetRef.current;
      if (!interactive) return;

      e.preventDefault();
      e.stopPropagation();

      openTarget({
        mode,
        component: interactive.name,
        route: pathname,
        href: interactive.href,
        onClickText: interactive.onClickText,
        text: interactive.text,
        ariaLabel: interactive.ariaLabel,
        dataTour: interactive.dataTour,
        id: interactive.id,
      });
    };

    const handleClick = (e: MouseEvent) => {
      triggerOpen(e);
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (e.ctrlKey || e.altKey || activeMode) {
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
  }, [isDev, inspectorActive, activeMode, hoveredTarget, pathname, openTarget]);

  if (!isDev) return null;

  return (
    <>
      {/* Component Highlighting Rect (ONLY displays when hovering over a valid clickable element) */}
      {activeMode && hoveredTarget && (
        <div
          className={`fixed pointer-events-none z-[9999999] transition-all duration-75 border-2 rounded-md ${
            activeMode === "logic"
              ? "border-amber-400 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
              : "border-cyan-400 bg-cyan-500/15 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
          }`}
          style={{
            top: `${hoveredTarget.rect.top}px`,
            left: `${hoveredTarget.rect.left}px`,
            width: `${hoveredTarget.rect.width}px`,
            height: `${hoveredTarget.rect.height}px`,
          }}
        >
          <div
            className={`absolute -top-7 left-0 px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-tight text-white shadow-md flex items-center gap-1.5 whitespace-nowrap pointer-events-none ${
              activeMode === "logic" ? "bg-amber-600" : "bg-cyan-600"
            }`}
          >
            {activeMode === "logic" ? (
              <Cpu className="w-3 h-3 animate-pulse" />
            ) : (
              <Layers className="w-3 h-3 animate-pulse" />
            )}
            <span>{hoveredTarget.name}</span>
            <span className="opacity-80 text-[10px] font-normal">
              ({activeMode === "logic" ? "Option+Click for Logic" : "Ctrl+Click for UI"})
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

              {/* Inspector active toggle */}
              <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5 text-emerald-500" />
                  <div>
                    <div className="text-[11px] font-semibold">Dual Inspector</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Ctrl (UI) / Option (Logic)
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
                  onClick={() => openTarget({ mode: "ui", route: pathname })}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition text-center cursor-pointer shadow-sm"
                >
                  Open Current Page
                </button>
              </div>

              <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center pt-1 border-t border-slate-100 dark:border-slate-800/60 space-y-0.5">
                <div><kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[9px]">Ctrl</kbd> + click &rarr; <strong>UI / JSX Segment</strong></div>
                <div><kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[9px]">Option</kbd> + click &rarr; <strong>Backend / Logic Segment</strong></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
