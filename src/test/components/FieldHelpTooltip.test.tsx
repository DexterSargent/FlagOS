import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import FieldHelpTooltip from "@/components/FieldHelpTooltip";

function DialogHost({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return <FieldHelpTooltip content="Help text" title="Week" />;
}

describe("FieldHelpTooltip", () => {
  it("closes on Escape without closing the surrounding dialog", () => {
    const onClose = vi.fn();
    render(<DialogHost onClose={onClose} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Help text")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Help text")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays open when a hovering pointer clicks the help icon", () => {
    render(<FieldHelpTooltip content="Help text" title="Week" />);
    const button = screen.getByRole("button");
    fireEvent.mouseEnter(button.parentElement!);
    fireEvent.click(button);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Help text");
  });

  it("shifts the bubble back inside the viewport near the right edge", () => {
    const original = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      if (this.getAttribute("role") === "tooltip") {
        const shift = Number(/calc\(-50% \+ (-?[\d.]+)px\)/.exec(this.style.transform)?.[1] || 0);
        return { left: 300 + shift, right: 556 + shift, top: 0, bottom: 80, width: 256, height: 80, x: 300 + shift, y: 0, toJSON: () => ({}) } as DOMRect;
      }
      return original.call(this);
    };
    Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 390 });
    try {
      render(<FieldHelpTooltip content="Help text" />);
      fireEvent.click(screen.getByRole("button"));
      const tip = screen.getByRole("tooltip");
      expect(tip.style.transform).toBe("translateX(calc(-50% + -174px))");
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
      Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 0 });
    }
  });
});
