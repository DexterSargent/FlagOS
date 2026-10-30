"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type FormNoticeTone = "error" | "success" | "info";

export interface FormNoticeState {
  tone: FormNoticeTone;
  message: string;
}

const TONE_CLASSES: Record<FormNoticeTone, string> = {
  error:
    "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200",
  success:
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200",
  info: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-500/40 dark:bg-sky-950/40 dark:text-sky-200",
};

const TONE_ICON: Record<FormNoticeTone, typeof Info> = {
  error: AlertTriangle,
  success: CheckCircle2,
  info: Info,
};

interface FormNoticeProps {
  notice: FormNoticeState | null | undefined;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Inline, accessible replacement for native alert() inside forms and modals.
 * Errors announce assertively; success/info announce politely.
 */
export default function FormNotice({ notice, onDismiss, className = "" }: FormNoticeProps) {
  if (!notice?.message) return null;
  const Icon = TONE_ICON[notice.tone];
  const isError = notice.tone === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${TONE_CLASSES[notice.tone]} ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 leading-snug">{notice.message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notice"
          className="shrink-0 rounded-md p-0.5 opacity-70 transition hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
