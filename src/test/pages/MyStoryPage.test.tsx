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
        name: /building flagos: software born out of necessity/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /childhood roots in dartmouth/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /high school & the recruiting grind/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /york university varsity career/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /coaching york women's flag football/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /rebuilding & varsity status/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^building flagos$/i }),
    ).toBeInTheDocument();

    expect(screen.getAllByText(/dartmouth destroyers/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/full oua athletic scholarship to york university/i)).toBeInTheDocument();
    expect(screen.getByText(/sleep on a couch in their living room/i)).toBeInTheDocument();
    expect(screen.getByText(/17-8 to qualify for the playoffs/i)).toBeInTheDocument();
    expect(screen.getByText(/york university women's flag football league/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/\$30\/month for team playbooks/i).length,
    ).toBeGreaterThan(0);

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
