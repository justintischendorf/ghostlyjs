"use client";

import { X } from "lucide-react";
import { useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useDismiss } from "./use-dismiss";

// A panel that slides in from the left (navigation) or the bottom (a sheet
// on phones). Rendered into <body> with a portal, like most UI libraries.
export function Drawer({
  open,
  onClose,
  side,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  side: "left" | "bottom";
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useDismiss(open, close, ref);
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 bg-black/50">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed flex flex-col gap-4 overflow-y-auto bg-background p-5 shadow-2xl ${
          side === "left"
            ? "inset-y-0 left-0 w-[min(20rem,85vw)]"
            : "inset-x-0 bottom-0 max-h-[80vh] rounded-t-3xl"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted hover:bg-card"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
