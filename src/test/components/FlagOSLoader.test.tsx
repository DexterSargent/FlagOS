import { describe, expect, it, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
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

  it("shows recovery retry button when loading exceeds the timeout threshold", async () => {
    const onRetry = vi.fn();
    render(<FlagOSLoader timeoutSeconds={0.05} onRetry={onRetry} />);
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 70));
    });
    const retryBtn = screen.getByRole("button", { name: "Retry" });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
