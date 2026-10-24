"use client";

import ThemeToggle from "@/components/ThemeToggle";
import AccountMenu from "@/components/AccountMenu";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";

/** Guide + theme toggle + sign-in / account menu, shown in every page header. */
export default function SiteControls({
  className = "",
  guideLabelClassName,
}: {
  className?: string;
  guideLabelClassName?: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 shrink-0 ${className}`}>
      <PageGuideButton labelClassName={guideLabelClassName} />
      <ThemeToggle size="md" />
      <AccountMenu />
    </div>
  );
}
