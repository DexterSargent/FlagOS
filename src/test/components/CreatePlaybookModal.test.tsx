import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import CreatePlaybookModal from "@/components/playbook/CreatePlaybookModal";

vi.mock("@/components/walkthrough/PageGuideButton", () => ({ default: () => null }));
vi.mock("@/lib/pageGuide", () => ({ usePageGuide: () => {} }));

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    settings: {
      rules: { playersOnField: 5 },
    },
  }),
}));

describe("CreatePlaybookModal", () => {
  it("returns null when not open", () => {
    const { container } = render(
      <CreatePlaybookModal
        isOpen={false}
        onClose={vi.fn()}
        teamId="team_apex"
        currentPlaybookCount={0}
        onCreate={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows limit reached warning when team already has maximum playbooks", () => {
    render(
      <CreatePlaybookModal
        isOpen={true}
        onClose={vi.fn()}
        teamId="team_apex"
        currentPlaybookCount={5}
        onCreate={vi.fn()}
      />
    );

    expect(screen.getByText("Playbook Limit Reached")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/e.g. Red Zone Offense/i)).not.toBeInTheDocument();
  });

  it("validates title requirement and displays error message", () => {
    const onCreate = vi.fn();
    const { container } = render(
      <CreatePlaybookModal
        isOpen={true}
        onClose={vi.fn()}
        teamId="team_apex"
        currentPlaybookCount={2}
        onCreate={onCreate}
      />
    );

    const titleInput = container.querySelector<HTMLInputElement>('input[type="text"]')!;
    fireEvent.change(titleInput, { target: { value: "   " } });
    fireEvent.submit(titleInput.closest("form")!);

    expect(screen.getByText("Please enter a title for your playbook.")).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("creates an offensive and defensive playbook with custom squad size", () => {
    const onCreate = vi.fn();
    const onClose = vi.fn();

    const { container } = render(
      <CreatePlaybookModal
        isOpen={true}
        onClose={onClose}
        teamId="team_apex"
        currentPlaybookCount={1}
        onCreate={onCreate}
      />
    );

    // Switch to Defense
    fireEvent.click(screen.getByRole("button", { name: /Defensive Playbook/i }));

    // Select 7v7 squad size
    fireEvent.click(screen.getByRole("button", { name: /7v7/i }));

    // Type title and description
    const titleInput = container.querySelector<HTMLInputElement>('input[type="text"]')!;
    fireEvent.change(titleInput, { target: { value: "Goal Line Defense" } });

    const descInput = screen.getByPlaceholderText(/Fast-paced quick passing attack/i);
    fireEvent.change(descInput, { target: { value: "Heavy blitz packages" } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /Create Playbook/i }));

    expect(onCreate).toHaveBeenCalledOnce();
    const createdBook = onCreate.mock.calls[0][0];
    expect(createdBook.title).toBe("Goal Line Defense");
    expect(createdBook.type).toBe("defense");
    expect(createdBook.playersOnField).toBe(7);
    expect(createdBook.description).toBe("Heavy blitz packages");
    expect(createdBook.formations).toEqual([]);
    expect(createdBook.plays).toEqual([]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("handles close button and Escape key", () => {
    const onClose = vi.fn();
    render(
      <CreatePlaybookModal
        isOpen={true}
        onClose={onClose}
        teamId="team_apex"
        currentPlaybookCount={1}
        onCreate={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
