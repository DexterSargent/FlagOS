import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { TeamLogo } from "@/components/TeamAssets";

describe("TeamLogo", () => {
  it("renders football icons using the demo team's primary color", () => {
    const { container } = render(
      <TeamLogo teamName="Arizona" icon="football" iconColor="#97233F" />
    );

    const football = container.querySelector("svg");
    expect(football).toBeInTheDocument();
    expect(football).toHaveStyle({ color: "#97233F" });
    expect(football?.querySelector("ellipse")).toBeInTheDocument();
  });

  it("keeps the shield icon available for non-demo teams", () => {
    const { container } = render(<TeamLogo teamName="Custom Club" icon="shield" />);

    expect(container.querySelector("svg.lucide-shield")).toBeInTheDocument();
  });
});
