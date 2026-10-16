"use client";

import React, { useState } from "react";
import { PlayDiagram, PlayQuestion, PlayQuestionAnswer } from "@/lib/playbookTypes";
import {
  MessageSquare,
  HelpCircle,
  X,
  Send,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  Shield,
  Lightbulb,
  CornerDownRight,
} from "lucide-react";

interface PlayQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  play: PlayDiagram;
  onUpdateQuestions: (updatedQuestions: PlayQuestion[]) => void;
  isPlayer: boolean;
  isCoach: boolean;
  currentUser?: {
    name?: string;
    email?: string;
    jerseyNumber?: string;
    role?: string;
  };
}

const QUESTION_SUGGESTIONS = [
  "What is my read against Cover 2?",
  "Who is the hot read if they send a blitzer?",
  "When should the pre-snap motion begin?",
  "Should the out route stem to the stick or break early?",
  "What is my contain assignment on this play?",
];

export default function PlayQuestionsModal({
  isOpen,
  onClose,
  play,
  onUpdateQuestions,
  isPlayer,
  isCoach,
  currentUser,
}: PlayQuestionsModalProps) {
  const [questionText, setQuestionText] = useState("");
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const questions: PlayQuestion[] = play.questions || [];
  const unansweredCount = questions.filter((q) => !q.answered).length;

  const handlePostQuestion = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!questionText.trim()) return;

    setSubmitting(true);
    const newQuestion: PlayQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      playId: play.id,
      authorName:
        currentUser?.name ||
        (isPlayer ? "Rostered Player" : isCoach ? "Coach" : "Athlete"),
      authorRole: isPlayer ? "player" : "coach",
      authorEmail: currentUser?.email,
      authorNumber: currentUser?.jerseyNumber,
      text: questionText.trim(),
      createdAt: new Date().toISOString(),
      answered: false,
    };

    const updated = [newQuestion, ...questions];
    onUpdateQuestions(updated);
    setQuestionText("");
    setSubmitting(false);
  };

  const handlePostAnswer = (questionId: string) => {
    if (!replyText.trim()) return;

    const answer: PlayQuestionAnswer = {
      text: replyText.trim(),
      answeredBy: currentUser?.name || (isCoach ? "Coach" : "Staff"),
      answeredAt: new Date().toISOString(),
    };

    const updated = questions.map((q) => {
      if (q.id === questionId) {
        return {
          ...q,
          answered: true,
          answer,
        };
      }
      return q;
    });

    onUpdateQuestions(updated);
    setActiveReplyId(null);
    setReplyText("");
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!confirm("Are you sure you want to remove this question?")) return;
    const updated = questions.filter((q) => q.id !== questionId);
    onUpdateQuestions(updated);
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "Recently";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md transition-all"
      data-testid="play-questions-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="questions-modal-title"
    >
      <div className="bg-white dark:bg-[#0B0F19] text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/10 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-white/10 flex items-center justify-between gap-3 bg-neutral-50/80 dark:bg-black/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="questions-modal-title"
                  className="text-base sm:text-lg font-black uppercase tracking-tight truncate"
                >
                  Play Q&A · {play.name}
                </h2>
                {unansweredCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                    {unansweredCount} Pending
                  </span>
                ) : questions.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                    {questions.length} Questions
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                {isPlayer
                  ? "Ask your coach about assignments, reads, motion, or coverage adjustments"
                  : "Player questions and coach tactical explanations"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Questions Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Ask Question Form (always accessible to players, and coaches can post prompts) */}
          <div className="bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="new-question-input"
                className="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
                <span>
                  {isPlayer ? "Ask Your Coach a Question" : "Post a Coaching Clarification / Question"}
                </span>
              </label>
              {currentUser?.name && (
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                  Posting as{" "}
                  <strong className="text-neutral-800 dark:text-neutral-200">
                    {currentUser.name}
                    {currentUser.jerseyNumber ? ` #${currentUser.jerseyNumber}` : ""}
                  </strong>
                </span>
              )}
            </div>

            <textarea
              id="new-question-input"
              rows={2}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder={
                isPlayer
                  ? "e.g., Coach, if the safety shows Cover 1 man, do I still run the post or switch to a drag?"
                  : "e.g., Note for WR2: stem outside to set up the boundary seam."
              }
              className="w-full p-3 rounded-xl bg-white dark:bg-black/50 border border-neutral-300 dark:border-white/10 focus:border-cyan-500 dark:focus:border-cyan-400 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-xs sm:text-sm outline-none resize-none transition-colors"
            />

            {/* Quick Suggestion Chips for Players */}
            {isPlayer && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">
                  <Lightbulb className="w-3 h-3 text-amber-500" />
                  <span>Quick Prompts:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUESTION_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setQuestionText(sug)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-200/70 hover:bg-neutral-300 dark:bg-white/10 dark:hover:bg-white/15 text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handlePostQuestion}
                disabled={submitting || !questionText.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post Question</span>
              </button>
            </div>
          </div>

          {/* Questions Stream */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
              <span>Discussion & Coaching Answers</span>
              <span className="text-[10px] font-mono font-normal">
                {questions.length} total
              </span>
            </h3>

            {questions.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 space-y-2">
                <HelpCircle className="w-8 h-8 mx-auto text-neutral-400 dark:text-neutral-600" />
                <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  No questions yet for this play
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                  {isPlayer
                    ? "Have a question about your route stem, read progression, or coverage assignment? Post it above for your coach!"
                    : "Players can ask questions regarding their assignments here. Once posted, you will be able to reply directly."}
                </p>
              </div>
            ) : (
              questions.map((q) => {
                const canDelete =
                  isCoach ||
                  (currentUser?.email &&
                    q.authorEmail &&
                    currentUser.email.toLowerCase() ===
                      q.authorEmail.toLowerCase());

                return (
                  <div
                    key={q.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#111625] border border-neutral-200 dark:border-white/10 space-y-3 transition-colors shadow-sm"
                  >
                    {/* Question Header */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                            q.authorRole === "coach"
                              ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                              : "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
                          }`}
                        >
                          {q.authorRole === "coach" ? (
                            <Shield className="w-3.5 h-3.5" />
                          ) : (
                            <User className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-neutral-900 dark:text-white">
                            {q.authorName}
                            {q.authorNumber ? ` #${q.authorNumber}` : ""}
                          </span>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 ml-2">
                            {q.authorRole === "coach" ? "Coach" : "Player"} ·{" "}
                            {formatTimestamp(q.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {q.answered ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Answered</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Pending Coach</span>
                          </span>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
                            title="Delete question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Question Body */}
                    <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed pl-1">
                      {q.text}
                    </p>

                    {/* Answer (if present) */}
                    {q.answered && q.answer && (
                      <div className="pl-3 sm:pl-4 py-2 border-l-2 border-cyan-500 dark:border-cyan-400 bg-neutral-50 dark:bg-black/30 rounded-r-xl space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                          <Shield className="w-3 h-3" />
                          <span>Coach Response · {q.answer.answeredBy}</span>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-normal">
                            ({formatTimestamp(q.answer.answeredAt)})
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
                          {q.answer.text}
                        </p>
                      </div>
                    )}

                    {/* Coach Answer Actions (for coaches to reply) */}
                    {isCoach && (
                      <div className="pt-1">
                        {activeReplyId === q.id ? (
                          <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-white/10">
                            <textarea
                              rows={2}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={`Reply as Coach to ${q.authorName}...`}
                              className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-black/60 border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white outline-none focus:border-cyan-500"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveReplyId(null);
                                  setReplyText("");
                                }}
                                className="px-3 py-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePostAnswer(q.id)}
                                disabled={!replyText.trim()}
                                className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold text-xs uppercase"
                              >
                                Submit Answer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReplyId(q.id);
                              setReplyText(q.answer?.text || "");
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors"
                          >
                            <CornerDownRight className="w-3 h-3" />
                            <span>{q.answered ? "Edit Coach Response" : "Reply to Player"}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-neutral-200 dark:border-white/10 bg-neutral-50/80 dark:bg-black/40 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isPlayer
              ? "Your coach will receive notification of your questions during film review."
              : "Coaches can reply to individual players or clarify tactical concepts."}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-white/10 dark:hover:bg-white/20 text-neutral-800 dark:text-white font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
