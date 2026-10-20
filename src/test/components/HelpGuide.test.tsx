import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HelpGuide from "@/components/HelpGuide";
import { getHelpTopic } from "@/lib/helpContent";

vi.mock("next/navigation", () => ({
  usePathname: () => "/teams/abc/playbook",
}));

describe("helpContent", () => {
  it("maps routes to topics", () => {
    expect(getHelpTopic("/teams/abc/playbook").id).toBe("playbook");
    expect(getHelpTopic("/teams/abc/roster").id).toBe("roster");
    expect(getHelpTopic("/teams/abc").id).toBe("team-hub");
    expect(getHelpTopic("/matches/m1/play-by-play").id).toBe("play-by-play");
    expect(getHelpTopic("/unknown").id).toBe("general");
  });
});

describe("HelpGuide", () => {
  it("opens and closes the guide", () => {
    render(<HelpGuide />);
    fireEvent.click(screen.getByLabelText("Open help guide"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Play Designer")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Close help guide"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
