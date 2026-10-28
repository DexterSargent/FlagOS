import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import VenueDirections from "@/components/VenueDirections";

const mockLeague = {
  settings: {
    venues: [
      { name: "Turf Field 1", address: "123 Field Way, Toronto, ON", notes: "Gate 4 entrance" },
      { name: "Field Without Address" },
    ],
  },
};

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => mockLeague,
}));

describe("VenueDirections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null if venue not found or has no address", () => {
    const { container: c1 } = render(<VenueDirections location="Unknown Park" />);
    expect(c1).toBeEmptyDOMElement();

    const { container: c2 } = render(<VenueDirections location="Field Without Address" />);
    expect(c2).toBeEmptyDOMElement();
  });

  it("renders a standard anchor link when not inLink", () => {
    render(<VenueDirections location="Turf Field 1" showNotes={true} />);

    const link = screen.getByRole("link", { name: /Directions/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("123%20Field%20Way"));
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByText(/123 Field Way, Toronto, ON · Gate 4 entrance/i)).toBeInTheDocument();
  });

  it("renders role=link button when inLink is true and triggers window.open on click and keyboard", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<VenueDirections location="Turf Field 1" inLink={true} />);

    const linkSpan = screen.getByRole("link", { name: /Directions/i });
    expect(linkSpan.tagName).toBe("SPAN");

    fireEvent.click(linkSpan);
    expect(openSpy).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(linkSpan, { key: "Enter" });
    expect(openSpy).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(linkSpan, { key: " " });
    expect(openSpy).toHaveBeenCalledTimes(3);

    fireEvent.keyDown(linkSpan, { key: "ArrowDown" });
    expect(openSpy).toHaveBeenCalledTimes(3);

    openSpy.mockRestore();
  });
});
