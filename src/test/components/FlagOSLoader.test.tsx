import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import FlagOSLoader from "@/components/FlagOSLoader";
import FlagOSLogo from "@/components/FlagOSLogo";
import Loading from "@/app/loading";
import { FLAGOS_LOGO, FLAGOS_LOADER_PINWHEEL } from "@/lib/brandTokens";

describe("FlagOS loading and branding", () => {
  it("renders the animated football gear pinwheel with accessible status", () => {
    render(<FlagOSLoader label="Loading league" />);
    const status = screen.getByRole("status", { name: "Loading league" });
    const img = status.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", FLAGOS_LOADER_PINWHEEL);
    expect(img).toHaveAttribute("aria-hidden", "true");
    expect(img).toHaveAttribute("alt", "");
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
