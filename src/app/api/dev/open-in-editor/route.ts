import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

/**
 * Resolves a Turbopack chunk string (e.g. src_components_walkthrough_PageGuideButton_tsx)
 * back to its physical file path on disk.
 */
function resolveTurbopackChunkToPath(chunkStr: string, projectRoot: string): string | null {
  const match = chunkStr.match(/(src_[a-zA-Z0-9_%]+_(?:tsx|ts|jsx|js))/i);
  if (!match) return null;
  const decoded = decodeURIComponent(match[1]);
  const extMatch = decoded.match(/_(tsx|ts|jsx|js)$/);
  if (!extMatch) return null;
  const ext = "." + extMatch[1];
  const withoutExt = decoded.slice(0, -extMatch[0].length);

  function findPath(currentDir: string, remainingParts: string[]): string | null {
    if (remainingParts.length === 0) return null;
    if (!fs.existsSync(/*turbopackIgnore: true*/ currentDir)) return null;
    const entries = fs.readdirSync(/*turbopackIgnore: true*/ currentDir, { withFileTypes: true });

    for (let i = 1; i <= remainingParts.length; i++) {
      const candidateName = remainingParts.slice(0, i).join("_");
      if (i === remainingParts.length) {
        const fileEntry = entries.find(
          (e) => e.isFile() && e.name.toLowerCase() === (candidateName + ext).toLowerCase()
        );
        if (fileEntry) return path.join(currentDir, fileEntry.name);
      }
      const dirEntry = entries.find(
        (e) => e.isDirectory() && e.name.toLowerCase() === candidateName.toLowerCase()
      );
      if (dirEntry) {
        const sub = findPath(path.join(currentDir, dirEntry.name), remainingParts.slice(i));
        if (sub) return sub;
      }
    }
    return null;
  }

  const parts = withoutExt.split("_");
  if (parts[0] === "src") {
    return findPath(path.join(projectRoot, "src"), parts.slice(1));
  }
  return null;
}

export async function POST(req: Request) {
  try {
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
      className,
    } = body || {};

    let targetFile: string | null = null;
    let targetLine: number | null = null;

    // Helper: resolve route pathname to physical page.tsx
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

    // 1. LOGIC MODE ROUTE JUMP:
    // If the user Option+clicks a link/card with href (e.g. /teams/york_lions/roster),
    // jump straight to that target route's page/logic file!
    if (mode === "logic" && href && typeof href === "string" && href.startsWith("/")) {
      const targetRouteFile = resolveRouteFile(href);
      if (targetRouteFile) {
        targetFile = targetRouteFile;
      }
    }

    // 2. Resolve file from Turbopack chunk or path
    if (!targetFile && file && typeof file === "string") {
      if (file.includes("src_")) {
        targetFile = resolveTurbopackChunkToPath(file, PROJECT_ROOT);
      }
      if (!targetFile) {
        const srcMatch = file.match(/src\/[^\s\?:\)]+/);
        if (srcMatch) {
          const candidate = path.join(PROJECT_ROOT, srcMatch[0]);
          if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
            targetFile = candidate;
          }
        }
      }
    }

    // 3. Resolve by component name in src/components or src/app
    if (!targetFile && component && typeof component === "string" && component !== "Link") {
      const findInDir = (dir: string): string | null => {
        if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) return null;
        const entries = fs.readdirSync(/*turbopackIgnore: true*/ dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const found = findInDir(full);
            if (found) return found;
          } else if (
            entry.isFile() &&
            (entry.name === `${component}.tsx` ||
              entry.name === `${component}.ts` ||
              entry.name === `${component}.jsx`)
          ) {
            return full;
          }
        }
        return null;
      };
      targetFile = findInDir(COMPONENTS_DIR) || findInDir(APP_DIR);
    }

    // 4. Fallback to active route page.tsx
    if (!targetFile && route && typeof route === "string") {
      targetFile = resolveRouteFile(route);
    }

    // If still not resolved, default to app homepage or return 404
    if (!targetFile || !fs.existsSync(/*turbopackIgnore: true*/ targetFile)) {
      const fallback = path.join(APP_DIR, "page.tsx");
      if (fs.existsSync(/*turbopackIgnore: true*/ fallback)) {
        targetFile = fallback;
      } else {
        return NextResponse.json({ ok: false, error: "Target file not found" }, { status: 404 });
      }
    }

    // ========== LOCATE EXACT TARGET LINE ==========
    try {
      const fileContent = fs.readFileSync(/*turbopackIgnore: true*/ targetFile, "utf8");
      const fileLines = fileContent.split("\n");

      if (mode === "logic") {
        // ========== LOGIC MODE (Option+Click) ==========
        let logicLine: number | null = null;

        // A. If targetFile was resolved from an href link (navigating to another page):
        // Jump directly to the component's state/logic definition
        if (href && targetFile.endsWith("page.tsx")) {
          const compIdx = fileLines.findIndex(
            (l) => l.includes("export default function") || l.includes("export function")
          );
          if (compIdx !== -1) logicLine = compIdx + 1;
        }

        // B. Handler function search: const handleX = or function handleX
        if (!logicLine && onClickText && typeof onClickText === "string") {
          const raw = onClickText.replace(/^set/, "");
          const fnIdx = fileLines.findIndex(
            (l) =>
              l.includes(`const ${onClickText} =`) ||
              l.includes(`async function ${onClickText}`) ||
              l.includes(`function ${onClickText}`) ||
              l.includes(`let ${onClickText} =`) ||
              l.includes(`const handle${raw} =`) ||
              l.includes(`function handle${raw}`)
          );
          if (fnIdx !== -1) logicLine = fnIdx + 1;

          // State setter definition: const [isStats..., setIsStats...] = useState
          if (!logicLine) {
            const stateIdx = fileLines.findIndex(
              (l) => l.includes(onClickText) && l.includes("useState")
            );
            if (stateIdx !== -1) logicLine = stateIdx + 1;
          }
        }

        // C. Data fetching / mutation logic in component
        if (!logicLine) {
          const dataLogicIdx = fileLines.findIndex(
            (l) =>
              l.includes("requestPrivateData") ||
              l.includes("createSecureRecord") ||
              l.includes("useEffect(") ||
              l.includes("useState(")
          );
          if (dataLogicIdx !== -1) logicLine = dataLogicIdx + 1;
        }

        // D. Fallback to component definition line
        if (!logicLine) {
          const defIdx = fileLines.findIndex(
            (l) => l.includes("export default function") || l.includes("export function")
          );
          if (defIdx !== -1) logicLine = defIdx + 1;
        }

        targetLine = logicLine || null;
      } else {
        // ========== UI MODE (Ctrl+Click) ==========
        let uiLine: number | null = null;

        // 1. Match by data-tour attribute (100% unique when present)
        if (dataTour && typeof dataTour === "string") {
          const matchIdx = fileLines.findIndex(
            (l) => l.includes(`data-tour="${dataTour}"`) || l.includes(`data-tour='${dataTour}'`)
          );
          if (matchIdx !== -1) uiLine = matchIdx + 1;
        }

        // 2. Match by id attribute
        if (!uiLine && id && typeof id === "string") {
          const matchIdx = fileLines.findIndex(
            (l) => l.includes(`id="${id}"`) || l.includes(`id={'${id}'}`) || l.includes(`id='${id}'`)
          );
          if (matchIdx !== -1) uiLine = matchIdx + 1;
        }

        // 3. Match by aria-label attribute
        if (!uiLine && ariaLabel && typeof ariaLabel === "string") {
          const matchIdx = fileLines.findIndex(
            (l) => l.includes("aria-label=") && l.includes(ariaLabel)
          );
          if (matchIdx !== -1) uiLine = matchIdx + 1;
        }

        // 4. Match by href attribute
        if (!uiLine && href && typeof href === "string") {
          const cleanSeg = href.split("?")[0].replace(/\/+$/, "").split("/").pop();
          if (cleanSeg) {
            const matchIdx = fileLines.findIndex(
              (l) => l.includes("href=") && l.includes(cleanSeg)
            );
            if (matchIdx !== -1) {
              // If line above is <Link, jump to <Link
              if (matchIdx > 0 && fileLines[matchIdx - 1].includes("<Link")) {
                uiLine = matchIdx;
              } else {
                uiLine = matchIdx + 1;
              }
            }
          }
        }

        // 5. Match by onClick prop
        if (!uiLine && onClickText && typeof onClickText === "string") {
          const matchIdx = fileLines.findIndex(
            (l) => l.includes("onClick=") && l.includes(onClickText)
          );
          if (matchIdx !== -1) {
            // Check if <button tag started 1-2 lines earlier
            let tagStart = matchIdx;
            for (let i = matchIdx; i >= Math.max(0, matchIdx - 3); i--) {
              if (fileLines[i].includes("<button") || fileLines[i].includes("<Link")) {
                tagStart = i;
                break;
              }
            }
            uiLine = tagStart + 1;
          }
        }

        // 6. Match by distinct visible text
        if (!uiLine && text && typeof text === "string") {
          const clean = text.trim();
          if (clean.length >= 3) {
            const matchIdx = fileLines.findIndex((l) => {
              const tr = l.trim();
              if (tr.startsWith("import ") || tr.startsWith("import{") || tr.startsWith("//") || tr.startsWith("/*")) {
                return false;
              }
              return l.includes(clean);
            });
            if (matchIdx !== -1) {
              let tagStart = matchIdx;
              for (let i = matchIdx; i >= Math.max(0, matchIdx - 3); i--) {
                if (
                  fileLines[i].includes("<button") ||
                  fileLines[i].includes("<Link") ||
                  fileLines[i].includes("<a ")
                ) {
                  tagStart = i;
                  break;
                }
              }
              uiLine = tagStart + 1;
            }
          }
        }

        // 7. Match by distinctive class tokens (handles dynamic text like {team.name})
        if (!uiLine && className && typeof className === "string") {
          const distinctiveTokens = className
            .split(/\s+/)
            .filter((t) => t.length > 5 && !t.includes(":") && !["border", "rounded", "flex", "relative", "overflow-hidden"].includes(t));
          if (distinctiveTokens.length > 0) {
            const query = distinctiveTokens.slice(0, 2).join(" ");
            const matchIdx = fileLines.findIndex(
              (l) => l.includes(query) || (distinctiveTokens.length >= 2 && l.includes(distinctiveTokens[0]) && l.includes(distinctiveTokens[1]))
            );
            if (matchIdx !== -1) uiLine = matchIdx + 1;
          }
        }

        // 8. Match by component JSX tag
        if (!uiLine && component && typeof component === "string" && component !== "Link") {
          const matchIdx = fileLines.findIndex((l) => l.includes(`<${component}`));
          if (matchIdx !== -1) uiLine = matchIdx + 1;
        }

        targetLine = uiLine || null;
      }
    } catch {
      targetLine = null;
    }

    // If an element was clicked (not just a background route auto-follow),
    // require a verified, high-confidence targetLine. Never jump blindly to line 1!
    const isElementClick = Boolean(component || text || onClickText || href || dataTour || id || ariaLabel || className);
    if (isElementClick && (!targetLine || targetLine <= 0)) {
      return NextResponse.json(
        { ok: false, error: "No clear code segment found in source file" },
        { status: 422 }
      );
    }

    const finalLine = targetLine || 1;

    // Launch in Visual Studio Code WITHOUT activating or resizing the locked window
    const targetArg = `${targetFile}:${finalLine}`;
    const targetUrl = `vscode://file/${targetArg}`;

    const vsCodeAppPaths = [
      "/Users/dextersargent/Desktop/Visual Studio Code.app",
      "/Applications/Visual Studio Code.app",
      "/Users/dextersargent/Downloads/Visual Studio Code 2.app",
    ];

    let foundAppPath: string | null = null;
    for (const p of vsCodeAppPaths) {
      if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
        foundAppPath = p;
        break;
      }
    }

    // On macOS, launch via 'open -g' (background mode) targeting Visual Studio Code specifically.
    // The -g flag prevents macOS from stealing focus or triggering window manager / tiling resize events,
    // preserving the user's locked window dimensions and split layout.
    if (process.platform === "darwin") {
      const openArgs = foundAppPath
        ? ["-a", foundAppPath, "-g", targetUrl]
        : ["-b", "com.microsoft.VSCode", "-g", targetUrl];

      const child = spawn("open", openArgs, {
        detached: true,
        stdio: "ignore",
      });

      child.on("error", () => {
        // Fallback to code CLI if open fails
        const vsCodeBin = foundAppPath
          ? path.join(foundAppPath, "Contents", "Resources", "app", "bin", "code")
          : "code";
        const fallbackChild = spawn(vsCodeBin, ["-r", "-g", targetArg], {
          detached: true,
          stdio: "ignore",
        });
        fallbackChild.unref();
      });
      child.unref();
    } else {
      const vsCodeBin = "code";
      const child = spawn(vsCodeBin, ["-r", "-g", targetArg], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
    }

    const relative = path.relative(PROJECT_ROOT, targetFile);
    console.log(`[DevIDE] [${mode.toUpperCase()}] Focused in VS Code: ${relative}:${finalLine}`);

    return NextResponse.json({
      ok: true,
      mode,
      file: relative,
      fullPath: targetFile,
      line: finalLine,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[DevIDE] Error opening in VS Code:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
