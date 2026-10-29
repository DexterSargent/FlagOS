"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Code, Navigation, Crosshair, Check, ChevronDown, ChevronUp, Layers, Cpu } from "lucide-react";

interface ClickableTarget {
  element: HTMLElement;
  rect: DOMRect;
  name: string;
  tag: string;
  file?: string;
  component?: string;
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

/**
 * Searches the DOM and React Fiber tree to see if the element is genuinely clickable.
 * Returns the exact interactive container element (button, link, input, or onClick holder).
 * If the element is purely static (header, non-interactive div, static text), returns null.
 */
function findInteractiveTarget(rawTarget: Element | null): ClickableTarget | null {
  if (!rawTarget || !(rawTarget instanceof HTMLElement)) return null;
  if (rawTarget.closest("#dev-ide-follower-ui")) return null;

  // 1. Check for standard clickable DOM containers
  const interactiveAncestor = rawTarget.closest(
    'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="switch"], [role="checkbox"]'
  ) as HTMLElement | null;

  // 2. Check for elements with explicit onClick (in React Fiber or HTML attribute)
  let clickHandlerElement: HTMLElement | null = null;
  let curr: HTMLElement | null = rawTarget;
  let depth = 0;
  while (curr && curr !== document.body && depth < 4) {
    const fiber = getFiberFromElement(curr);
    if (fiber?.memoizedProps?.onClick || curr.hasAttribute("onclick")) {
      clickHandlerElement = curr;
      break;
    }
    curr = curr.parentElement;
    depth++;
  }

  // If neither exists, this element CANNOT be clicked — do NOT highlight it!
  const el = interactiveAncestor || clickHandlerElement;
  if (!el) return null;

  // Extract core properties from the interactive element
  const tag = el.tagName.toLowerCase();
  const rawHref = el.getAttribute("href") || (el as any).href || rawTarget.getAttribute("href");
  const href = typeof rawHref === "string" ? rawHref : undefined;
  const dataTour = el.getAttribute("data-tour") || rawTarget.getAttribute("data-tour") || undefined;
  const ariaLabel = el.getAttribute("aria-label") || rawTarget.getAttribute("aria-label") || undefined;
  const id = el.id || rawTarget.id || undefined;

  // Distinct visible label
  const rawText = (el.innerText || rawTarget.innerText || el.textContent || "")
    .split("\n")[0]
    ?.trim() || "";
  const cleanText = rawText.slice(0, 45) || undefined;

  // Analyze React Fiber for handlers, component name, and source file
  let onClickText: string | undefined = undefined;
  let compName: string | undefined = undefined;
  let sourceFile: string | undefined = undefined;

  let fiber = getFiberFromElement(el) || getFiberFromElement(rawTarget);
  let fiberSteps = 0;
  while (fiber && fiberSteps < 15) {
    // A. Detect onClick handler or state setter
    if (!onClickText) {
      const fn = fiber.memoizedProps?.onClick;
      if (typeof fn === "function") {
        if (fn.name && fn.name !== "onClick" && !fn.name.startsWith("bound ")) {
          onClickText = fn.name;
        } else {
          const fnStr = fn.toString();
          const match = fnStr.match(/(set[A-Z0-9_a-z]+|handle[A-Z0-9_a-z]+|[a-zA-Z0-9_]+Modal)/);
          if (match) onClickText = match[1];
        }
      }
    }

    // B. Detect nearest custom React Component name
    if (!compName) {
      const name = getComponentName(fiber.type);
      if (name && name !== "Link" && name !== "NextLink") {
        compName = name;
      }
    }

    // C. Detect Turbopack / Next.js source chunk
    if (!sourceFile && fiber._debugStack) {
      const stackStr = String(fiber._debugStack);
      const chunkMatch = stackStr.match(/(src_[a-zA-Z0-9_%]+_(?:tsx|ts|jsx|js))/i);
      if (chunkMatch) {
        sourceFile = decodeURIComponent(chunkMatch[1]);
      }
    }

    fiber = fiber.return;
    fiberSteps++;
  }

  const baseDisplay = compName || (tag === "a" ? "Link" : tag);
  const name = cleanText ? `<${baseDisplay}> "${cleanText}"` : `<${baseDisplay}>`;

  return {
    element: el,
    rect: el.getBoundingClientRect(),
    name,
    tag,
    file: sourceFile,
    component: compName,
    href,
    onClickText,
    text: cleanText,
    ariaLabel,
    dataTour,
    id,
  };
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

  const handleToggleAuto = () => {
    const next = !autoFollow;
    setAutoFollow(next);
    try {
      localStorage.setItem("flagos_dev_auto_route", String(next));
    } catch {}
  };

  const handleToggleInspector = () => {
    const next = !inspectorActive;
    setInspectorActive(next);
    try {
      localStorage.setItem("flagos_dev_inspector", String(next));
    } catch {}
  };

  const showStatus = useCallback((msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage((current) => (current === msg ? null : current));
    }, 3500);
  }, []);

  // Dispatch open request to our API endpoint
  const openTarget = useCallback(
    async (payload: {
      mode: "ui" | "logic";
      file?: string;
      component?: string;
      route?: string;
      href?: string;
      onClickText?: string;
      text?: string;
      ariaLabel?: string | null;
      dataTour?: string | null;
      id?: string;
      tag?: string;
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
          showStatus(`[${modeTag}] ${payload.text || payload.component || payload.tag || "element"} (line ${data.line || 1})`);
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
        file: interactive.file,
        component: interactive.component,
        route: pathname,
        href: interactive.href,
        onClickText: interactive.onClickText,
        text: interactive.text,
        ariaLabel: interactive.ariaLabel,
        dataTour: interactive.dataTour,
        id: interactive.id,
        tag: interactive.tag,
      });
    };

    const handleClick = (e: MouseEvent) => {
      triggerOpen(e);
    };

    // Mac Ctrl+Click emits a contextmenu event
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

      {/* Floating Status Notification */}
      {statusMessage && (
        <div className="fixed bottom-16 right-5 z-[9999999] px-3.5 py-2 bg-slate-950/90 text-white rounded-xl shadow-2xl border border-white/10 backdrop-blur-md flex items-center gap-2.5 text-xs font-mono animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Dev Control Dock */}
      <div id="dev-ide-follower-ui" className="fixed bottom-4 right-4 z-[999999] select-none font-sans">
        <div className="flex flex-col items-end">
          {isExpanded && (
            <div className="mb-2 p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 w-72 space-y-2.5 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-2 font-semibold text-[13px]">
                  <Code className="w-4 h-4 text-emerald-500" />
                  <span>Dev IDE Follower</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                  VS Code Split
                </span>
              </div>

              {/* Auto Follow Route */}
              <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition">
                <div className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                  <div>
                    <div className="text-[11px] font-semibold">Route Auto-Follow</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Sync page.tsx on URL change
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoFollow}
                  onChange={handleToggleAuto}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
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
                  onChange={handleToggleInspector}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
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
          )}

          {/* Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900/90 hover:bg-slate-950 text-white shadow-xl border border-white/10 backdrop-blur-md transition group text-xs font-medium cursor-pointer"
            title="FlagOS Dev IDE Follower"
          >
            <div className="relative">
              <Code className="w-3.5 h-3.5 text-emerald-400" />
              {activeMode && (
                <span
                  className={`absolute -top-1 -right-1 w-2 h-2 rounded-full animate-ping ${
                    activeMode === "logic" ? "bg-amber-400" : "bg-cyan-400"
                  }`}
                />
              )}
            </div>
            <span className="font-mono text-[11px] tracking-tight">VS Code Sync</span>
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
