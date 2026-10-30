"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Code, Navigation, Crosshair, Check, ChevronDown, ChevronUp, Layers, Cpu, AlertCircle } from "lucide-react";

interface InspectableTarget {
  element: HTMLElement;
  rect: DOMRect;
  name: string;
  tag: string;
  className?: string;
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
 * Searches the DOM and React Fiber tree to determine if there is a clear,
 * high-confidence path to change the UI (Ctrl) or the Logic (Option).
 *
 * If no clear, determinable code segment exists, returns NULL so the element
 * is NEVER presented or highlighted to the developer.
 */
function findInspectableTarget(
  rawTarget: Element | null,
  mode: "ui" | "logic"
): InspectableTarget | null {
  if (!rawTarget || !(rawTarget instanceof HTMLElement)) return null;
  if (rawTarget.closest("#dev-ide-follower-ui")) return null;

  // Walk up ancestors looking for the primary semantic element
  let curr: HTMLElement | null = rawTarget;
  let targetElement: HTMLElement | null = null;
  let href: string | undefined = undefined;
  let dataTour: string | undefined = undefined;
  let ariaLabel: string | undefined = undefined;
  let id: string | undefined = undefined;
  let onClickText: string | undefined = undefined;
  let compName: string | undefined = undefined;
  let sourceFile: string | undefined = undefined;

  let depth = 0;
  while (curr && curr !== document.body && depth < 5) {
    if (!href) {
      const rawHref = curr.getAttribute("href") || (curr as any).href;
      if (typeof rawHref === "string" && rawHref) href = rawHref;
    }
    if (!dataTour) {
      const tour = curr.getAttribute("data-tour");
      if (tour) dataTour = tour;
    }
    if (!ariaLabel) {
      const label = curr.getAttribute("aria-label");
      if (label) ariaLabel = label;
    }
    if (!id && curr.id && !curr.id.startsWith("__")) {
      id = curr.id;
    }

    // Inspect React Fiber
    const fiber = getFiberFromElement(curr);
    if (fiber) {
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

      if (!compName) {
        const name = getComponentName(fiber.type);
        if (name && name !== "Link" && name !== "NextLink") {
          compName = name;
        }
      }

      if (!sourceFile && fiber._debugStack) {
        const stackStr = String(fiber._debugStack);
        const chunkMatch = stackStr.match(/(src_[a-zA-Z0-9_%]+_(?:tsx|ts|jsx|js))/i);
        if (chunkMatch) {
          sourceFile = decodeURIComponent(chunkMatch[1]);
        }
      }
    }

    // Interactive containers take precedence as the bounding target
    const tag = curr.tagName.toLowerCase();
    if (
      ["button", "a", "input", "select", "textarea", "summary"].includes(tag) ||
      curr.getAttribute("role") === "button"
    ) {
      targetElement = curr;
      break;
    }

    curr = curr.parentElement;
    depth++;
  }

  // Choose the bounding element: either interactive container or raw semantic element
  const el = targetElement || rawTarget;
  const tag = el.tagName.toLowerCase();
  const rawText = (el.innerText || rawTarget.innerText || el.textContent || "")
    .split("\n")[0]
    ?.trim() || "";
  const cleanText = rawText.slice(0, 45) || undefined;
  const className = el.className && typeof el.className === "string" ? el.className.slice(0, 80) : undefined;

  // =========================================================================
  // STRICT "CLEAR PATH" VALIDATION:
  // If we cannot determine a clear path to change the UI or logic, do not present!
  // =========================================================================

  if (mode === "logic") {
    // LOGIC MODE: Must have an explicit logic hook
    // 1. Has an onClick handler/setter
    // 2. Has an internal route link (navigates to that route's logic)
    // 3. Is a form control (input, select, textarea, form)
    // 4. Is a custom React component with logic
    const hasLogicPath = Boolean(
      onClickText ||
      (href && href.startsWith("/")) ||
      ["input", "select", "textarea", "form"].includes(tag) ||
      (compName && compName !== "Link")
    );

    if (!hasLogicPath) {
      return null; // Pure static UI has no logic path — DO NOT PRESENT!
    }
  } else {
    // UI MODE: Must have a clear, pinpointable selector in JSX
    // 1. Explicit data-tour, id, aria-label, or href
    // 2. Custom React component
    // 3. Direct onClick handler
    // 4. Semantic element (h1-h6, p, button, a, label, th, td, span) with distinct text (>= 3 chars)
    const isSemanticTextTag = [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "button", "a", "label", "th", "td",
      "summary", "span", "b", "strong", "em", "li", "header", "nav"
    ].includes(tag);

    const hasDistinctText = Boolean(cleanText && cleanText.length >= 3 && !/^\d+$/.test(cleanText));
    const hasUiPath = Boolean(
      dataTour ||
      id ||
      ariaLabel ||
      href ||
      compName ||
      onClickText ||
      (isSemanticTextTag && hasDistinctText) ||
      (tag === "div" && (dataTour || id || (hasDistinctText && cleanText && cleanText.length >= 5)))
    );

    if (!hasUiPath) {
      return null; // Inert wrapper div / background layout with no identity — DO NOT PRESENT!
    }
  }

  const baseDisplay = compName || (tag === "a" ? "Link" : tag);
  const name = cleanText ? `<${baseDisplay}> "${cleanText}"` : `<${baseDisplay}>`;

  return {
    element: el,
    rect: el.getBoundingClientRect(),
    name,
    tag,
    className,
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
  const [hoveredTarget, setHoveredTarget] = useState<InspectableTarget | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const prevPathnameRef = useRef<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTargetRef = useRef<InspectableTarget | null>(null);

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

  const showStatus = useCallback((text: string, error = false) => {
    setStatusMessage({ text, error });
    setTimeout(() => {
      setStatusMessage((current) => (current?.text === text ? null : current));
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
      className?: string;
    }) => {
      try {
        const res = await fetch("/api/dev/open-in-editor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.ok && data.line) {
          const modeTag = payload.mode === "logic" ? "Logic" : "UI";
          showStatus(`[${modeTag}] ${payload.text || payload.component || payload.tag || "element"} (line ${data.line})`);
        } else {
          showStatus(data.error || "No clear code path found to change this element", true);
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
      const inspectable = findInspectableTarget(target, mode);

      if (inspectable) {
        lastTargetRef.current = inspectable;
        setHoveredTarget(inspectable);
      } else {
        setHoveredTarget(null);
      }
    };

    const triggerOpen = (e: MouseEvent) => {
      const mode = getModeFromEvent(e);
      if (!mode) return;

      const target = document.elementFromPoint(e.clientX, e.clientY);
      const inspectable = findInspectableTarget(target, mode) || lastTargetRef.current;
      if (!inspectable) return;

      e.preventDefault();
      e.stopPropagation();

      openTarget({
        mode,
        file: inspectable.file,
        component: inspectable.component,
        route: pathname,
        href: inspectable.href,
        onClickText: inspectable.onClickText,
        text: inspectable.text,
        ariaLabel: inspectable.ariaLabel,
        dataTour: inspectable.dataTour,
        id: inspectable.id,
        tag: inspectable.tag,
        className: inspectable.className,
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
      {/* Component Highlighting Rect (ONLY displays when a clear path to change UI/Logic exists) */}
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
        <div
          className={`fixed bottom-16 right-5 z-[9999999] px-3.5 py-2 rounded-xl shadow-2xl border backdrop-blur-md flex items-center gap-2.5 text-xs font-mono animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            statusMessage.error
              ? "bg-rose-950/90 text-rose-200 border-rose-500/30"
              : "bg-slate-950/90 text-white border-white/10"
          }`}
        >
          {statusMessage.error ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
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
