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

/**
 * Resolves a URL pathname (e.g. /teams/york_lions or /admin) to its physical page.tsx on disk.
 */
function resolveRouteFile(pathname: string, appDir: string): string | null {
  const clean = pathname.split("?")[0].replace(/^\/+|\/+$/g, "");
  const segments = clean ? clean.split("/") : [];

  let current = appDir;
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
}

/**
 * Reads a source file and extracts all physical file paths imported from @/components/... or ./...
 */
function findImportedComponentFiles(sourceFile: string, projectRoot: string, visited = new Set<string>()): string[] {
  const result: string[] = [];
  if (!sourceFile || !fs.existsSync(sourceFile) || visited.has(sourceFile)) return result;
  visited.add(sourceFile);

  try {
    const content = fs.readFileSync(sourceFile, "utf8");
    const importRegex = /from\s+["'](@\/components\/[^"']+|\.\/[^"']+|@\/lib\/[^"']+)["']/g;
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      let candidate: string;
      if (importPath.startsWith("@/")) {
        candidate = path.join(projectRoot, "src", importPath.slice(2));
      } else {
        candidate = path.resolve(path.dirname(sourceFile), importPath);
      }

      for (const ext of [".tsx", ".ts", ".jsx", "/index.tsx"]) {
        const full = candidate + ext;
        if (fs.existsSync(full)) {
          if (!result.includes(full)) {
            result.push(full);
          }
          break;
        }
      }
    }
  } catch {}
  return result;
}

/**
 * Recursively searches a directory for a file named {componentName}.tsx | .ts | .jsx.
 */
function findFileByComponentName(componentName: string, searchDirs: string[]): string | null {
  const clean = componentName.trim();
  if (!clean || ["Link", "NextLink", "Fragment", "div", "span", "button", "a", "p"].includes(clean)) {
    return null;
  }

  const targetNames = [
    `${clean}.tsx`,
    `${clean}.ts`,
    `${clean}.jsx`,
    `${clean}.js`,
  ].map((n) => n.toLowerCase());

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;

    const findInDir = (currentDir: string): string | null => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".next" || entry.name.startsWith(".")) continue;
          if (entry.name.toLowerCase() === clean.toLowerCase()) {
            const idxCandidate = path.join(full, "index.tsx");
            if (fs.existsSync(idxCandidate)) return idxCandidate;
          }
          const found = findInDir(full);
          if (found) return found;
        } else if (entry.isFile()) {
          if (targetNames.includes(entry.name.toLowerCase())) {
            return full;
          }
        }
      }
      return null;
    };

    const found = findInDir(dir);
    if (found) return found;
  }
  return null;
}

/**
 * Extracts distinctive class tokens from a className string, filtering out trivial tokens.
 */
function extractDistinctiveTokens(className: string | undefined): string[] {
  if (!className || typeof className !== "string") return [];
  const IGNORED = new Set([
    "relative", "absolute", "fixed", "flex", "inline-flex", "grid", "inline-grid", "block", "hidden",
    "w-full", "h-full", "min-w-0", "max-w-full", "items-center", "justify-center", "justify-between",
    "overflow-hidden", "overflow-x-clip", "gap-1", "gap-2", "p-1", "p-2", "px-3", "py-2", "m-0",
    "border", "rounded", "rounded-md", "rounded-lg", "rounded-full", "text-sm", "text-xs", "font-bold"
  ]);

  return className
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !IGNORED.has(t));
}

export async function POST(req: Request) {
  // Local developer tooling only: it reads source files and launches an editor process.
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  try {
    const PROJECT_ROOT = process.cwd();
    const APP_DIR = path.join(PROJECT_ROOT, "src", "app");
    const COMPONENTS_DIR = path.join(PROJECT_ROOT, "src", "components");

    const body = await req.json();
    const {
      mode = "ui", // "ui" (Ctrl+Click) or "logic" (Option+Click)
      file,
      line,
      component,
      componentChain = [],
      route,
      href,
      onClickText,
      text,
      ariaLabel,
      dataTour,
      id,
      tag,
      rawTag,
      className,
      rawClassName,
      ancestorTexts = [],
    } = body || {};

    // =========================================================================
    // STEP 1: CONSTRUCT THE ACTIVE WORKING SET
    // =========================================================================
    // Find the current page and all components imported by it.
    const activeRoutePage = route ? resolveRouteFile(route, APP_DIR) : null;
    const directImports = activeRoutePage ? findImportedComponentFiles(activeRoutePage, PROJECT_ROOT) : [];
    
    // Transitive imports (components imported by direct components)
    const transitiveImports: string[] = [];
    for (const d of directImports) {
      const subs = findImportedComponentFiles(d, PROJECT_ROOT);
      for (const s of subs) {
        if (!directImports.includes(s) && !transitiveImports.includes(s)) {
          transitiveImports.push(s);
        }
      }
    }

    // Global layout files
    const layoutFile = path.join(APP_DIR, "layout.tsx");
    const layoutImports = fs.existsSync(layoutFile) ? findImportedComponentFiles(layoutFile, PROJECT_ROOT) : [];

    const activeWorkingSet = new Set<string>(
      [activeRoutePage, ...directImports, ...transitiveImports, layoutFile, ...layoutImports].filter(Boolean) as string[]
    );

    // =========================================================================
    // STEP 2: DISCOVER AND SCORE CANDIDATE FILES
    // =========================================================================
    const candidates = new Map<string, number>();

    const addCandidate = (filePath: string | null | undefined, score: number) => {
      if (!filePath || typeof filePath !== "string") return;
      let clean = filePath;
      if (clean.startsWith("file://")) clean = clean.slice(7);
      if (!path.isAbsolute(clean)) clean = path.join(PROJECT_ROOT, clean);
      if (fs.existsSync(clean)) {
        const existing = candidates.get(clean) || 0;
        candidates.set(clean, Math.max(existing, score));
      }
    };

    // 1. Direct file passed from React Fiber (_debugSource or Turbopack chunk)
    if (file && typeof file === "string") {
      if (file.includes("src_")) {
        addCandidate(resolveTurbopackChunkToPath(file, PROJECT_ROOT), 250);
      }
      let directPath = file;
      if (directPath.startsWith("file://")) directPath = directPath.slice(7);
      if (directPath.includes("turbopack://")) {
        const match = directPath.match(/src\/[^\s:()]+\.[jt]sx?/);
        if (match) directPath = match[0];
      }
      addCandidate(directPath, 240);
    }

    // 2. Logic mode destination route (Option+Click on internal link navigates to destination page logic)
    if (mode === "logic" && href && typeof href === "string" && href.startsWith("/")) {
      const destRoute = resolveRouteFile(href, APP_DIR);
      if (destRoute) addCandidate(destRoute, 350);
    }

    // 3. User components in the Fiber hierarchy (innermost leaf has highest score)
    const userComponents: string[] = [component, ...componentChain].filter(Boolean) as string[];
    userComponents.forEach((compName, idx) => {
      // First check active working set files
      for (const activePath of activeWorkingSet) {
        const baseName = path.basename(activePath, path.extname(activePath));
        if (baseName.toLowerCase() === compName.toLowerCase()) {
          addCandidate(activePath, 220 - idx * 15);
        } else {
          try {
            const content = fs.readFileSync(activePath, "utf8");
            if (
              content.includes(`export default function ${compName}`) ||
              content.includes(`export function ${compName}`) ||
              content.includes(`function ${compName}`) ||
              content.includes(`const ${compName} =`)
            ) {
              addCandidate(activePath, 200 - idx * 15);
            }
          } catch {}
        }
      }

      // If not in active working set, check filesystem
      const generalFile = findFileByComponentName(compName, [COMPONENTS_DIR, APP_DIR]);
      if (generalFile) {
        addCandidate(generalFile, 140 - idx * 15);
      }
    });

    // 4. Always include active route page & direct imports as baseline candidates
    if (activeRoutePage) addCandidate(activeRoutePage, 80);
    for (const d of directImports) addCandidate(d, 70);
    for (const l of layoutImports) addCandidate(l, 50);

    // Fallback if empty
    if (candidates.size === 0) {
      const defaultPage = activeRoutePage || path.join(APP_DIR, "page.tsx");
      addCandidate(defaultPage, 10);
    }

    // =========================================================================
    // STEP 3: SCORE CANDIDATES TO PICK THE WINNING TARGET FILE
    // =========================================================================
    let targetFile: string | null = null;
    let highestScore = -Infinity;

    const combinedClasses = `${className || ""} ${rawClassName || ""}`.trim();
    const distinctiveClasses = extractDistinctiveTokens(combinedClasses);
    const activeTags = [tag, rawTag].filter(Boolean).map((t) => t.toLowerCase());

    for (const [candidatePath, baseScore] of candidates.entries()) {
      try {
        const content = fs.readFileSync(candidatePath, "utf8");
        const lines = content.split("\n");
        let score = baseScore;

        // Active working set bonus: active files receive +60
        if (activeWorkingSet.has(candidatePath)) {
          score += 60;
        }

        // data-tour match: +120
        if (dataTour && (content.includes(`data-tour="${dataTour}"`) || content.includes(`data-tour='${dataTour}'`))) {
          score += 120;
        }

        // id match: +90
        if (id && (content.includes(`id="${id}"`) || content.includes(`id='${id}'`))) {
          score += 90;
        }

        // aria-label match: +80
        if (ariaLabel && content.includes(ariaLabel)) {
          score += 80;
        }

        // href match: +70
        if (href && (content.includes(`href="${href}"`) || content.includes(`href={'${href}'}`))) {
          score += 70;
        }

        // onClickText match: +80
        if (onClickText && (content.includes(`const ${onClickText}`) || content.includes(`function ${onClickText}`) || content.includes(`onClick={${onClickText}}`))) {
          score += 80;
        }

        // Exact text match (non-import): +75
        if (text && text.trim().length >= 3) {
          const cleanText = text.trim();
          const hasText = lines.some((l) => !l.trim().startsWith("import") && !l.trim().startsWith("//") && l.includes(cleanText));
          if (hasText) score += 75;
        }

        // Substring / phrase match: +50
        if (text && text.trim().length >= 8) {
          const words = text.trim().split(/\s+/);
          if (words.length >= 3) {
            const phrase = words.slice(0, 3).join(" ");
            if (content.includes(phrase)) score += 50;
          }
        }

        // Tag + Distinctive class tokens match: +90
        if (distinctiveClasses.length > 0) {
          let bestTagClassMatches = 0;
          for (let i = 0; i < lines.length; i++) {
            const l = lines[i];
            const hasTag = activeTags.some((t) => l.includes(`<${t}`) || (t === "a" && l.includes("<Link")));
            if (hasTag) {
              const windowText = lines.slice(i, Math.min(lines.length, i + 8)).join(" ");
              const matchedCount = distinctiveClasses.filter((cls) => windowText.includes(cls)).length;
              if (matchedCount > bestTagClassMatches) bestTagClassMatches = matchedCount;
            }
          }
          if (bestTagClassMatches >= 3) score += 90;
          else if (bestTagClassMatches >= 1) score += 40;
        }

        if (score > highestScore) {
          highestScore = score;
          targetFile = candidatePath;
        }
      } catch {}
    }

    if (!targetFile || !fs.existsSync(targetFile)) {
      return NextResponse.json({ ok: false, error: "Target file could not be determined" }, { status: 404 });
    }

    // =========================================================================
    // STEP 4: PINPOINT THE EXACT TARGET LINE IN THE WINNING FILE
    // =========================================================================
    let targetLine: number | null = null;
    const fileContent = fs.readFileSync(targetFile, "utf8");
    const fileLines = fileContent.split("\n");

    const walkToOpeningTag = (idx: number): number => {
      for (let i = idx; i >= Math.max(0, idx - 15); i--) {
        const l = fileLines[i].trim();
        if (
          l.startsWith("<button") ||
          l.startsWith("<Link") ||
          l.startsWith("<a ") ||
          l.startsWith("<input") ||
          l.startsWith("<select") ||
          l.startsWith("<form") ||
          l.startsWith("<div") ||
          l.startsWith("<section") ||
          l.startsWith("<header") ||
          l.startsWith("<nav") ||
          l.startsWith("<h1") ||
          l.startsWith("<h2") ||
          l.startsWith("<h3") ||
          l.startsWith("<h4") ||
          l.startsWith("<h5") ||
          l.startsWith("<h6") ||
          l.startsWith("<p") ||
          l.startsWith("<span") ||
          l.startsWith("<li")
        ) {
          return i + 1;
        }
      }
      return idx + 1;
    };

    if (mode === "logic") {
      // =======================================================================
      // LOGIC MODE (Option+Click): Locate handlers, mutations, effects, or state
      // =======================================================================

      // 1. Explicit onClick handler name
      if (onClickText) {
        const patterns = [
          `const ${onClickText} =`,
          `function ${onClickText}`,
          `async function ${onClickText}`,
          `const [`, // e.g. const [isOpen, setIsOpen]
        ];
        for (const p of patterns) {
          const matchIdx = fileLines.findIndex((l) => l.includes(p) && l.includes(onClickText));
          if (matchIdx !== -1) {
            targetLine = matchIdx + 1;
            break;
          }
        }
      }

      // 2. Link destination or routing logic
      if (!targetLine && href && typeof href === "string" && href.startsWith("/")) {
        const matchIdx = fileLines.findIndex((l) => l.includes(href));
        if (matchIdx !== -1) targetLine = walkToOpeningTag(matchIdx);
      }

      // 3. Data mutation or action calls (ignore import statements)
      if (!targetLine) {
        const mutationPatterns = [
          "createSecureRecord(",
          "updateDoc(",
          "setDoc(",
          "requestPrivateData(",
          "openBillingPortal(",
          "fetch(",
          "router.push(",
        ];
        for (const p of mutationPatterns) {
          const matchIdx = fileLines.findIndex((l) => !l.trim().startsWith("import") && l.includes(p));
          if (matchIdx !== -1) {
            targetLine = matchIdx + 1;
            break;
          }
        }
      }

      // 4. Primary data loading effect (ignore import statements)
      if (!targetLine) {
        const effectIdx = fileLines.findIndex((l) => !l.trim().startsWith("import") && (l.includes("useEffect(") || l.includes("useEffect(() =>")));
        if (effectIdx !== -1) targetLine = effectIdx + 1;
      }

      // 5. Component state
      if (!targetLine) {
        const stateIdx = fileLines.findIndex((l) => !l.trim().startsWith("import") && l.includes("useState("));
        if (stateIdx !== -1) targetLine = stateIdx + 1;
      }

      // 6. Component declaration fallback
      if (!targetLine) {
        const comp = component || userComponents[0];
        if (comp) {
          const declIdx = fileLines.findIndex(
            (l) => l.includes(`function ${comp}`) || l.includes(`const ${comp} =`)
          );
          if (declIdx !== -1) targetLine = declIdx + 1;
        }
      }
    } else {
      // =======================================================================
      // UI MODE (Ctrl+Click): Locate exact JSX element definition
      // =======================================================================

      // 1. Direct line passed from Fiber
      if (typeof line === "number" && line > 0 && line <= fileLines.length) {
        targetLine = line;
      }

      // 2. data-tour attribute match
      if (!targetLine && dataTour) {
        const matchIdx = fileLines.findIndex(
          (l) => l.includes(`data-tour="${dataTour}"`) || l.includes(`data-tour='${dataTour}'`)
        );
        if (matchIdx !== -1) targetLine = walkToOpeningTag(matchIdx);
      }

      // 3. id attribute match
      if (!targetLine && id) {
        const matchIdx = fileLines.findIndex(
          (l) => l.includes(`id="${id}"`) || l.includes(`id={'${id}'}`) || l.includes(`id='${id}'`)
        );
        if (matchIdx !== -1) targetLine = walkToOpeningTag(matchIdx);
      }

      // 4. aria-label attribute match (case-insensitive)
      if (!targetLine && ariaLabel) {
        const cleanAria = ariaLabel.trim().toLowerCase();
        const matchIdx = fileLines.findIndex(
          (l) => l.toLowerCase().includes("aria-label=") && l.toLowerCase().includes(cleanAria)
        );
        if (matchIdx !== -1) targetLine = walkToOpeningTag(matchIdx);
      }

      // 5. href match (for links / nav items - checks full href or final pathname segment)
      if (!targetLine && href && typeof href === "string") {
        const segs = href.split("/").filter(Boolean);
        const lastSeg = segs.length > 0 ? `/${segs[segs.length - 1]}` : null;
        
        // Try full href first
        let matchIdx = fileLines.findIndex((l) => l.includes(href));
        // If not found, try last segment e.g. "/roster" or path: "/roster"
        if (matchIdx === -1 && lastSeg && lastSeg.length >= 3) {
          matchIdx = fileLines.findIndex((l) => l.includes(`"${lastSeg}"`) || l.includes(`'${lastSeg}'`));
        }
        if (matchIdx !== -1) targetLine = walkToOpeningTag(matchIdx);
      }

      // 6. Tag + Distinctive Tailwind Classes Match (MOST ACCURATE FOR DYNAMIC CONTENT)
      if (!targetLine && distinctiveClasses.length > 0) {
        let bestLine = -1;
        let maxMatches = 0;

        for (let i = 0; i < fileLines.length; i++) {
          const l = fileLines[i];
          const hasTag = activeTags.some((t) => l.includes(`<${t}`) || (t === "a" && l.includes("<Link")));
          if (hasTag) {
            const windowText = fileLines.slice(i, Math.min(fileLines.length, i + 8)).join(" ");
            const matchedCount = distinctiveClasses.filter((cls) => windowText.includes(cls)).length;
            if (matchedCount > maxMatches) {
              maxMatches = matchedCount;
              bestLine = i + 1;
            }
          }
        }

        // Require at least 2 distinctive tokens or >= 50% match
        if (maxMatches >= 2 || (distinctiveClasses.length === 1 && maxMatches === 1)) {
          targetLine = bestLine;
        }
      }

      // 7. Exact text match (case-insensitive, non-import, non-comment, whole word or JSX content)
      if (!targetLine && text && text.trim().length >= 3) {
        const clean = text.trim();
        // Look for whole-word or quoted or tag-wrapped occurrences
        const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const wordRegex = new RegExp(`(?:>|'|"|\\s|\\b)${escaped}(?:<|'|"|\\s|\\b|,)`, "i");

        const matchIdx = fileLines.findIndex((l) => {
          const tr = l.trim();
          if (
            tr.startsWith("import") ||
            tr.startsWith("//") ||
            tr.startsWith("/*") ||
            tr.startsWith("{/*") ||
            tr.startsWith("*") ||
            tr.startsWith("type ") ||
            tr.startsWith("interface ")
          ) {
            return false;
          }
          return wordRegex.test(tr);
        });
        if (matchIdx !== -1) targetLine = walkToOpeningTag(matchIdx);
      }

      // 8. Static Substring / Phrase / Segment Match (Handles dynamic text like "Coaching Staff: {team.coachName}")
      if (!targetLine && text && text.trim().length >= 5) {
        // A. Check punctuation-separated segments (e.g. "Coaching Staff: Dexter Sargent" -> "Coaching Staff")
        const segments = text
          .split(/[:•|\-—–]/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length >= 4 && !/^\d+$/.test(s));

        for (const seg of segments) {
          const segLower = seg.toLowerCase();
          const matchIdx = fileLines.findIndex((l) => {
            const tr = l.trim();
            if (
              tr.startsWith("import") ||
              tr.startsWith("//") ||
              tr.startsWith("/*") ||
              tr.startsWith("{/*") ||
              tr.startsWith("*")
            ) {
              return false;
            }
            return tr.toLowerCase().includes(segLower);
          });
          if (matchIdx !== -1) {
            targetLine = walkToOpeningTag(matchIdx);
            break;
          }
        }

        // B. Check 2-word and 3-word windows
        if (!targetLine) {
          const words = text.trim().split(/\s+/);
          const candidatePhrases: string[] = [];
          if (words.length >= 2) candidatePhrases.push(words.slice(0, 2).join(" ").toLowerCase());
          if (words.length >= 3) candidatePhrases.push(words.slice(0, 3).join(" ").toLowerCase());

          for (const phrase of candidatePhrases) {
            const matchIdx = fileLines.findIndex((l) => {
              const tr = l.trim();
              if (
                tr.startsWith("import") ||
                tr.startsWith("//") ||
                tr.startsWith("/*") ||
                tr.startsWith("{/*") ||
                tr.startsWith("*")
              ) {
                return false;
              }
              return tr.toLowerCase().includes(phrase);
            });
            if (matchIdx !== -1) {
              targetLine = walkToOpeningTag(matchIdx);
              break;
            }
          }
        }
      }

      // 9. Ancestor text match
      if (!targetLine && ancestorTexts && Array.isArray(ancestorTexts)) {
        for (const aText of ancestorTexts) {
          if (aText.length >= 3) {
            const cleanA = aText.trim().toLowerCase();
            const matchIdx = fileLines.findIndex((l) => !l.trim().startsWith("import") && l.toLowerCase().includes(cleanA));
            if (matchIdx !== -1) {
              targetLine = walkToOpeningTag(matchIdx);
              break;
            }
          }
        }
      }

      // 10. onClick handler reference in JSX
      if (!targetLine && onClickText) {
        const matchIdx = fileLines.findIndex(
          (l) => l.includes("onClick=") && l.includes(onClickText)
        );
        if (matchIdx !== -1) targetLine = walkToOpeningTag(matchIdx);
      }

      // 11. Component's main JSX return statement fallback
      if (!targetLine) {
        const comp = component || userComponents[0];
        let compStartIdx = 0;
        if (comp) {
          const declIdx = fileLines.findIndex(
            (l) => l.includes(`function ${comp}`) || l.includes(`const ${comp} =`)
          );
          if (declIdx !== -1) compStartIdx = declIdx;
        }

        for (let i = compStartIdx; i < fileLines.length; i++) {
          const l = fileLines[i].trim();
          // Must be JSX return, NOT arrow function cleanup e.g. return () => {
          if ((l.startsWith("return (") || l.startsWith("return <")) && !l.includes("=>")) {
            const prev = fileLines.slice(Math.max(0, i - 5), i).join(" ");
            if (!prev.includes("useEffect") && !prev.includes("useLayoutEffect")) {
              targetLine = i + 1;
              break;
            }
          }
        }
      }
    }

    const finalLine = targetLine && targetLine > 0 ? targetLine : 1;

    // =========================================================================
    // STEP 5: LAUNCH VISUAL STUDIO CODE BACKGROUND TAB
    // =========================================================================
    const targetArg = `${targetFile}:${finalLine}`;
    const targetUrl = `vscode://file/${targetArg}`;

    const vsCodeAppPaths = [
      "/Users/dextersargent/Desktop/Visual Studio Code.app",
      "/Applications/Visual Studio Code.app",
      "/Users/dextersargent/Downloads/Visual Studio Code 2.app",
    ];

    let foundAppPath: string | null = null;
    for (const p of vsCodeAppPaths) {
      if (fs.existsSync(p)) {
        foundAppPath = p;
        break;
      }
    }

    // Launch in background (-g) so the developer's window layout / sizes are undisturbed
    if (process.platform === "darwin") {
      const openArgs = foundAppPath
        ? ["-a", foundAppPath, "-g", targetUrl]
        : ["-b", "com.microsoft.VSCode", "-g", targetUrl];

      const child = spawn("open", openArgs, {
        detached: true,
        stdio: "ignore",
      });

      child.on("error", () => {
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
