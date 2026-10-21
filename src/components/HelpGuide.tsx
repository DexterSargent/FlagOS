"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { HelpCircle } from "lucide-react";

const HelpGuideContent = dynamic(() => import("./HelpGuideContent"), { ssr: false });

function HelpGuideForRoute({ pathname }: { pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const compactHost = Boolean(pathname?.includes("/play-by-play") || pathname?.endsWith("/playbook"));
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open help guide"
        className={`fixed left-3 bottom-3 z-40 items-center justify-center w-10 h-10 rounded-full bg-[#3CA505] text-black shadow-lg hover:brightness-110 transition ${compactHost ? "hidden md:flex" : "flex"}`}
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <HelpCircle className="w-5 h-5" />
      </button>
      {open && <HelpGuideContent onClose={() => setOpen(false)} />}
    </>
  );
}

export default function HelpGuide() {
  const pathname = usePathname();
  return <HelpGuideForRoute key={pathname} pathname={pathname} />;
}
