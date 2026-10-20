import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TeamDepthCharts from "@/components/TeamDepthCharts";
import { createSecureRecord, requestPrivateData } from "@/lib/secureWrites";
import { getDepthFormations } from "@/lib/depthChart";

vi.mock("@/lib/secureWrites", () => ({
  createSecureRecord: vi.fn().mockResolvedValue("team"),
  requestPrivateData: vi.fn(),
}));
const players = [{ id: "p1", playerName: "Alex", positions: ["QB", "WR"] }, { id: "p2", playerName: "Sam", positions: ["QB"] }];
const onFormations = vi.fn();
const props = { teamId: "team", players, canManage: true, signedIn: true, isDemo: false, showStats: false, playerStats: {}, onFormations };
const chart = { id: "chart", name: "First Team", formationKey: "default:offense", assignments: { QB: ["p1", "p2"] } };

describe("coachable depth charts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requestPrivateData).mockResolvedValue({ charts: [], formations: getDepthFormations(), visibleToPlayers: false, canEdit: true });
  });
  it("creates, assigns, reorders, publishes, saves and reloads a chart", async () => {
    const view = render(<TeamDepthCharts {...props} />);
    fireEvent.change(await screen.findByLabelText("Depth chart name"), { target: { value: "First Team" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Depth Chart" }));
    fireEvent.change(screen.getByLabelText("Add player to Quarterback"), { target: { value: "p1" } });
    fireEvent.change(screen.getByLabelText("Add player to Quarterback"), { target: { value: "p2" } });
    fireEvent.click(screen.getByRole("button", { name: "Move Sam up at Quarterback" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Allow rostered/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save Depth Charts" }));
    await screen.findByText("Depth charts saved.");
    expect(createSecureRecord).toHaveBeenCalledWith("depth_chart", expect.objectContaining({
      teamId: "team", visibleToPlayers: true,
      charts: [expect.objectContaining({ name: "First Team", assignments: { QB: ["p2", "p1"] } })],
    }));
    view.unmount();
    vi.mocked(requestPrivateData).mockResolvedValue({ charts: [chart], formations: getDepthFormations(), visibleToPlayers: true, canEdit: true });
    render(<TeamDepthCharts {...props} />);
    expect(await screen.findByText("1. #- Alex")).toBeInTheDocument();
  });
  it("uses the playbook formation's exact slots", async () => {
    vi.mocked(requestPrivateData).mockResolvedValue({
      charts: [{ ...chart, formationKey: "book:trips", assignments: {} }], canEdit: true, visibleToPlayers: false,
      formations: [{ key: "book:trips", name: "Offense / Trips", side: "offense", slots: [{ id: "x", label: "X" }, { id: "z", label: "Z" }] }],
    });
    render(<TeamDepthCharts {...props} />);
    expect(await screen.findByLabelText("Add player to X")).toBeInTheDocument();
    expect(screen.getByLabelText("Add player to Z")).toBeInTheDocument();
    expect(screen.queryByLabelText("Add player to Quarterback")).not.toBeInTheDocument();
  });
  it("shows published charts read-only to players", async () => {
    vi.mocked(requestPrivateData).mockResolvedValue({ charts: [chart], formations: getDepthFormations(), visibleToPlayers: true, canEdit: false });
    render(<TeamDepthCharts {...props} canManage={false} />);
    expect(await screen.findByText("1. #- Alex")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Depth Charts" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
  it("does not display private assignments to players", async () => {
    vi.mocked(requestPrivateData).mockResolvedValue({ charts: [], formations: [], visibleToPlayers: false, canEdit: false });
    render(<TeamDepthCharts {...props} canManage={false} />);
    expect(await screen.findByText(/Depth charts are private/)).toBeInTheDocument();
    expect(screen.queryByText(/Alex/)).not.toBeInTheDocument();
  });
  it("keeps failed saves dirty and reports the error", async () => {
    vi.mocked(createSecureRecord).mockRejectedValueOnce(new Error("Save failed"));
    vi.mocked(requestPrivateData).mockResolvedValue({ charts: [chart], formations: getDepthFormations(), visibleToPlayers: false, canEdit: true });
    render(<TeamDepthCharts {...props} />);
    fireEvent.click(await screen.findByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Save Depth Charts" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Save failed");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.queryByText("Depth charts saved.")).not.toBeInTheDocument();
  });
  it("removes assignments and deletes charts", async () => {
    vi.mocked(requestPrivateData).mockResolvedValue({ charts: [chart], formations: getDepthFormations(), visibleToPlayers: false, canEdit: true });
    render(<TeamDepthCharts {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Remove Alex from Quarterback" }));
    expect(screen.queryByText("1. #- Alex")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete Chart" }));
    expect(screen.queryByRole("group", { name: "Depth charts" })).not.toBeInTheDocument();
  });
});
