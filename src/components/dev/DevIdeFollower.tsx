"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Code, Navigation, Crosshair, Check, ChevronDown, ChevronUp, Layers, Cpu, AlertCircle } from "lucide-react";

interface InspectableTarget {
  element: HTMLElement;
  rect: DOMRect;
  name: string;
  tag: string;
  rawTag?: string;
  className?: string;
  rawClassName?: string;
  file?: string;
  line?: number;
  component?: string;
  componentChain?: string[];
  href?: string;
  onClickText?: string;
  text?: string;
  ariaLabel?: string | null;
  dataTour?: string | null;
  id?: string;
  ancestorTexts?: string[];
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

const FRAMEWORK_PREFIXES = [
  "Next",
  "Lucide",
  "svg",
  "Segment",
  "Layout",
  "Inner",
  "Outer",
  "Redirect",
  "HTTP",
  "Loading",
  "Error",
  "Scroll",
  "GlobalShell",
  "AuthGuard",
  "PortalIdentity",
  "SelectedLeague",
  "ThemeProvider",
  "DevIde",
  "Toast",
  "Head",
];

const FRAMEWORK_EXACT = new Set([
  "Link",
  "LinkComponent",
  "NextLink",
  "Image",
  "NextImage",
  "ClientPageRoot",
  "SegmentViewNode",
  "LayoutRouterContext",
  "InnerLayoutRouter",
  "OuterLayoutRouter",
  "RedirectErrorBoundary",
  "RedirectBoundary",
  "HTTPAccessFallbackBoundary",
  "LoadingBoundary",
  "ErrorBoundary",
  "InnerScrollHandler",
  "ScrollHandler",
  "GlobalShellInner",
  "GlobalShell",
  "AuthGuard",
  "PortalIdentityScope",
  "PortalIdentityBoundary",
  "SelectedLeagueProvider",
  "ThemeProvider",
  "Fragment",
  "Suspense",
  "DevIdeFollower",
  "DynamicComponent",
]);

function isUserComponentName(name: string | null | undefined): boolean {
  if (!name || typeof name !== "string") return false;
  if (FRAMEWORK_EXACT.has(name)) return false;
  for (const prefix of FRAMEWORK_PREFIXES) {
    if (name.startsWith(prefix)) return false;
  }
  return true;
}

function getComponentName(type: any): string | null {
  if (!type) return null;
  if (typeof type === "string") return null;
  if (typeof type === "function") {
    const n = type.displayName || type.name;
    return isUserComponentName(n) ? n : null;
  }
  if (typeof type === "object") {
    const candidates = [
      type.displayName,
      type.name,
      type.render?.displayName,
      type.render?.name,
      type.type?.displayName,
      type.type?.name,
    ];
    for (const c of candidates) {
      if (isUserComponentName(c)) return c;
    }
  }
  return null;
}

interface FiberSourceInfo {
  componentName?: string;
  componentChain: string[];
  file?: string;
  line?: number;
  onClickText?: string;
}

function extractFiberSourceInfo(startFiber: any): FiberSourceInfo {
  const result: FiberSourceInfo = { componentChain: [] };
  if (!startFiber) return result;

  const seenComponents = new Set<string>();

  const parseStackOrPath = (str: unknown): { file: string; line?: number } | null => {
    if (!str) return null;
    const raw = typeof str === "string" ? str : (str as any)?.stack || String(str || "");
    if (!raw) return null;

    // 1. Turbopack URL: turbopack://[project]/src/components/X.tsx:12:34
    const turboMatch = raw.match(/turbopack:\/\/(?:\[project\]\/)?(src\/[^\s:()]+\.[jt]sx?)(?::(\d+))?/i);
    if (turboMatch) {
      return { file: turboMatch[1], line: turboMatch[2] ? parseInt(turboMatch[2], 10) : undefined };
    }

    // 2. Webpack or file URL: webpack-internal:///./src/... or file:///.../src/...
    const srcMatch = raw.match(/(?:file:\/\/)?(?:[A-Za-z0-9_.\-\/]+\/)?(src\/[A-Za-z0-9_.\-\/]+\.[jt]sx?)(?::(\d+))?/i);
    if (srcMatch) {
      return { file: srcMatch[1], line: srcMatch[2] ? parseInt(srcMatch[2], 10) : undefined };
    }

    // 3. Turbopack chunk name: src_components_team_TeamSeasonHistoryPanel_tsx
    const chunkMatch = raw.match(/(src_[a-zA-Z0-9_%]+_(?:tsx|ts|jsx|js))/i);
    if (chunkMatch) {
      return { file: decodeURIComponent(chunkMatch[1]) };
    }
    return null;
  };

  const inspectFiber = (f: any) => {
    if (!f) return;

    // Check component name from type, elementType, or _debugOwner
    const comp =
      getComponentName(f.type) ||
      getComponentName(f.elementType) ||
      (f._debugOwner ? getComponentName(f._debugOwner.type) : null);

    if (comp && isUserComponentName(comp)) {
      if (!seenComponents.has(comp)) {
        seenComponents.add(comp);
        result.componentChain.push(comp);
        if (!result.componentName) {
          result.componentName = comp;
        }
      }
    }

    // Check onClick
    if (!result.onClickText && f.memoizedProps?.onClick) {
      const fn = f.memoizedProps.onClick;
      if (typeof fn === "function") {
        if (fn.name && fn.name !== "onClick" && !fn.name.startsWith("bound ")) {
          result.onClickText = fn.name;
        } else {
          const fnStr = fn.toString();
          const match = fnStr.match(
            /(set[A-Z0-9_a-z]+|handle[A-Z0-9_a-z]+|[a-zA-Z0-9_]+Modal|open[A-Z0-9_a-z]+|close[A-Z0-9_a-z]+|toggle[A-Z0-9_a-z]+)/
          );
          if (match) result.onClickText = match[1];
        }
      }
    }

    // Check _debugSource directly on fiber, owner, or memoizedProps
    const debugSource = f._debugSource || f.memoizedProps?.__source;
    if (!result.file && debugSource && debugSource.fileName) {
      result.file = String(debugSource.fileName);
      result.line = typeof debugSource.lineNumber === "number" ? debugSource.lineNumber : undefined;
    }

    // Check _debugStack
    if (!result.file && f._debugStack) {
      const parsed = parseStackOrPath(f._debugStack);
      if (parsed) {
        result.file = parsed.file;
        result.line = parsed.line;
      }
    }

    // Check _debugInfo (React 19 Server/Client component info)
    if (!result.file && f._debugInfo && Array.isArray(f._debugInfo)) {
      for (const info of f._debugInfo) {
        if (info?.name && !result.componentName && isUserComponentName(String(info.name))) {
          result.componentName = String(info.name);
        }
        if (info?.env) {
          const parsed = parseStackOrPath(info.env);
          if (parsed) {
            result.file = parsed.file;
            result.line = parsed.line;
            break;
          }
        }
      }
    }
  };

  // 1. Walk the _debugOwner chain (the JSX creators!)
  let owner = startFiber._debugOwner;
  let ownerHops = 0;
  while (owner && ownerHops < 25) {
    inspectFiber(owner);
    owner = owner._debugOwner;
    ownerHops++;
  }

  // 2. Walk the return (parent fiber) chain
  let curr = startFiber;
  let hops = 0;
  while (curr && hops < 50) {
    inspectFiber(curr);
    if (curr._debugOwner) {
      inspectFiber(curr._debugOwner);
    }
    curr = curr.return;
    hops++;
  }

  return result;
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

  // Walk up ancestors looking for the primary semantic element and all identifiers
  let curr: HTMLElement | null = rawTarget;
  let targetElement: HTMLElement | null = null;
  let href: string | undefined = undefined;
  let dataTour: string | undefined = undefined;
  let ariaLabel: string | undefined = undefined;
  let id: string | undefined = undefined;
  const ancestorTexts: string[] = [];

  // Extract React Fiber info from the clicked element
  const fiber = getFiberFromElement(rawTarget);
  const fiberInfo = extractFiberSourceInfo(fiber);

  let depth = 0;
  while (curr && curr !== document.body && depth < 25) {
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

    const tag = curr.tagName.toLowerCase();
    // Remember interactive container
    if (!targetElement && (["button", "a", "input", "select", "textarea", "summary"].includes(tag) || curr.getAttribute("role") === "button")) {
      targetElement = curr;
    }

    // Capture ancestor section/header text
    if (["h1", "h2", "h3", "h4", "h5", "h6", "th"].includes(tag)) {
      const hText = curr.innerText?.trim();
      if (hText && hText.length >= 3 && !ancestorTexts.includes(hText)) {
        ancestorTexts.push(hText.slice(0, 45));
      }
    }

    // If fiber on target didn't have source, check fiber on ancestor
    if (!fiberInfo.file || !fiberInfo.componentName) {
      const parentFiber = getFiberFromElement(curr);
      if (parentFiber) {
        const parentInfo = extractFiberSourceInfo(parentFiber);
        if (!fiberInfo.file && parentInfo.file) {
          fiberInfo.file = parentInfo.file;
          fiberInfo.line = parentInfo.line;
        }
        if (!fiberInfo.componentName && parentInfo.componentName) {
          fiberInfo.componentName = parentInfo.componentName;
        }
        for (const c of parentInfo.componentChain) {
          if (!fiberInfo.componentChain.includes(c)) fiberInfo.componentChain.push(c);
        }
        if (!fiberInfo.onClickText && parentInfo.onClickText) {
          fiberInfo.onClickText = parentInfo.onClickText;
        }
      }
    }

    curr = curr.parentElement;
    depth++;
  }

  // Choose the bounding element: either interactive container or raw semantic element
  const el = targetElement || rawTarget;
  const tag = el.tagName.toLowerCase();
  const rawTag = rawTarget.tagName.toLowerCase();
  const rawText = (el.innerText || rawTarget.innerText || el.textContent || "")
    .split("\n")[0]
    ?.trim() || "";
  const cleanText = rawText.slice(0, 100) || undefined;
  const className = el.className && typeof el.className === "string" ? el.className.slice(0, 400) : undefined;
  const rawClassName = rawTarget.className && typeof rawTarget.className === "string" ? rawTarget.className.slice(0, 400) : undefined;

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
      fiberInfo.onClickText ||
      (href && href.startsWith("/")) ||
      ["input", "select", "textarea", "form"].includes(tag) ||
      (fiberInfo.componentName && fiberInfo.componentName !== "Link")
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
      fiberInfo.componentName ||
      fiberInfo.file ||
      fiberInfo.onClickText ||
      (isSemanticTextTag && hasDistinctText) ||
      (ancestorTexts.length > 0) ||
      (tag === "div" && (dataTour || id || (hasDistinctText && cleanText && cleanText.length >= 5)))
    );

    if (!hasUiPath) {
      return null; // Inert wrapper div / background layout with no identity — DO NOT PRESENT!
    }
  }

  const baseDisplay = fiberInfo.componentName || (tag === "a" ? "Link" : tag);
  const name = cleanText ? `<${baseDisplay}> "${cleanText}"` : `<${baseDisplay}>`;

  return {
    element: el,
    rect: el.getBoundingClientRect(),
    name,
    tag,
    rawTag,
    className,
    rawClassName,
    file: fiberInfo.file,
    line: fiberInfo.line,
    component: fiberInfo.componentName,
    componentChain: fiberInfo.componentChain,
    href,
    onClickText: fiberInfo.onClickText,
    text: cleanText,
    ariaLabel,
    dataTour,
    id,
    ancestorTexts,
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
      line?: number;
      component?: string;
      componentChain?: string[];
      route?: string;
      href?: string;
      onClickText?: string;
      text?: string;
      ariaLabel?: string | null;
      dataTour?: string | null;
      id?: string;
      tag?: string;
      rawTag?: string;
      className?: string;
      rawClassName?: string;
      ancestorTexts?: string[];
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

  // 2. Track modifier keys with automatic reset on blur / visibility change
  useEffect(() => {
    if (!isDev || !inspectorActive) return;

    const resetState = () => {
      setActiveMode(null);
      setHoveredTarget(null);
      lastTargetRef.current = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.key === "Alt") {
        setActiveMode("logic");
      } else if (e.ctrlKey || e.key === "Control") {
        setActiveMode("ui");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.altKey) {
        resetState();
      } else if (e.altKey) {
        setActiveMode("logic");
      } else if (e.ctrlKey) {
        setActiveMode("ui");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", resetState);
    window.addEventListener("focus", resetState);
    document.addEventListener("visibilitychange", resetState);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", resetState);
      window.removeEventListener("focus", resetState);
      document.removeEventListener("visibilitychange", resetState);
    };
  }, [isDev, inspectorActive]);

  // 3. Mousemove & Click handler (STRICTLY requires active hardware modifier keys)
  useEffect(() => {
    if (!isDev || !inspectorActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      // If the user is NOT actively pressing Ctrl or Alt/Option, do nothing & clear highlights
      if (!e.ctrlKey && !e.altKey) {
        if (activeMode !== null) setActiveMode(null);
        if (hoveredTarget !== null) setHoveredTarget(null);
        return;
      }

      const mode: "ui" | "logic" = e.altKey ? "logic" : "ui";
      if (activeMode !== mode) setActiveMode(mode);

      const target = document.elementFromPoint(e.clientX, e.clientY);
      const inspectable = findInspectableTarget(target, mode);

      if (inspectable) {
        lastTargetRef.current = inspectable;
        setHoveredTarget(inspectable);
      } else {
        setHoveredTarget(null);
      }
    };

    const triggerOpen = (e: MouseEvent, mode: "ui" | "logic") => {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const inspectable = findInspectableTarget(target, mode) || lastTargetRef.current;
      if (!inspectable) return;

      e.preventDefault();
      e.stopPropagation();

      openTarget({
        mode,
        file: inspectable.file,
        line: inspectable.line,
        component: inspectable.component,
        componentChain: inspectable.componentChain,
        route: pathname,
        href: inspectable.href,
        onClickText: inspectable.onClickText,
        text: inspectable.text,
        ariaLabel: inspectable.ariaLabel,
        dataTour: inspectable.dataTour,
        id: inspectable.id,
        tag: inspectable.tag,
        rawTag: inspectable.rawTag,
        className: inspectable.className,
        rawClassName: inspectable.rawClassName,
        ancestorTexts: inspectable.ancestorTexts,
      });
    };

    const handleClick = (e: MouseEvent) => {
      // ONLY intercept if actively pressing Ctrl or Alt/Option!
      // If neither is pressed, allow normal navigation and interaction with ZERO interference!
      if (!e.ctrlKey && !e.altKey) return;

      const mode: "ui" | "logic" = e.altKey ? "logic" : "ui";
      triggerOpen(e, mode);
    };

    // Mac Ctrl+Click emits a contextmenu event
    const handleContextMenu = (e: MouseEvent) => {
      // ONLY intercept if actively pressing Ctrl or Alt/Option!
      if (!e.ctrlKey && !e.altKey) return;

      e.preventDefault();
      e.stopPropagation();
      const mode: "ui" | "logic" = e.altKey ? "logic" : "ui";
      triggerOpen(e, mode);
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
