import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ThemeToggle from "@/components/ThemeToggle";
import * as themeContext from "@/lib/themeContext";

vi.mock("@/lib/themeContext", () => ({
  useTheme: vi.fn(),
}));

describe("ThemeToggle", () => {
  const mockSetThemeMode = vi.fn();
  const mockToggleTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders single icon toggle and calls toggleTheme on click", () => {
    (themeContext.useTheme as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      themeMode: "dark",
      resolvedTheme: "dark",
      setThemeMode: mockSetThemeMode,
      toggleTheme: mockToggleTheme,
    });

    const { rerender } = render(<ThemeToggle variant="icon" size="md" />);

    const button = screen.getByRole("button", { name: /Switch to Light Mode/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);

    // When resolvedTheme is light
    (themeContext.useTheme as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      themeMode: "light",
      resolvedTheme: "light",
      setThemeMode: mockSetThemeMode,
      toggleTheme: mockToggleTheme,
    });
    rerender(<ThemeToggle variant="icon" size="sm" />);
    expect(screen.getByRole("button", { name: /Switch to Dark Mode/i })).toBeInTheDocument();
  });

  it("renders segmented control and calls setThemeMode on option click", () => {
    (themeContext.useTheme as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      themeMode: "dark",
      resolvedTheme: "dark",
      setThemeMode: mockSetThemeMode,
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle variant="segmented" size="lg" />);

    expect(screen.getByRole("group", { name: "Theme selection" })).toBeInTheDocument();
    const lightBtn = screen.getByRole("button", { name: /Light/i });
    fireEvent.click(lightBtn);

    expect(mockSetThemeMode).toHaveBeenCalledWith("light");
  });
});
