"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "dark" | "light" | "system";

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: "dark" | "light";
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "dark",
  resolvedTheme: "dark",
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  // Apply theme class and data-theme attribute to <html>
  const applyTheme = (mode: ThemeMode) => {
    if (typeof window === "undefined") return;
    const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved: "dark" | "light" = mode === "system" ? (isSystemDark ? "dark" : "light") : mode;

    setResolvedTheme(resolved);

    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.setAttribute("data-theme", resolved);
    root.style.colorScheme = resolved;
  };

  useEffect(() => {
    let initialMode: ThemeMode = "dark";
    try {
      const saved = localStorage.getItem("flagos_theme_mode") as ThemeMode | null;
      if (saved && (saved === "dark" || saved === "light" || saved === "system")) {
        initialMode = saved;
      }
    } catch {}

    setThemeModeState(initialMode);
    applyTheme(initialMode);
    setMounted(true);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      let currentMode: ThemeMode = "dark";
      try {
        const saved = localStorage.getItem("flagos_theme_mode") as ThemeMode | null;
        if (saved) currentMode = saved;
      } catch {}
      if (currentMode === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem("flagos_theme_mode", mode);
    } catch {}
    applyTheme(mode);
  };

  const toggleTheme = () => {
    const next: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
    setThemeMode(next);
  };

  return (
    <ThemeContext.Provider value={{ themeMode, resolvedTheme, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
