"use client";

import { useEffect, useState } from "react";
import { THROTTLE_EVENT, type ThrottleEventDetail } from "@/lib/secureWrites";

/** Shows a countdown while a rate-limited request waits to retry automatically. */
export default function ThrottleNotice() {
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const onThrottle = (event: Event) => {
      const seconds = (event as CustomEvent<ThrottleEventDetail>).detail?.seconds || 5;
      setNow(Date.now());
      setRetryAt(Date.now() + seconds * 1000);
    };
    window.addEventListener(THROTTLE_EVENT, onThrottle);
    return () => window.removeEventListener(THROTTLE_EVENT, onThrottle);
  }, []);

  useEffect(() => {
    if (retryAt === null) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= retryAt) setRetryAt(null);
    }, 500);
    return () => clearInterval(timer);
  }, [retryAt]);

  if (retryAt === null) return null;
  const seconds = Math.max(1, Math.ceil((retryAt - now) / 1000));
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] rounded-xl border border-amber-500/40 bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-amber-200 shadow-xl"
    >
      Too many requests, retrying in {seconds}s…
    </div>
  );
}
