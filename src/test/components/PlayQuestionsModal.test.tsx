import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PlayQuestionsModal from "@/components/playbook/PlayQuestionsModal";
import { PlayDiagram, PlayQuestion } from "@/lib/playbookTypes";

const mockPlay: PlayDiagram = {
  id: "play-1",
  teamId: "team_apex",
  name: "Trips Right - Verticals",
  type: "offense",
  formation: "Trips Right",
  situation: "Standard",
  losY: 65,
  players: [],
  questions: [
    {
      id: "q-1",
      playId: "play-1",
      authorName: "Marcus Hill",
      authorRole: "player",
      authorNumber: "88",
      text: "Coach, if safety rotates deep middle, do I convert the seam to a post?",
      createdAt: "2026-10-15T12:00:00Z",
      answered: true,
      answer: {
        text: "Yes, break across the safety's face if middle is open.",
        answeredBy: "Coach Dexter",
        answeredAt: "2026-10-15T12:30:00Z",
      },
    },
    {
      id: "q-2",
      playId: "play-1",
      authorName: "Sarah Chen",
      authorRole: "player",
      authorNumber: "7",
      text: "When should the slot receiver go in motion?",
      createdAt: "2026-10-15T14:00:00Z",
      answered: false,
    },
  ],
};

describe("PlayQuestionsModal", () => {
  it("renders existing questions and status badges", () => {
    const handleUpdate = vi.fn();
    const handleClose = vi.fn();

    render(
      <PlayQuestionsModal
        isOpen={true}
        onClose={handleClose}
        play={mockPlay}
        onUpdateQuestions={handleUpdate}
        isPlayer={true}
        isCoach={false}
        currentUser={{ name: "Alex Rivera", jerseyNumber: "12", role: "player" }}
      />
    );

    expect(screen.getByText(/Play Q&A · Trips Right - Verticals/i)).toBeInTheDocument();
    expect(screen.getByText(/Marcus Hill #88/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Coach, if safety rotates deep middle, do I convert the seam to a post\?/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Coach Response · Coach Dexter/i)).toBeInTheDocument();
    expect(screen.getByText(/Yes, break across the safety's face if middle is open./i)).toBeInTheDocument();
    expect(screen.getByText(/1 Pending/i)).toBeInTheDocument();
    expect(screen.getByText("Answered")).toBeInTheDocument();
    expect(screen.getByText("Pending Coach")).toBeInTheDocument();
  });

  it("allows player to select a suggestion chip and post a new question", () => {
    const handleUpdate = vi.fn();
    const handleClose = vi.fn();

    render(
      <PlayQuestionsModal
        isOpen={true}
        onClose={handleClose}
        play={mockPlay}
        onUpdateQuestions={handleUpdate}
        isPlayer={true}
        isCoach={false}
        currentUser={{ name: "Alex Rivera", jerseyNumber: "12", role: "player" }}
      />
    );

    // Enter question in textarea
    const textarea = screen.getByLabelText(/Ask Your Coach a Question/i);
    fireEvent.change(textarea, { target: { value: "What is my read against Cover 2?" } });

    // Submit question
    const postBtn = screen.getByRole("button", { name: /Post Question/i });
    fireEvent.click(postBtn);

    expect(handleUpdate).toHaveBeenCalledTimes(1);
    const updatedQuestions: PlayQuestion[] = handleUpdate.mock.calls[0][0];
    expect(updatedQuestions.length).toBe(3);
    expect(updatedQuestions[0].text).toBe("What is my read against Cover 2?");
    expect(updatedQuestions[0].authorName).toBe("Alex Rivera");
    expect(updatedQuestions[0].authorNumber).toBe("12");
    expect(updatedQuestions[0].answered).toBe(false);
  });

  it("allows coach to reply to an unanswered question", () => {
    const handleUpdate = vi.fn();
    const handleClose = vi.fn();

    render(
      <PlayQuestionsModal
        isOpen={true}
        onClose={handleClose}
        play={mockPlay}
        onUpdateQuestions={handleUpdate}
        isPlayer={false}
        isCoach={true}
        currentUser={{ name: "Head Coach Dexter", role: "coach" }}
      />
    );

    // Coach sees reply button for unanswered question
    const replyButtons = screen.getAllByRole("button", { name: /Reply to Player/i });
    expect(replyButtons.length).toBeGreaterThan(0);
    fireEvent.click(replyButtons[0]);

    // Fill in coach response
    const textarea = screen.getByPlaceholderText(/Reply as Coach to Sarah Chen\.\.\./i);
    fireEvent.change(textarea, { target: { value: "Motion starts on the 'Ready' cadence." } });

    // Click submit answer
    const submitBtn = screen.getByRole("button", { name: /Submit Answer/i });
    fireEvent.click(submitBtn);

    expect(handleUpdate).toHaveBeenCalledTimes(1);
    const updatedQuestions: PlayQuestion[] = handleUpdate.mock.calls[0][0];
    const sarahQuestion = updatedQuestions.find((q) => q.id === "q-2");
    expect(sarahQuestion?.answered).toBe(true);
    expect(sarahQuestion?.answer?.text).toBe("Motion starts on the 'Ready' cadence.");
    expect(sarahQuestion?.answer?.answeredBy).toBe("Head Coach Dexter");
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <PlayQuestionsModal
        isOpen={false}
        onClose={vi.fn()}
        play={mockPlay}
        onUpdateQuestions={vi.fn()}
        isPlayer={true}
        isCoach={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
