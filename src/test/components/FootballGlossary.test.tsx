import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import {
  GlossaryDefinitionBar,
  FootballGlossaryModal,
  GLOSSARY,
} from "@/components/match/FootballGlossary";

describe("FootballGlossary", () => {
  it("renders GlossaryDefinitionBar and handles close", () => {
    const onClose = vi.fn();
    const { container, rerender } = render(<GlossaryDefinitionBar termKey={null} onClose={onClose} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<GlossaryDefinitionBar termKey="td" onClose={onClose} />);
    expect(screen.getByText("Touchdown (TD):")).toBeInTheDocument();
    expect(screen.getByText(/Worth 6 points/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close explanation" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders FootballGlossaryModal, handles highlight, escape key, and outside clicks", () => {
    const onClose = vi.fn();
    const { container, rerender } = render(
      <FootballGlossaryModal open={false} onClose={onClose} />
    );
    expect(container).toBeEmptyDOMElement();

    rerender(<FootballGlossaryModal open={true} onClose={onClose} highlight="pick6" />);

    expect(screen.getByRole("dialog", { name: "Flag football terms" })).toBeInTheDocument();
    expect(screen.getByText("Pick 6")).toBeInTheDocument();
    expect(screen.getByText("Box score columns")).toBeInTheDocument();

    // Escape key
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Close button
    fireEvent.click(screen.getByRole("button", { name: "Close terms" }));
    expect(onClose).toHaveBeenCalledTimes(2);

    // Modal background click
    const dialog = screen.getByRole("dialog", { name: "Flag football terms" });
    fireEvent.click(dialog); // stopPropagation inside dialog
    expect(onClose).toHaveBeenCalledTimes(2);

    const backdrop = dialog.parentElement!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
