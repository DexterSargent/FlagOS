import { describe, it, expect, vi } from "vitest";
import { lazy, Suspense, type ComponentType } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import HelpGuide from "@/components/HelpGuide";
import { getHelpTopic } from "@/lib/helpContent";

const route = vi.hoisted(() => ({ pathname: "/teams/abc/playbook" }));
vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
}));
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default: ComponentType<Record<string, unknown>> }>) => {
    const Content = lazy(loader);
    return function DynamicContent(props: Record<string, unknown>) {
      return <Suspense fallback={null}><Content {...props} /></Suspense>;
    };
  },
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
  it("opens and closes the guide", async () => {
    render(<HelpGuide />);
    fireEvent.click(screen.getByLabelText("Open help guide"));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Play Designer")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Close help guide"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on Escape and stays closed after navigating away and back", async () => {
    const view = render(<HelpGuide />);
    fireEvent.click(screen.getByLabelText("Open help guide"));
    await screen.findByRole("dialog");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByLabelText("Open help guide"));
    await screen.findByRole("dialog");
    route.pathname = "/teams/abc/roster";
    view.rerender(<HelpGuide />);
    expect(screen.queryByRole("dialog")).toBeNull();
    route.pathname = "/teams/abc/playbook";
    view.rerender(<HelpGuide />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
