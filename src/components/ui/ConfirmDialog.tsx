"use client";

import { useId, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useDialogKeyboard } from "./useDialogKeyboard";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Accessible replacement for window.confirm(). Handles pending state and
 * surfaces confirm errors inline instead of leaving the dialog stuck.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const ref = useDialogKeyboard<HTMLDivElement>(open, onCancel, { busy });

  if (!open) return null;

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const confirmClasses =
    tone === "danger"
      ? "bg-rose-600 hover:bg-rose-500 text-white"
      : "bg-[var(--league-primary,#0891b2)] hover:brightness-110 text-white";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm dark:bg-black/80">
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-desc` : undefined}
        tabIndex={-1}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl outline-none dark:border-white/10 dark:bg-[#0D121F] dark:text-white"
      >
        <div className="flex items-start gap-3">
          {tone === "danger" && (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-title`} className="text-base font-bold">
              {title}
            </h2>
            {description && (
              <p id={`${id}-desc`} className="mt-1.5 text-sm text-slate-600 dark:text-neutral-400">
                {description}
              </p>
            )}
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-white/10"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            aria-busy={busy}
            autoFocus
            className={`rounded-xl px-4 py-2 text-sm font-bold shadow-md disabled:opacity-60 ${confirmClasses}`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
