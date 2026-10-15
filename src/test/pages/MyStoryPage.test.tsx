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

  it("renders full personal story and photo slots for the creator (Dexter / platform owner)", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "dexter-1", email: "dextersargent@gmail.com" },
      isPlatformAdmin: true,
      loading: false,
    });

    render(<MyStoryPage />);

    // Headline & premise
    expect(screen.getByRole("heading", { name: /built by a coach, not a company/i })).toBeInTheDocument();
    expect(screen.getByText(/90 people came out to compete/i)).toBeInTheDocument();
    expect(screen.getByText(/11v11 semi-contact flag league/i)).toBeInTheDocument();

    // Photo slots
    expect(screen.getByText("Featured Photo Slot")).toBeInTheDocument();
    expect(screen.getByText(/Photo Slot: 5v5 Tryout Day/i)).toBeInTheDocument();
    expect(screen.getByText(/Photo Slot: 11v11 Semi-Contact Gameday/i)).toBeInTheDocument();

    // Author identity & sign-off
    expect(screen.getAllByText(/Dexter Sargent/i).length).toBeGreaterThan(0);
    expect(screen.getByText("dextersargent@gmail.com")).toBeInTheDocument();

    // Does not repeat feature pricing/upsell components
    expect(screen.queryByText(/Subscription Breakdown/i)).toBeNull();
    expect(screen.queryByText(/Pricing Plans/i)).toBeNull();
  });

  it("blocks and redirects unauthorized visitors who are not Dexter", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user-2", email: "visitor@example.com" },
      isPlatformAdmin: false,
      loading: false,
    });

    render(<MyStoryPage />);

    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(screen.queryByText(/90 people came out to compete/i)).toBeNull();
  });

  it("redirects unauthenticated visitors", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isPlatformAdmin: false,
      loading: false,
    });

    render(<MyStoryPage />);

    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(screen.queryByText(/90 people came out to compete/i)).toBeNull();
  });
});
