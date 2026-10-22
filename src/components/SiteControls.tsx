"use client";

import ThemeToggle from "@/components/ThemeToggle";
import AccountMenu from "@/components/AccountMenu";

/** Theme toggle + sign-in / account menu, shown in every page header. */
export default function SiteControls({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 shrink-0 ${className}`}>
      <ThemeToggle size="md" />
      <AccountMenu />
    </div>
  );
}
