"use client";

import React, { useState, useEffect } from "react";
import { useTheme, ThemeMode } from "@/lib/themeContext";
import { Sun, Moon, Monitor } from "lucide-react";

interface ThemeToggleProps {
  variant?: "icon" | "segmented";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function ThemeToggle({
  variant = "icon",
  className = "",
  size = "md",
}: ThemeToggleProps) {
  const { themeMode, resolvedTheme, setThemeMode, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render placeholder to avoid layout shift before hydration
    return (
      <div
        className={`inline-flex items-center justify-center rounded-xl bg-surface-inset border border-token ${
          size === "sm" ? "w-7 h-7" : size === "lg" ? "w-10 h-10" : "w-8 h-8"
        } ${className}`}
        aria-hidden="true"
      />
    );
  }

  if (variant === "segmented") {
    const options: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
      { id: "dark", label: "Dark", icon: <Moon className="w-3.5 h-3.5" /> },
      { id: "light", label: "Light", icon: <Sun className="w-3.5 h-3.5" /> },
      { id: "system", label: "System", icon: <Monitor className="w-3.5 h-3.5" /> },
    ];

    return (
      <div
        className={`inline-flex items-center gap-1 p-1 rounded-xl bg-surface-inset border border-token ${className}`}
        role="group"
        aria-label="Theme selection"
      >
        {options.map((opt) => {
          const isActive = themeMode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setThemeMode(opt.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-black"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Single button icon toggle (switches between Light and Dark)
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer bg-surface-inset hover:bg-surface-hover border border-token text-text-secondary hover:text-text-primary ${
        size === "sm"
          ? "w-7 h-7"
          : size === "lg"
          ? "w-10 h-10"
          : "w-8 h-8"
      } ${className}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? (
        <Sun className={`${size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} text-amber-400 transition-transform duration-200 hover:rotate-45`} />
      ) : (
        <Moon className={`${size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} text-cyan-700 transition-transform duration-200 hover:-rotate-12`} />
      )}
    </button>
  );
}
