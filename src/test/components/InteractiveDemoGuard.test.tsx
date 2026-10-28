import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import InteractiveDemoGuard, { isPathAllowedForFeature } from "@/components/InteractiveDemoGuard";

describe("InteractiveDemoGuard & Embed Isolation", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  describe("isPathAllowedForFeature", () => {
    it("allows same path or query parameter variations", () => {
      expect(isPathAllowedForFeature("/schedule", "/schedule")).toBe(true);
      expect(isPathAllowedForFeature("/matches/match_1/play-by-play", "/matches/match_1/play-by-play")).toBe(true);
      expect(isPathAllowedForFeature("/teams/team_kc/playbook", "/teams/team_kc/playbook")).toBe(true);
      expect(isPathAllowedForFeature("/league/default", "/league/default")).toBe(true);
    });

    it("bars paths that leave the feature being demonstrated", () => {
      // On schedule: clicking to a match or team is barred
      expect(isPathAllowedForFeature("/matches/match_1", "/schedule")).toBe(false);
      expect(isPathAllowedForFeature("/teams/team_apex", "/schedule")).toBe(false);
      expect(isPathAllowedForFeature("/pricing", "/schedule")).toBe(false);

      // On league dashboard: clicking to stats or teams is barred
      expect(isPathAllowedForFeature("/stats", "/league/default")).toBe(false);
      expect(isPathAllowedForFeature("/teams", "/league/default")).toBe(false);

      // On playbook: clicking to league or schedule is barred
      expect(isPathAllowedForFeature("/league/default", "/teams/team_kc/playbook")).toBe(false);
      expect(isPathAllowedForFeature("/schedule", "/teams/team_kc/playbook")).toBe(false);

      // On play-by-play: clicking to teams or league is barred
      expect(isPathAllowedForFeature("/teams", "/matches/match_1/play-by-play")).toBe(false);
    });
  });

  describe("InteractiveDemoGuard Component", () => {
    it("does not render when not embedded", () => {
      Object.defineProperty(window, "location", {
        writable: true,
        value: new URL("http://localhost:3000/schedule"),
      });

      const { container } = render(
        <div>
          <a href="/matches/match_1" id="test-link">Match</a>
          <InteractiveDemoGuard />
        </div>
      );

      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it("intercepts barred links in embedded frame and displays the immersion notice popup", () => {
      Object.defineProperty(window, "location", {
        writable: true,
        value: new URL("http://localhost:3000/schedule?embed=true&demo=true"),
      });

      render(
        <div>
          <a href="/matches/match_w16_1" id="test-match-link">View Match</a>
          <InteractiveDemoGuard />
        </div>
      );

      // Initially no modal
      expect(screen.queryByRole("dialog")).toBeNull();

      // Click the unallowed link
      const link = screen.getByRole("link", { name: /View Match/i });
      fireEvent.click(link);

      // Modal appears
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(
        screen.getByText(
          /To immerse yourself completely please feel free to explore our demo league\. be aware that nothing will be saved, if you refresh the page the data you have altered will reset\./i
        )
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Explore Demo League/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Stay in Preview/i })).toBeInTheDocument();

      // Dismiss dialog
      fireEvent.click(screen.getByRole("button", { name: /Stay in Preview/i }));
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("navigates top window to /league/default?demo=true when clicking Explore Demo League", () => {
      const topLocation = { href: "" };
      Object.defineProperty(window, "top", {
        writable: true,
        value: { location: topLocation },
      });
      Object.defineProperty(window, "self", {
        writable: true,
        value: {},
      });
      Object.defineProperty(window, "location", {
        writable: true,
        value: new URL("http://localhost:3000/schedule?embed=true&demo=true"),
      });

      render(
        <div>
          <a href="/stats" id="test-stats-link">Stats</a>
          <InteractiveDemoGuard />
        </div>
      );

      fireEvent.click(screen.getByRole("link", { name: /Stats/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      const exploreBtn = screen.getByRole("button", { name: /Explore Demo League/i });
      fireEvent.click(exploreBtn);

      expect(topLocation.href).toBe("/league/default?demo=true");
    });

    it("intercepts target=_blank links in embedded frame", () => {
      Object.defineProperty(window, "location", {
        writable: true,
        value: new URL("http://localhost:3000/schedule?embed=true"),
      });

      render(
        <div>
          <a href="https://example.com" target="_blank" rel="noreferrer">External</a>
          <InteractiveDemoGuard />
        </div>
      );

      fireEvent.click(screen.getByRole("link", { name: /External/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Close dialog via X button
      const closeBtn = screen.getByRole("button", { name: /Close dialog/i });
      fireEvent.click(closeBtn);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("intercepts programmatic history.pushState and history.replaceState", () => {
      Object.defineProperty(window, "location", {
        writable: true,
        value: new URL("http://localhost:3000/schedule?embed=true"),
      });

      render(<InteractiveDemoGuard />);

      act(() => {
        window.history.pushState({}, "", "/teams/other-team");
      });
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Close dialog via Escape key
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();

      // Test replaceState
      act(() => {
        window.history.replaceState({}, "", "/stats");
      });
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("ignores anchor clicks with href=# or in-page hash links", () => {
      Object.defineProperty(window, "location", {
        writable: true,
        value: new URL("http://localhost:3000/schedule?embed=true"),
      });

      render(
        <div>
          <a href="#" id="hash-link">Hash</a>
          <a href="#section" id="section-link">Section</a>
          <InteractiveDemoGuard />
        </div>
      );

      fireEvent.click(screen.getByRole("link", { name: "Hash" }));
      expect(screen.queryByRole("dialog")).toBeNull();

      fireEvent.click(screen.getByRole("link", { name: "Section" }));
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("falls back to window.location when top and self are equal", () => {
      const locationObj = {
        href: "http://localhost:3000/schedule?embed=true",
        search: "?embed=true",
        pathname: "/schedule",
      };
      Object.defineProperty(window, "location", {
        writable: true,
        value: locationObj,
      });
      Object.defineProperty(window, "top", {
        writable: true,
        value: window,
      });
      Object.defineProperty(window, "self", {
        writable: true,
        value: window,
      });

      render(
        <div>
          <a href="/pricing">Pricing</a>
          <InteractiveDemoGuard />
        </div>
      );

      fireEvent.click(screen.getByRole("link", { name: /Pricing/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Explore Demo League/i }));
      expect(locationObj.href).toBe("/league/default?demo=true");
    });
  });
});
