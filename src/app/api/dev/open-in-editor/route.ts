import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const fs = await import("fs");
    const path = await import("path");
    const { spawn } = await import("child_process");

    const PROJECT_ROOT = process.cwd();
    const APP_DIR = path.join(PROJECT_ROOT, "src", "app");
    const COMPONENTS_DIR = path.join(PROJECT_ROOT, "src", "components");

    const body = await req.json();
    const {
      mode = "ui", // "ui" (Ctrl+Click) or "logic" (Option+Click)
      file,
      component,
      route,
      href,
      onClickText,
      text,
      ariaLabel,
      dataTour,
      id,
    } = body || {};

    let targetFile: string | null = null;
    let targetLine: number = 1;

    // Helper: resolve route to page.tsx
    const resolveRouteFile = (pathname: string): string | null => {
      const clean = pathname.split("?")[0].replace(/^\/+|\/+$/g, "");
      const segments = clean ? clean.split("/") : [];

      let current = APP_DIR;
      for (const seg of segments) {
        if (!fs.existsSync(/*turbopackIgnore: true*/ current)) return null;
        const entries = fs.readdirSync(/*turbopackIgnore: true*/ current, { withFileTypes: true });
        const directMatch = entries.find(
          (e) => e.isDirectory() && e.name.toLowerCase() === seg.toLowerCase()
        );
        if (directMatch) {
          current = path.join(current, directMatch.name);
          continue;
        }
        const dynamicMatch = entries.find(
          (e) => e.isDirectory() && e.name.startsWith("[") && e.name.endsWith("]")
        );
        if (dynamicMatch) {
          current = path.join(current, dynamicMatch.name);
          continue;
        }
        return null;
      }
      const pageCandidate = path.join(current, "page.tsx");
      return fs.existsSync(/*turbopackIgnore: true*/ pageCandidate) ? pageCandidate : null;
    };

    // LOGIC MODE SPECIFIC ROUTE JUMP:
    // If user Option+clicks a link/nav card with href (e.g. /teams/york_lions/roster),
    // jump straight to that target route's logic/page file!
    if (mode === "logic" && href && typeof href === "string" && href.startsWith("/")) {
      const targetRouteFile = resolveRouteFile(href);
      if (targetRouteFile) {
        targetFile = targetRouteFile;
        // Jump to logic section (first state or effect) of that target page
        try {
          const content = fs.readFileSync(/*turbopackIgnore: true*/ targetFile, "utf8");
          const lns = content.split("\n");
          const logicIdx = lns.findIndex((l) => l.includes("useState(") || l.includes("useEffect("));
          targetLine = logicIdx !== -1 ? logicIdx + 1 : 1;
        } catch {
          targetLine = 1;
        }
      }
    }

    // 1. Direct file resolution (if file path is known and valid)
    if (!targetFile && file && typeof file === "string") {
      const srcMatch = file.match(/src\/[^\s\?:\)]+/);
      if (srcMatch) {
        const candidate = path.join(PROJECT_ROOT, srcMatch[0]);
        if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
          targetFile = candidate;
        }
      }
    }

    // 2. Component lookup
    if (!targetFile && component && typeof component === "string") {
      const lower = component.trim().toLowerCase();
      const findInDir = (dir: string): string | null => {
        try {
          const entries = fs.readdirSync(/*turbopackIgnore: true*/ dir, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              const res = findInDir(full);
              if (res) return res;
            } else if (
              (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) &&
              entry.name.replace(/\.[^.]+$/, "").toLowerCase() === lower
            ) {
              return full;
            }
          }
        } catch {}
        return null;
      };

      targetFile = findInDir(COMPONENTS_DIR) || findInDir(APP_DIR);
    }

    // 3. Fallback to active route page.tsx
    if (!targetFile && route && typeof route === "string") {
      targetFile = resolveRouteFile(route);
    }

    // 4. Default root page
    if (!targetFile) {
      targetFile = path.join(APP_DIR, "page.tsx");
    }

    if (!fs.existsSync(/*turbopackIgnore: true*/ targetFile)) {
      return NextResponse.json({ ok: false, error: "Target file not found" }, { status: 404 });
    }

    // Now determine the exact line based on MODE (UI vs LOGIC)
    try {
      const fileContent = fs.readFileSync(/*turbopackIgnore: true*/ targetFile, "utf8");
      const fileLines = fileContent.split("\n");

      if (mode === "logic") {
        // ========== LOGIC MODE (Option+Click) ==========
        let logicLine: number | null = null;

        // A. If an onClick handler/setter is present, find its definition or useState
        if (onClickText && typeof onClickText === "string") {
          const raw = onClickText.trim();
          const stateVar = raw.startsWith("set") ? raw.slice(3) : null;

          // 1. Function definition: const handle... = or function handle...
          const fnIdx = fileLines.findIndex(
            (l) =>
              l.includes(`function ${raw}`) ||
              l.includes(`const ${raw} =`) ||
              l.includes(`let ${raw} =`)
          );
          if (fnIdx !== -1) logicLine = fnIdx + 1;

          // 2. State definition: const [..., setIsStats...] = useState
          if (!logicLine && stateVar) {
            const stateIdx = fileLines.findIndex(
              (l) => l.includes(raw) && l.includes("useState")
            );
            if (stateIdx !== -1) logicLine = stateIdx + 1;
          }
        }

        // B. If no specific handler, jump to the component's state/hook logic block (first useState / useEffect)
        if (!logicLine) {
          const firstLogicIdx = fileLines.findIndex(
            (l) => l.includes("useState(") || l.includes("useEffect(") || l.includes("useMemo(")
          );
          if (firstLogicIdx !== -1) logicLine = firstLogicIdx + 1;
        }

        targetLine = logicLine || 1;
      } else {
        // ========== UI MODE (Ctrl+Click) ==========
        let uiLine: number | null = null;

        // A. If element has href link, search for href with path segment
        if (href && typeof href === "string") {
          const cleanSeg = href.split("?")[0].replace(/\/+$/, "").split("/").pop();
          if (cleanSeg) {
            const matchIdx = fileLines.findIndex(
              (l) => l.includes("href=") && l.includes(cleanSeg)
            );
            if (matchIdx !== -1) uiLine = matchIdx + 1;
          }
        }

        // B. If element has onClick, search for onClick assignment in JSX
        if (!uiLine && onClickText && typeof onClickText === "string") {
          const matchIdx = fileLines.findIndex(
            (l) => l.includes("onClick=") && l.includes(onClickText)
          );
          if (matchIdx !== -1) uiLine = matchIdx + 1;
        }

        // C. Search by data-tour or aria-label
        if (!uiLine && dataTour && typeof dataTour === "string") {
          const matchIdx = fileLines.findIndex((l) => l.includes(`data-tour="${dataTour}"`));
          if (matchIdx !== -1) uiLine = matchIdx + 1;
        }
        if (!uiLine && ariaLabel && typeof ariaLabel === "string") {
          const matchIdx = fileLines.findIndex((l) => l.includes(`aria-label=`) && l.includes(ariaLabel));
          if (matchIdx !== -1) uiLine = matchIdx + 1;
        }

        // D. Search by id
        if (!uiLine && id && typeof id === "string") {
          const matchIdx = fileLines.findIndex((l) => l.includes(`id="${id}"`) || l.includes(`id={'${id}'}`));
          if (matchIdx !== -1) uiLine = matchIdx + 1;
        }

        // E. Search by visible element text (avoiding imports at top)
        if (!uiLine && text && typeof text === "string") {
          const cleanText = text.trim();
          if (cleanText.length >= 3) {
            const lower = cleanText.toLowerCase();
            const matchIdx = fileLines.findIndex((l) => {
              const tr = l.trim();
              if (tr.startsWith("import ") || tr.startsWith("import{")) return false;
              return l.toLowerCase().includes(lower);
            });
            if (matchIdx !== -1) uiLine = matchIdx + 1;
          }
        }

        // F. Default to the JSX return statement of the component
        if (!uiLine) {
          const returnIdx = fileLines.findIndex((l) => l.trim().startsWith("return (") || l.trim() === "return");
          if (returnIdx !== -1) uiLine = returnIdx + 1;
        }

        targetLine = uiLine || 1;
      }
    } catch {
      targetLine = 1;
    }

    // Launch in Visual Studio Code
    const targetArg = `${targetFile}:${targetLine}`;
    const vsCodeCandidateBins = [
      "/Users/dextersargent/Desktop/Visual Studio Code.app/Contents/Resources/app/bin/code",
      "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
      "/Users/dextersargent/Downloads/Visual Studio Code 2.app/Contents/Resources/app/bin/code",
      "code",
    ];

    let vsCodeBin: string | null = null;
    for (const bin of vsCodeCandidateBins) {
      if (bin === "code" || fs.existsSync(/*turbopackIgnore: true*/ bin)) {
        vsCodeBin = bin;
        break;
      }
    }

    if (vsCodeBin) {
      const child = spawn(vsCodeBin, ["-r", "-g", targetArg], {
        detached: true,
        stdio: "ignore",
      });
      child.on("error", () => {
        const url = `vscode://file/${targetArg}`;
        const openChild = spawn("open", [url], { detached: true, stdio: "ignore" });
        openChild.unref();
      });
      child.unref();
    } else {
      const url = `vscode://file/${targetArg}`;
      const openChild = spawn("open", [url], { detached: true, stdio: "ignore" });
      openChild.unref();
    }

    const relative = path.relative(PROJECT_ROOT, targetFile);
    console.log(`[DevIDE] [${mode.toUpperCase()}] Focused in VS Code: ${relative}:${targetLine}`);

    return NextResponse.json({
      ok: true,
      mode,
      file: relative,
      fullPath: targetFile,
      line: targetLine,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[DevIDE] Error opening in VS Code:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
