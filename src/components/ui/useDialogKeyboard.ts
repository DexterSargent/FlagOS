"use client";

import { useEffect, useRef } from "react";

/**
 * Standard keyboard behaviour for in-app dialogs: Escape closes (unless busy),
 * focus moves into the dialog on open and returns to the opener on close.
 */
export function useDialogKeyboard<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  onClose: () => void,
  options: { busy?: boolean } = {},
) {
  const dialogRef = useRef<T | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const { busy = false } = options;

  useEffect(() => {
    if (!isOpen) return;
    openerRef.current = (document.activeElement as HTMLElement | null) ?? null;

    const node = dialogRef.current;
    if (node && !node.contains(document.activeElement)) {
      const target = node.querySelector<HTMLElement>(
        "[autofocus], input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])",
      );
      (target ?? node).focus({ preventScroll: true });
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      openerRef.current?.focus?.({ preventScroll: true });
    };
  }, [isOpen, busy, onClose]);

  return dialogRef;
}
