"use client";

import { useCallback, useEffect, useState } from "react";
import { loadDemoSandbox } from "./demoSandboxRuntime";

type DemoSandbox = typeof import("./demoSandbox");

export function useDemoSandbox(enabled: boolean) {
  const [result, setResult] = useState<{
    attempt: number; sandbox: DemoSandbox | null; error: Error | null;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let disposed = false;
    if (enabled) {
      void loadDemoSandbox().then(
        (sandbox) => { if (!disposed) setResult({ attempt, sandbox, error: null }); },
        (reason: unknown) => {
          if (!disposed) setResult({
            attempt, sandbox: null,
            error: reason instanceof Error ? reason : new Error("Could not load the demo sandbox."),
          });
        }
      );
    }
    return () => { disposed = true; };
  }, [enabled, attempt]);

  const current = result?.attempt === attempt ? result : null;
  return {
    sandbox: enabled ? current?.sandbox ?? null : null,
    loading: enabled && !current?.sandbox && !current?.error,
    error: enabled ? current?.error ?? null : null,
    retry,
  };
}
