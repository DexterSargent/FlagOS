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
    const { file, component, route, line = 1 } = body || {};

    let targetFile: string | null = null;
    let targetLine: number = typeof line === "number" && line > 0 ? line : 1;

    // 1. Direct file resolution
    if (file) {
      const resolved = path.isAbsolute(file)
        ? file
        : path.join(PROJECT_ROOT, file.replace(/^\/+/, ""));
      if (fs.existsSync(/*turbopackIgnore: true*/ resolved)) {
        targetFile = resolved;
      }
    }

    // 2. Component lookup
    if (!targetFile && component) {
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

    // 3. Route lookup (App router page.tsx)
    if (!targetFile && route) {
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

    if (!targetFile) {
      return NextResponse.json(
        { ok: false, error: "Could not resolve target file" },
        { status: 404 }
      );
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
    return NextResponse.json({
      ok: true,
      file: relative,
      fullPath: targetFile,
      line: targetLine,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
