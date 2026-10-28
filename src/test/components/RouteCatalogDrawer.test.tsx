import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RouteCatalogDrawer from "@/components/playbook/RouteCatalogDrawer";
import type { PlayerNode, CustomRoutePreset } from "@/lib/playbookTypes";

describe("RouteCatalogDrawer Component Suite", () => {
  const dummyPlayer: PlayerNode = {
    id: "p1",
    label: "WR1",
    role: "WR",
    side: "offense",
    x: 20,
    y: 10,
    route: [
      { x: 20, y: 10 },
      { x: 20, y: 5 },
      { x: 30, y: 5 },
    ],
  };

  const dummyCustomPresets: CustomRoutePreset[] = [
    {
      id: "cp1",
      name: "Custom Slant",
      shortName: "CS",
      teamId: "team_1",
      category: "short",
      offsets: [{ dx: 5, dy: 4 }],
    },
    {
      id: "cp2",
      name: "Custom Post-Corner",
      shortName: "CPC",
      teamId: "team_1",
      category: "intermediate",
      offsets: [{ dx: 5, dy: 10 }, { dx: -5, dy: 12 }],
    },
    {
      id: "cp3",
      name: "Custom Streak 20y",
      shortName: "CS20",
      teamId: "team_1",
      category: "deep",
      offsets: [{ dx: 0, dy: 22 }],
    },
  ];

  it("renders catalog with route sorting buttons and applies sorting filters", () => {
    const onRouteSortChange = vi.fn();
    const onClose = vi.fn();
    const onApplyPreset = vi.fn();
    const onApplyCustomPreset = vi.fn();
    const onDeleteCustomPreset = vi.fn();
    const onSaveCurrentRoute = vi.fn();

    render(
      <RouteCatalogDrawer
        selectedPlayer={dummyPlayer}
        readOnly={false}
        isDemo={false}
        customPresets={dummyCustomPresets}
        onRouteSortChange={onRouteSortChange}
        onClose={onClose}
        onApplyPreset={onApplyPreset}
        onApplyCustomPreset={onApplyCustomPreset}
        onDeleteCustomPreset={onDeleteCustomPreset}
        onSaveCurrentRoute={onSaveCurrentRoute}
      />
    );

    expect(screen.getByText("Route Tree & Presets")).toBeInTheDocument();
    expect(screen.getByText("WR1")).toBeInTheDocument();

    // Default: All Routes selected
    const allBtn = screen.getByRole("button", { name: /^All Routes/i });
    expect(allBtn).toHaveAttribute("aria-pressed", "true");

    // Click Short (<=6y)
    const shortBtn = screen.getByRole("button", { name: /^Short/i });
    fireEvent.click(shortBtn);
    expect(onRouteSortChange).toHaveBeenCalledWith("short");

    // Click Intermediate (7-14y)
    const interBtn = screen.getByRole("button", { name: /^Intermediate/i });
    fireEvent.click(interBtn);
    expect(onRouteSortChange).toHaveBeenCalledWith("intermediate");

    // Click Deep (15y+)
    const deepBtn = screen.getByRole("button", { name: /^Deep/i });
    fireEvent.click(deepBtn);
    expect(onRouteSortChange).toHaveBeenCalledWith("deep");
  });

  it("handles applying standard route presets and custom presets", () => {
    const onApplyPreset = vi.fn();
    const onApplyCustomPreset = vi.fn();
    const onClose = vi.fn();

    render(
      <RouteCatalogDrawer
        selectedPlayer={dummyPlayer}
        readOnly={false}
        isDemo={false}
        customPresets={dummyCustomPresets}
        onClose={onClose}
        onApplyPreset={onApplyPreset}
        onApplyCustomPreset={onApplyCustomPreset}
        onDeleteCustomPreset={vi.fn()}
        onSaveCurrentRoute={vi.fn()}
      />
    );

    // Toggle descriptions
    const descToggle = screen.getByTestId("route-descriptions-toggle");
    fireEvent.click(descToggle);
    expect(descToggle).toHaveTextContent("Shorter descriptions");

    // Apply standard preset via data-testid
    const slantBtn = screen.getByTestId("catalog-route-slant");
    fireEvent.click(slantBtn);
    expect(onApplyPreset).toHaveBeenCalledWith("Slant");

    // Apply custom preset
    const customSlantBtn = screen.getByRole("button", { name: "Custom Slant" });
    fireEvent.click(customSlantBtn);
    expect(onApplyCustomPreset).toHaveBeenCalledWith(dummyCustomPresets[0]);
  });

  it("handles deleting a custom preset and saving current route", () => {
    const onDeleteCustomPreset = vi.fn();
    const onSaveCurrentRoute = vi.fn();
    const onClose = vi.fn();

    render(
      <RouteCatalogDrawer
        selectedPlayer={dummyPlayer}
        readOnly={false}
        isDemo={false}
        customPresets={dummyCustomPresets}
        onClose={onClose}
        onApplyPreset={vi.fn()}
        onApplyCustomPreset={vi.fn()}
        onDeleteCustomPreset={onDeleteCustomPreset}
        onSaveCurrentRoute={onSaveCurrentRoute}
      />
    );

    // Click delete on custom preset via aria-label
    const deleteBtn = screen.getByLabelText("Delete preset Custom Slant");
    fireEvent.click(deleteBtn);
    expect(onDeleteCustomPreset).toHaveBeenCalledWith("cp1", "Custom Slant", expect.anything());

    // Save current route
    const saveCurrentBtn = screen.getByRole("button", { name: /Save Current Route as Preset/i });
    fireEvent.click(saveCurrentBtn);
    expect(onSaveCurrentRoute).toHaveBeenCalled();

    // Close button
    const closeBtn = screen.getByLabelText("Close route catalog");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
