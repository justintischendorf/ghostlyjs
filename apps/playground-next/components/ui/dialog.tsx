"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

// A modal on top of the page: the browser's <dialog>, so it sits in the top
// layer and Escape closes it. Its content only renders while it is open.
export function Dialog({
  open,
  onClose,
  title,
  description,
  alert = false,
  wide = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  // A question that needs an answer ("Delete account?").
  alert?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      role={alert ? "alertdialog" : undefined}
      aria-labelledby={titleId}
      onClose={onClose}
      // A click on the backdrop (the dialog itself, outside its content).
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
      className={`m-auto w-[calc(100%-2rem)] rounded-3xl border border-border bg-background p-0 text-foreground backdrop:bg-black/50 ${
        wide ? "max-w-3xl" : "max-w-lg"
      }`}
    >
      {open && (
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              {description && (
                <p className="text-sm text-muted">{description}</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => ref.current?.close()}
              className="shrink-0 rounded-full p-1.5 text-muted hover:bg-card hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
