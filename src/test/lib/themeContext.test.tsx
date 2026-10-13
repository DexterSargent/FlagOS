import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "@/lib/themeContext";

function ThemePreferenceProbe() {
  const { setThemeMode } = useTheme();
  return <button onClick={() => setThemeMode("light")}>Use light mode</button>;
}

describe("ThemeProvider default", () => {
  it("defaults to dark despite a legacy saved light-mode preference", async () => {
    localStorage.setItem("flagos_theme_mode", "light");

    render(
      <ThemeProvider>
        <ThemePreferenceProbe />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
    });
    expect(document.documentElement).not.toHaveClass("light");
  });

  it("persists a newly selected light-mode preference", async () => {
    render(
      <ThemeProvider>
        <ThemePreferenceProbe />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Use light mode" }));

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("light");
    });
    expect(localStorage.getItem("flagos_theme_mode_v2")).toBe("light");
  });
});
