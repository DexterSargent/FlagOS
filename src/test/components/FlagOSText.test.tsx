import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlagOSBrand } from "@/components/FlagOSLogo";
import { FlagOSText, renderFlagOS } from "@/components/FlagOSText";

describe("FlagOS brand casing", () => {
  it("preserves mixed casing even with uppercase brand classes", () => {
    const { container } = render(<FlagOSText className="uppercase text-xl" />);
    const brand = container.firstElementChild;

    expect(brand).toHaveTextContent(/^FlagOS$/);
    expect(brand).toHaveStyle({ textTransform: "none" });
    expect(screen.getByText("Flag")).toHaveClass("text-white");
    expect(screen.getByText("OS")).toHaveStyle({ color: "var(--league-ink, #3CA505)" });
  });

  it("normalizes every brand occurrence without changing surrounding text", () => {
    const { container } = render(
      <h1 className="uppercase">{renderFlagOS("FLAGOS, flagos and FlagOS League")}</h1>,
    );

    expect(container).toHaveTextContent("FlagOS, FlagOS and FlagOS League");
    expect(screen.getAllByText("Flag")).toHaveLength(3);
    for (const word of screen.getAllByText("Flag")) {
      expect(word.parentElement).toHaveStyle({ textTransform: "none" });
    }
  });

  it("uses the same casing in the composed logo and text brand", () => {
    const { container } = render(<FlagOSBrand />);

    expect(container).toHaveTextContent(/^FlagOS$/);
    expect(screen.getByRole("img", { name: "FlagOS Logo" })).toBeInTheDocument();
  });

  it("preserves unrelated and missing text", () => {
    expect(renderFlagOS("Community League")).toBe("Community League");
    expect(renderFlagOS("")).toBe("");
    expect(renderFlagOS(null)).toBeNull();
    expect(renderFlagOS(undefined)).toBeUndefined();
  });
});
