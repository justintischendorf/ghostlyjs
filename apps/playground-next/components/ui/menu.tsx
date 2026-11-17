"use client";

import { Link } from "@/lib/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useDismiss } from "./use-dismiss";

const CloseContext = createContext(() => {});

// A button that opens a list of actions below it (`role="menu"`).
export function Menu({
  label,
  trigger,
  triggerClassName = "",
  align = "end",
  children,
}: {
  // For screen readers, and the tooltip.
  label: string;
  trigger: ReactNode;
  triggerClassName?: string;
  align?: "start" | "end";
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
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={`absolute top-full z-30 mt-2 flex min-w-48 flex-col rounded-2xl border border-border bg-background p-1.5 shadow-xl ${
            align === "end" ? "right-0" : "left-0"
          }`}
        >
          <CloseContext.Provider value={close}>
            {children}
          </CloseContext.Provider>
        </div>
      )}
    </div>
  );
}

const itemClass =
  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm hover:bg-card aria-checked:font-semibold";

export function MenuItem({
  onSelect,
  checked,
  danger = false,
  children,
}: {
  onSelect?: () => void;
  // A choice of several (`menuitemradio`).
  checked?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  const close = useContext(CloseContext);
  return (
    <button
      type="button"
      role={checked === undefined ? "menuitem" : "menuitemradio"}
      aria-checked={checked}
      onClick={() => {
        onSelect?.();
        close();
      }}
      className={`${itemClass} ${danger ? "text-danger" : ""}`}
    >
      {children}
    </button>
  );
}

export function MenuLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const close = useContext(CloseContext);
  return (
    <Link href={href} role="menuitem" onClick={close} className={itemClass}>
      {children}
    </Link>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-border" />;
}
