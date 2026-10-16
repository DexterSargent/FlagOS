import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MyStoryPage from "@/app/my-story/page";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
}));

const mockUseAuth = vi.fn();
vi.mock("@/lib/authContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/themeContext", () => ({
  useTheme: () => ({
    resolvedTheme: "dark",
    setTheme: vi.fn(),
  }),
}));

describe("My Story Page (/my-story)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("presents Dexter's story as a clear chronological path from football to FlagOS", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "dexter-1", email: "dextersargent@gmail.com" },
      isPlatformAdmin: true,
      loading: false,
    });

    render(<MyStoryPage />);

    expect(
      screen.getByRole("heading", {
        name: /i grew up carrying a football to school/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /it started with two footballs/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /i made my own way to toronto/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /i learned how much the team matters/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /a week helping out became something bigger/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /at 0–7, we had one week to prepare/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /the software came from a problem we had/i }),
    ).toBeInTheDocument();

    expect(screen.getAllByText(/dartmouth destroyers/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/\$4,500 athletic scholarship from york/i)).toBeInTheDocument();
    expect(screen.getByText(/alfred olay/i)).toBeInTheDocument();
    expect(screen.getByText(/slept on theo's pull-out couch/i)).toBeInTheDocument();
    expect(screen.getByText(/17–8 to reach the playoffs/i)).toBeInTheDocument();
    expect(screen.getByText(/ninety athletes came to 5v5 tryouts/i)).toBeInTheDocument();
    expect(screen.getByText(/partners for planning/i)).toBeInTheDocument();

    const storySections = Array.from(document.querySelectorAll("article[id]")).map(
      (section) => section.id,
    );
    expect(storySections).toEqual([
      "first-football",
      "leaving-home",
      "york",
      "coaching",
      "turnaround",
      "flagos",
    ]);
    expect(
      screen.getByRole("navigation", { name: /story contents/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/photo slot|archived memory slot/i)).toBeNull();
    expect(screen.queryByText(/corporate greed|frictionless sideline/i)).toBeNull();
  });

  it("blocks and redirects unauthorized visitors who are not Dexter", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user-2", email: "visitor@example.com" },
      isPlatformAdmin: false,
      loading: false,
    });

    render(<MyStoryPage />);

    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(screen.queryByText(/two footballs and an afternoon at recess/i)).toBeNull();
  });

  it("redirects unauthenticated visitors", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isPlatformAdmin: false,
      loading: false,
    });

    render(<MyStoryPage />);

    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(screen.queryByText(/two footballs and an afternoon at recess/i)).toBeNull();
  });
});
