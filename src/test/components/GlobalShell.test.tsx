import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import GlobalShell from "@/components/GlobalShell";

const { usePathnameMock, useSearchParamsMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock("@/components/LeagueHeader", () => ({
  default: () => <header>League Header</header>,
}));

vi.mock("@/components/LeagueFooter", () => ({
  default: () => <footer>League Footer</footer>,
}));

describe("GlobalShell", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/");
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  it("omits the league header from the public landing page", () => {
    render(
      <GlobalShell>
        <div>Landing content</div>
      </GlobalShell>
    );

    expect(screen.getByText("Landing content")).toBeInTheDocument();
    expect(screen.queryByText("League Header")).not.toBeInTheDocument();
  });

  it("omits the league header and footer from the pricing page", () => {
    usePathnameMock.mockReturnValue("/pricing");

    render(
      <GlobalShell>
        <div>Pricing content</div>
      </GlobalShell>
    );

    expect(screen.getByText("Pricing content")).toBeInTheDocument();
    expect(screen.queryByText("League Header")).not.toBeInTheDocument();
    expect(screen.queryByText("League Footer")).not.toBeInTheDocument();
  });

  it("keeps the league header on other pages", () => {
    usePathnameMock.mockReturnValue("/schedule");

    render(
      <GlobalShell>
        <div>Schedule content</div>
      </GlobalShell>
    );

    expect(screen.getByText("League Header")).toBeInTheDocument();
    expect(screen.getByText("League Footer")).toBeInTheDocument();
  });
});
