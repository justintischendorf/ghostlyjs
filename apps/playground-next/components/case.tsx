import type { ReactNode } from "react";

// A titled part of a page: what it shows for `ghostly measure`, e.g. "A
// button pushed to the right edge". The title stays visible; what is
// measured is the <Ghost> inside.
export default function Case({
  title,
  note,
  action,
  children,
  className = "",
}: {
  title: string;
  // One line on what to look for.
  note?: string;
  // A button or link next to the title, outside of the <Ghost>.
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex min-w-0 flex-col gap-3 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
            {title}
          </h2>
          {note && <p className="text-sm text-muted">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
