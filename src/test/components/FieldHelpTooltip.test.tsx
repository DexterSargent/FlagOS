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
});
