import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import FlagOSLoader from "@/components/FlagOSLoader";
import FlagOSLogo from "@/components/FlagOSLogo";
import Loading from "@/app/loading";
import { FLAGOS_LOGO } from "@/lib/brandTokens";

describe("FlagOS loading and branding", () => {
  it("rotates only the gear and respects reduced motion", () => {
    render(<FlagOSLoader label="Loading league" />);
    const status = screen.getByRole("status", { name: "Loading league" });
    const [gear, football] = status.querySelectorAll("img");
    expect(gear).toHaveAttribute("src", "/flagos-loading-gear.webp");
    expect(gear).toHaveClass("motion-safe:animate-spin", "motion-reduce:animate-none");
    expect(gear).toHaveStyle({ animationDuration: "3s" });
    expect(football).toHaveAttribute("src", "/flagos-loading-football.webp");
    expect(football.className).not.toContain("animate");
    expect(gear).toHaveAttribute("aria-hidden", "true");
    expect(football).toHaveAttribute("alt", "");
  });

  it("supports different loading sizes and route transitions", () => {
    const { rerender } = render(<FlagOSLoader size={112} />);
    expect(screen.getByRole("status")).toHaveStyle({ width: "112px", height: "112px" });
    rerender(<Loading />);
    expect(screen.getByRole("status", { name: "Loading FlagOS" })).toBeInTheDocument();
  });

  it("upgrades saved legacy branding without replacing custom logos", () => {
    const { rerender } = render(<FlagOSLogo src="/flagos-emblem.png" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", FLAGOS_LOGO);
    rerender(<FlagOSLogo src="/team-custom.png" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/team-custom.png");
  });
});
