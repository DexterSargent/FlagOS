"use client";

import Link from "next/link";
import { FlagOSText } from "@/components/FlagOSText";

/** Slim "Powered by FlagOS" footer for pages without a league or team footer. `compact` suits full-screen consoles. */
export default function PoweredByFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer
      className={`relative z-10 w-full shrink-0 border-t border-token bg-surface px-6 text-text-muted ${
        compact ? "py-1 text-[10px]" : "py-4 text-xs"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 font-medium">
        <span>Powered by</span>
        <Link href="/" aria-label="FlagOS home" className="hover:opacity-80 transition-opacity">
          <FlagOSText />
        </Link>
      </div>
    </footer>
  );
}
