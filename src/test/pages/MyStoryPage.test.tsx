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

  it("renders full personal narrative, childhood roots, York University career, coaching turnaround, and photo slots for Dexter", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "dexter-1", email: "dextersargent@gmail.com" },
      isPlatformAdmin: true,
      loading: false,
    });

    render(<MyStoryPage />);

    // Headline & premise
    expect(screen.getByRole("heading", { name: /why i built flagos/i })).toBeInTheDocument();

    // Chapter 1: Recess & Two footballs & Persuasive letter
    expect(screen.getByText(/love at first catch/i)).toBeInTheDocument();
    expect(screen.getByText(/persuasive writing/i)).toBeInTheDocument();

    // Chapter 2: Nova Scotia All-Star & Cold-Email Recruiting Journey
    expect(screen.getByText(/nova scotia all-star, the cold-email grind, and leaving home/i)).toBeInTheDocument();
    expect(screen.getAllByText(/nova scotia/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$4,500/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/university of toronto/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/team nova scotia flag football/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sportsmanship award/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/brian jones/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/grey cup/i).length).toBeGreaterThan(0);

    // Chapter 3: York University Lions, Special Teams & Software Engineering Degree
    expect(screen.getByText(/four years with the york lions \(2021–2024\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/york lions/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/special teams/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/blocked kick/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/windsor/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/alfred olay/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/all-canadian/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/quit the york team/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/pull-out couch/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/software engineering/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/final year/i).length).toBeGreaterThan(0);

    // Chapter 4 & 5: Reading week, OWIFA, eager sponges lacking ego, club executive structure, 0-7 to playoffs, Waterloo, Guelph, tendency adjustment
    expect(screen.getByText(/a reading week favor that changed everything/i)).toBeInTheDocument();
    expect(screen.getAllByText(/sponges/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/lacked the ego/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/one week, a new playbook, and 0-7 to the playoffs/i)).toBeInTheDocument();
    expect(screen.getAllByText(/executive structure/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/guelph/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/waterloo/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/tendency/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/8th vs\. 9th/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/17-8/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/western/i).length).toBeGreaterThan(0);

    // Chapter 6 & 7: Varsity 2026, Theo's hiring as Recruiting Coordinator at 25, 90 players, YUWFFL, Partners for Planning, Play-by-Play Wizard
    expect(screen.getByText(/varsity status/i)).toBeInTheDocument();
    expect(screen.getAllByText(/recruiting coordinator/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/25 years old/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/theo/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/ninety players on the turf, and the birth of flagos/i)).toBeInTheDocument();
    expect(screen.getAllByText(/play-by-play wizard/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/extreme volunteer constraints/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/former varsity tackle teammates/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no one outside our team/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/leap of faith/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/yuwffl/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/partners for planning/i)).toBeInTheDocument();
    expect(screen.getByText(/my assistant coaches could manage everything without a great deal of stress or effort/i)).toBeInTheDocument();
    expect(screen.getByText(/weren’t exactly successful in retaining all 90 athletes/i)).toBeInTheDocument();
    expect(screen.getByText(/two separate operating modes/i)).toBeInTheDocument();
    expect(screen.getAllByText(/corporate greed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/user-base/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/higher-priced tiers/i).length).toBeGreaterThan(0);

    // Photo slots
    expect(screen.getByText(/photo slot: where it began/i)).toBeInTheDocument();
    expect(screen.getByText(/photo slot: nova scotia high school football/i)).toBeInTheDocument();
    expect(screen.getByText(/photo slot: york university football/i)).toBeInTheDocument();
    expect(screen.getByText(/photo slot: the 0-7 turnaround & playoff game/i)).toBeInTheDocument();
    expect(screen.getByText(/photo slot: the 90-player tryout & team/i)).toBeInTheDocument();

    // Author identity & sign-off
    expect(screen.getAllByText(/dexter sargent/i).length).toBeGreaterThan(0);
    expect(screen.getByText("dextersargent@gmail.com")).toBeInTheDocument();

    // Zero commercial SaaS upsell
    expect(screen.queryByText(/subscription breakdown/i)).toBeNull();
    expect(screen.queryByText(/pricing plans/i)).toBeNull();
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
