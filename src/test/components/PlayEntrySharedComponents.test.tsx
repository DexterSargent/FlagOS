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

  it("handles points summary change button and NO GOOD selection in sync layout", () => {
    const onPointsChange = vi.fn();
    const onResultChange = vi.fn();

    const { rerender } = render(
      <ConversionAttemptSelector
        points={1}
        isGood={null}
        onPointsChange={onPointsChange}
        onResultChange={onResultChange}
        variant="sync"
      />
    );

    // Click Attempt summary button to change points
    const pointsSummaryBtn = screen.getByRole("button", { name: /Conversion attempt: 1 point\(s\)\. Click to change/i });
    fireEvent.click(pointsSummaryBtn);

    // Select 2 points
    fireEvent.click(screen.getByRole("button", { name: /From 10 Yd/i }));
    expect(onPointsChange).toHaveBeenCalledWith(2);

    // Select NO GOOD
    rerender(
      <ConversionAttemptSelector
        points={2}
        isGood={null}
        onPointsChange={onPointsChange}
        onResultChange={onResultChange}
        variant="sync"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "NO GOOD" }));
    expect(onResultChange).toHaveBeenCalledWith(false);

    // Rerender with result set, verify result summary button allows editing
    rerender(
      <ConversionAttemptSelector
        points={2}
        isGood={false}
        onPointsChange={onPointsChange}
        onResultChange={onResultChange}
        variant="sync"
      />
    );
    const resultSummaryBtn = screen.getByRole("button", { name: /Conversion result: No good\. Click to change/i });
    fireEvent.click(resultSummaryBtn);
    expect(screen.getByRole("button", { name: "GOOD" })).toBeInTheDocument();
  });

  it("supports async layout with point values and result buttons", () => {
    const onPointsChange = vi.fn();
    const onResultChange = vi.fn();

    const { rerender } = render(
      <ConversionAttemptSelector
        points={null}
        isGood={null}
        onPointsChange={onPointsChange}
        onResultChange={onResultChange}
        variant="async"
        accentColor="#06b6d4"
      />
    );

    // Click 2 POINTS in async layout
    fireEvent.click(screen.getByText("2 POINTS").closest("button")!);
    expect(onPointsChange).toHaveBeenCalledWith(2);

    rerender(
      <ConversionAttemptSelector
        points={2}
        isGood={null}
        onPointsChange={onPointsChange}
        onResultChange={onResultChange}
        variant="async"
        accentColor="#06b6d4"
      />
    );

    // Good and No Good buttons appear in async layout
    expect(screen.getByRole("button", { name: /GOOD \(\+2 PTS\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /NO GOOD \(0 PTS\)/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /GOOD \(\+2 PTS\)/i }));
    expect(onResultChange).toHaveBeenCalledWith(true);
  });
});

