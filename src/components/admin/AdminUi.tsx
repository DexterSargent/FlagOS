"use client";

import PageGuideButton from "@/components/walkthrough/PageGuideButton";

import { useEffect, type ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";

type Tone = "cyan" | "emerald" | "amber" | "violet" | "rose" | "neutral";

const TONES: Record<Tone, { border: string; bg: string; icon: string }> = {
  cyan: { border: "border-cyan-500/20", bg: "bg-cyan-500/[0.06]", icon: "text-cyan-300" },
  emerald: { border: "border-emerald-500/20", bg: "bg-emerald-500/[0.06]", icon: "text-emerald-300" },
  amber: { border: "border-amber-500/20", bg: "bg-amber-500/[0.06]", icon: "text-amber-300" },
  violet: { border: "border-violet-500/20", bg: "bg-violet-500/[0.06]", icon: "text-violet-300" },
  rose: { border: "border-rose-500/20", bg: "bg-rose-500/[0.06]", icon: "text-rose-300" },
  neutral: { border: "border-white/10", bg: "bg-white/[0.03]", icon: "text-neutral-300" },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
}) {
  const colors = TONES[tone];
  return (
    <div className={`min-w-0 rounded-2xl border ${colors.border} ${colors.bg} p-4`}>
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-[11px] font-bold uppercase tracking-wide text-neutral-400">{label}</div>
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${colors.icon}`} aria-hidden />}
      </div>
      <div className="mt-1.5 truncate text-2xl font-black tabular-nums tracking-tight">{value}</div>
      {hint && <div className="mt-1 truncate text-xs text-neutral-500">{hint}</div>}
    </div>
  );
}

export function Panel({
  tour,
  title,
  icon: Icon,
  action,
  children,
  className = "",
}: {
  tour?: string;
  title: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section data-tour={tour} className={`min-w-0 rounded-2xl border border-white/10 bg-neutral-900/70 p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-black">
          {Icon && <Icon className="h-4 w-4 text-neutral-400" aria-hidden />} {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-neutral-500">{children}</p>;
}

/** Paired revenue/expense columns per month; values share one scale. */
export function MonthlyBars({
  points,
  format,
}: {
  points: Array<{ key: string; label: string; revenue: number; expenses: number }>;
  format: (value: number) => string;
}) {
  const max = Math.max(1, ...points.map((point) => Math.max(point.revenue, point.expenses)));
  return (
    <div>
      <div className="flex h-44 items-end gap-1 sm:gap-2" role="img" aria-label="Monthly revenue and expenses">
        {points.map((point) => (
          <div key={point.key} className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-0.5">
            <div
              className="w-1/2 max-w-4 rounded-t bg-emerald-400/80 transition-colors group-hover:bg-emerald-300"
              style={{ height: `${Math.max(point.revenue > 0 ? 3 : 0, (Math.max(0, point.revenue) / max) * 100)}%` }}
            />
            <div
              className="w-1/2 max-w-4 rounded-t bg-rose-400/70 transition-colors group-hover:bg-rose-300"
              style={{ height: `${Math.max(point.expenses > 0 ? 3 : 0, (point.expenses / max) * 100)}%` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-neutral-950 px-2 py-1 text-[11px] shadow-xl group-hover:block">
              <div className="font-bold">{point.label}</div>
              <div className="text-emerald-300">In {format(point.revenue)}</div>
              <div className="text-rose-300">Out {format(point.expenses)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1 sm:gap-2">
        {points.map((point) => (
          <div key={point.key} className="min-w-0 flex-1 truncate text-center text-[10px] text-neutral-500">{point.label}</div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-neutral-400">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400/80" /> Revenue</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-400/70" /> Expenses</span>
      </div>
    </div>
  );
}

/** Small area chart for a single series (e.g. customers or MRR over time). */
export function TrendLine({
  values,
  labels,
  format,
  id,
}: {
  values: number[];
  labels: string[];
  format: (value: number) => string;
  id: string;
}) {
  const width = 300;
  const height = 90;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const coords = values.map((value, index) => [index * step, height - (value / max) * (height - 8) - 4] as const);
  const line = coords.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-24 w-full" role="img" aria-label="Trend">
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(34 211 238)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(34 211 238)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke="rgb(34 211 238)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-neutral-500">
        <span>{labels[0]}</span>
        <span className="font-bold text-neutral-300">{format(values[values.length - 1] ?? 0)} now</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

export function SplitBar({ segments }: { segments: Array<{ label: string; value: number; color: string; display?: string }> }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
        {total > 0 && segments.map((segment) => (
          <div key={segment.label} className={segment.color} style={{ width: `${(segment.value / total) * 100}%` }} title={segment.label} />
        ))}
      </div>
      <ul className="mt-3 grid gap-1.5 text-xs">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-neutral-300">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${segment.color}`} />
              <span className="truncate">{segment.label}</span>
            </span>
            <span className="font-bold tabular-nums">
              {segment.display ?? segment.value}
              {total > 0 && <span className="ml-1.5 font-normal text-neutral-500">{Math.round((segment.value / total) * 100)}%</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  labelId,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  labelId: string;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector('[aria-label$=" walkthrough"]')) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/80 backdrop-blur-sm sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby={labelId} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/15 bg-neutral-900 p-5 text-white shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <h2 id={labelId} className="text-lg font-black">{title}</h2>
          <PageGuideButton />
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-cyan-400/60";
export const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-neutral-400";
export const ghostButtonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-neutral-200 hover:bg-white/10 disabled:opacity-50";
export const primaryButtonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-black text-neutral-950 hover:bg-cyan-300 disabled:opacity-50";

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    trial: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    past_due: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    canceled: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    archived: "border-white/15 bg-white/5 text-neutral-400",
    paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    complimentary: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  };
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[status] || "border-white/15 bg-white/5 text-neutral-400"}`}>
      {status === "past_due" ? "past due" : status === "complimentary" ? "comp" : status}
    </span>
  );
}
