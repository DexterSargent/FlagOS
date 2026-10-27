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
    const originalWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
    const rect = (left: number, width: number) =>
      ({ left, right: left + width, top: 0, bottom: 18, width, height: 18, x: left, y: 0, toJSON: () => ({}) }) as DOMRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      // The entry animation overrides the inline transform, so the bubble's rect never reflects the shift.
      if (this.getAttribute("role") === "tooltip") return rect(300, 256);
      if (this.querySelector(":scope > button")) return rect(420, 16);
      return original.call(this);
    };
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() {
        return this.getAttribute("role") === "tooltip" ? 256 : 0;
      },
    });
    Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 390 });
    try {
      render(<FieldHelpTooltip content="Help text" />);
      fireEvent.click(screen.getByRole("button"));
      const tip = screen.getByRole("tooltip");
      expect(tip.style.transform).toBe("translateX(calc(-50% + -174px))");
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
      if (originalWidth) Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalWidth);
      Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 0 });
    }
  });
});
