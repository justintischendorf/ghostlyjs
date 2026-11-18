"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

import { useDismiss } from "./use-dismiss";

// A button that opens a panel next to it, e.g. the notifications.
export function Popover({
  label,
  trigger,
  triggerClassName = "",
  panelClassName = "",
  children,
}: {
  label: string;
  trigger: ReactNode;
  triggerClassName?: string;
  // Width and position of the panel.
  panelClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className={`absolute top-full z-30 mt-2 rounded-2xl border border-border bg-background p-4 shadow-xl ${panelClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
