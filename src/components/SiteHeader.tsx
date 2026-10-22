"use client";

import Link from "next/link";
import { FlagOSText } from "@/components/FlagOSText";
import SiteControls from "@/components/SiteControls";

/** Minimal header for pages that don't have a league, team or marketing header of their own. */
export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-token bg-surface/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-3 sm:px-6 h-12">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="text-sm font-black uppercase tracking-wider text-text-primary" aria-label="FlagOS home">
            <FlagOSText />
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-xs font-bold text-text-secondary">
            <Link href="/leagues" className="hover:text-text-primary transition-colors">Directory</Link>
            <Link href="/pricing" className="hover:text-text-primary transition-colors">Pricing</Link>
          </nav>
        </div>
        <SiteControls />
      </div>
    </header>
  );
}
