"use client";

import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";

export type ThemeMode = "dark" | "light";
const THEME_STORAGE_KEY = "flagos_theme_mode_v2";

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
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "dark";
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (saved === "light" || saved === "dark") {
        return saved;
      }
      if (saved === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
    } catch {}
    return "dark";
  });

  const applyTheme = (mode: ThemeMode) => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(mode);
    root.setAttribute("data-theme", mode);
    root.style.colorScheme = mode;
  };

  useLayoutEffect(() => {
    applyTheme(themeMode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {}
  }, [themeMode]);

  // Keep embedded showcase frames and the parent page in sync: storage events
  // fire in other same-origin documents when the theme changes.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      if (event.newValue === "light" || event.newValue === "dark") {
        setThemeModeState(event.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {}
    applyTheme(mode);
  };

  const toggleTheme = () => {
    const next: ThemeMode = themeMode === "dark" ? "light" : "dark";
    setThemeMode(next);
  };

  return (
    <ThemeContext.Provider value={{ themeMode, resolvedTheme: themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
