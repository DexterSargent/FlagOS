import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConversionAttemptSelector from "@/components/play-by-play/ConversionAttemptSelector";
import PlayTypeSelector from "@/components/play-by-play/PlayTypeSelector";

describe("shared play-entry components", () => {
  it("offers the same play types in sync and async layouts", () => {
    const onSyncSelect = vi.fn();
    const onAsyncSelect = vi.fn();

    const { rerender } = render(<PlayTypeSelector onSelect={onSyncSelect} variant="sync" />);

    expect(screen.getByRole("button", { name: /PASS/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /RUN/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /PENALTY/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /PENALTY/ }));
    expect(onSyncSelect).toHaveBeenCalledWith("Penalty");

    rerender(<PlayTypeSelector onSelect={onAsyncSelect} variant="async" />);
    fireEvent.click(screen.getByRole("button", { name: "PASS PLAY" }));
    expect(onAsyncSelect).toHaveBeenCalledWith("Pass");
  });

  it("keeps sync play-type choices compact and readable without inheriting the team accent as text", () => {
    render(<PlayTypeSelector onSelect={vi.fn()} variant="sync" accentColor="#ffffff" />);

    const passButton = screen.getByRole("button", { name: /PASS/ });

    expect(passButton.className).toContain("h-24 sm:h-28 md:h-36");
    expect(passButton.style.color).toBe("");
    expect(passButton.querySelector("span:last-child")?.className).toContain("text-blue-700");
  });

  it("shares conversion point and result selection while allowing sync-specific confirmation", () => {
    const onPointsChange = vi.fn();
    const onResultChange = vi.fn();

    const { rerender } = render(
      <ConversionAttemptSelector
        points={null}
        isGood={null}
        onPointsChange={onPointsChange}
        onResultChange={onResultChange}
        variant="sync"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /From 5 Yd/i }));
    expect(onPointsChange).toHaveBeenCalledWith(1);

    rerender(
      <ConversionAttemptSelector
        points={1}
        isGood={null}
        onPointsChange={onPointsChange}
        onResultChange={onResultChange}
        variant="sync"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "GOOD" }));
    expect(onResultChange).toHaveBeenCalledWith(true);
  });
});
