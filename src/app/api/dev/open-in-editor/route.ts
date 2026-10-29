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
    const { file, component, route, line, text, ariaLabel, dataTour, id } = body || {};

    let targetFile: string | null = null;
    let targetLine: number = 1;

    // 1. Direct file resolution (handles Turbopack, Webpack, [project], and absolute/relative paths)
    if (file && typeof file === "string") {
      const srcMatch = file.match(/src\/[^\s\?:\)]+/);
      if (srcMatch) {
        const candidate = path.join(PROJECT_ROOT, srcMatch[0]);
        if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
          targetFile = candidate;
        }
      }

      if (!targetFile) {
        const cleaned = file.replace(/^\[project\]\/?/, "").replace(/^\/+/, "").split("?")[0];
        const candidate = path.isAbsolute(file) && fs.existsSync(/*turbopackIgnore: true*/ file)
          ? file
          : path.join(PROJECT_ROOT, cleaned);
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

    // 3. Route lookup (falls back to the App router page.tsx for the active URL)
    if (!targetFile && route && typeof route === "string") {
      const clean = route.split("?")[0].replace(/^\/+|\/+$/g, "");
      const segments = clean ? clean.split("/") : [];

      let current = APP_DIR;
      let matched = true;

      for (const seg of segments) {
        if (!fs.existsSync(/*turbopackIgnore: true*/ current)) {
          matched = false;
          break;
        }
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

        matched = false;
        break;
      }

      if (matched) {
        const pageCandidate = path.join(current, "page.tsx");
        if (fs.existsSync(/*turbopackIgnore: true*/ pageCandidate)) {
          targetFile = pageCandidate;
        }
      }
    }

    // 4. Ultimate fallback: root page.tsx
    if (!targetFile) {
      const rootPage = path.join(APP_DIR, "page.tsx");
      if (fs.existsSync(/*turbopackIgnore: true*/ rootPage)) {
        targetFile = rootPage;
      }
    }

    if (!targetFile) {
      return NextResponse.json(
        { ok: false, error: "Could not resolve target file" },
        { status: 404 }
      );
    }

    // Determine the most accurate line inside targetFile
    try {
      const fileContent = fs.readFileSync(/*turbopackIgnore: true*/ targetFile, "utf8");
      const fileLines = fileContent.split("\n");
      const totalLines = fileLines.length;

      let foundLine: number | null = null;

      // Priority A: Search by distinctive data-tour attribute
      if (!foundLine && dataTour && typeof dataTour === "string") {
        const matchIdx = fileLines.findIndex((l) => l.includes(`data-tour="${dataTour}"`));
        if (matchIdx !== -1) foundLine = matchIdx + 1;
      }

      // Priority B: Search by id attribute
      if (!foundLine && id && typeof id === "string") {
        const matchIdx = fileLines.findIndex((l) => l.includes(`id="${id}"`) || l.includes(`id={'${id}'}`));
        if (matchIdx !== -1) foundLine = matchIdx + 1;
      }

      // Priority C: Search by aria-label
      if (!foundLine && ariaLabel && typeof ariaLabel === "string") {
        const matchIdx = fileLines.findIndex((l) => l.includes(`aria-label="${ariaLabel}"`));
        if (matchIdx !== -1) foundLine = matchIdx + 1;
      }

      // Priority D: Search by component usage or declaration if inside this file
      if (!foundLine && component && typeof component === "string") {
        const compLower = component.toLowerCase();
        const matchIdx = fileLines.findIndex((l) => {
          const trimmed = l.trim();
          if (trimmed.startsWith("import ") || trimmed.startsWith("import{")) return false;
          return (
            l.includes(`<${component}`) ||
            l.toLowerCase().includes(`function ${compLower}`) ||
            l.toLowerCase().includes(`const ${compLower}`)
          );
        });
        if (matchIdx !== -1) foundLine = matchIdx + 1;
      }

      // Priority E: Search by clicked text content (e.g. "SEASON STATS", "SCHEDULE", "ROSTER")
      if (!foundLine && text && typeof text === "string") {
        const cleanText = text.trim();
        if (cleanText.length >= 3) {
          const lowerText = cleanText.toLowerCase();
          // First pass: look for exact text in JSX (excluding import statements)
          let candidateIdx = fileLines.findIndex((l) => {
            const trimmed = l.trim();
            if (trimmed.startsWith("import ") || trimmed.startsWith("import{")) return false;
            return l.toLowerCase().includes(lowerText);
          });

          // Second pass: try first 2-3 words if text is long
          if (candidateIdx === -1 && cleanText.includes(" ")) {
            const shortText = cleanText.split(" ").slice(0, 3).join(" ").toLowerCase();
            if (shortText.length >= 4) {
              candidateIdx = fileLines.findIndex((l) => {
                const trimmed = l.trim();
                if (trimmed.startsWith("import ") || trimmed.startsWith("import{")) return false;
                return l.toLowerCase().includes(shortText);
              });
            }
          }

          if (candidateIdx !== -1) {
            foundLine = candidateIdx + 1;
          }
        }
      }

      // Priority F: Use supplied line number ONLY if it is within actual file line bounds
      if (!foundLine && typeof line === "number" && line > 0 && line <= totalLines) {
        foundLine = line;
      }

      // Default to top of file (line 1), never beyond EOF
      targetLine = foundLine || 1;
    } catch {
      targetLine = 1;
    }

    // Launch specifically in Visual Studio Code (not Antigravity)
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
    console.log(`[DevIDE] Focused in VS Code: ${relative}:${targetLine}`);

    return NextResponse.json({
      ok: true,
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
