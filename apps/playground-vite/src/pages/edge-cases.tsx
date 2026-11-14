import { Ghost } from "ghostlyjs";
import { Bell, Search, Settings, Star } from "lucide-react";
import type { ReactNode } from "react";

import { useLoading } from "../components/loading";

// Each case: a title and what is inside the <Ghost>.
const cases: {
  name: string;
  title: string;
  content: ReactNode;
  alwaysLoading?: boolean;
}[] = [
  {
    name: "text-only",
    title: "Plain text, no element",
    content: "Just a text node without any wrapper.",
  },
  {
    name: "inline",
    title: "Inline formatting",
    content: (
      <p>
        Text with <strong>bold</strong>, <em>italic</em>,{" "}
        <a href="#" className="text-accent underline">
          a link
        </a>{" "}
        and <code className="rounded bg-card px-1 font-mono">code</code>.
      </p>
    ),
  },
  {
    name: "long-text",
    title: "Text that wraps",
    content: (
      <p className="text-sm">
        A narrow paragraph with enough words to wrap over several lines. Each
        line should become its own box in the skeleton.
      </p>
    ),
  },
  {
    name: "buttons",
    title: "Pill and icon buttons",
    content: (
      <div className="flex items-center gap-3">
        <button className="rounded-full bg-foreground px-4 py-2 text-background">
          Pill button
        </button>
        <button
          className="rounded-xl border border-border p-2"
          aria-label="Settings"
        >
          <Settings className="size-5" />
        </button>
      </div>
    ),
  },
  {
    name: "badges",
    title: "Badges",
    content: (
      <div className="flex flex-wrap gap-2">
        {["New", "Beta", "Featured", "Sale"].map((badge) => (
          <span
            key={badge}
            className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent"
          >
            {badge}
          </span>
        ))}
      </div>
    ),
  },
  {
    name: "icons",
    title: "SVG icons",
    content: (
      <div className="flex gap-4">
        <Search className="size-6" />
        <Bell className="size-6" />
        <Star className="size-6" />
      </div>
    ),
  },
  {
    name: "image",
    title: "Image",
    content: (
      <img
        src="/cover.svg"
        alt=""
        width={800}
        height={400}
        className="h-auto w-full rounded-xl"
      />
    ),
  },
  {
    name: "hidden",
    title: "Hidden elements are skipped",
    content: (
      <div className="flex gap-3">
        <div className="size-10 rounded-lg bg-accent" />
        <div className="invisible size-10 rounded-lg bg-accent" />
        <div className="size-10 rounded-lg bg-accent opacity-0" />
        <div className="hidden size-10 rounded-lg bg-accent" />
      </div>
    ),
  },
  {
    name: "overflow",
    title: "Horizontal scroll is clipped",
    content: (
      <div className="flex gap-3 overflow-x-auto">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="h-16 w-24 shrink-0 rounded-lg bg-card" />
        ))}
      </div>
    ),
  },
  {
    name: "shadow",
    title: "Surface from a shadow only",
    content: <div className="h-20 rounded-2xl shadow-lg" />,
  },
  {
    name: "list",
    title: "List with dividers",
    content: (
      <ul className="divide-y divide-border">
        {["First item", "Second item", "Third item"].map((item) => (
          <li key={item} className="py-2">
            {item}
          </li>
        ))}
      </ul>
    ),
  },
  {
    name: "background-image",
    title: "Background image",
    content: (
      <div className="flex h-20 items-center justify-center rounded-2xl bg-[url(/cover.svg)] bg-cover bg-center font-bold text-on-accent">
        Background
      </div>
    ),
  },
  {
    name: "web-component",
    title: "Web component with Shadow DOM",
    content: (
      <ghostly-demo-card>
        <span>Slotted text from outside</span>
      </ghostly-demo-card>
    ),
  },
  {
    name: "video",
    title: "Video",
    content: (
      <video
        className="aspect-video w-full rounded-xl bg-foreground"
        controls
      />
    ),
  },
  {
    name: "canvas",
    title: "Canvas",
    content: <canvas className="h-24 w-full rounded-xl bg-card" />,
  },
  {
    name: "iframe",
    title: "Iframe",
    content: (
      <iframe
        title="Example"
        srcDoc="<p style='font-family:sans-serif'>Inside an iframe</p>"
        className="h-24 w-full rounded-xl border border-border"
      />
    ),
  },
  {
    name: "absolute",
    title: "Absolutely positioned badge",
    content: (
      <div className="relative size-16">
        <div className="size-16 rounded-full bg-accent" />
        <span className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-danger text-xs text-background">
          3
        </span>
      </div>
    ),
  },
  {
    name: "truncate",
    title: "Truncated text (one line)",
    content: (
      <p className="truncate">
        A very long sentence that does not fit into one line and ends with an
        ellipsis instead of wrapping.
      </p>
    ),
  },
  {
    name: "line-clamp",
    title: "Clamped text (two lines)",
    content: (
      <p className="line-clamp-2 text-sm">
        A long paragraph that is cut after two lines with line-clamp. The rest
        of the text is hidden, so the skeleton should only show two lines and
        not all the hidden ones below them.
      </p>
    ),
  },
  {
    name: "rotated",
    title: "Rotated element",
    content: (
      <div className="flex h-20 items-center justify-center">
        <div className="h-8 w-32 rotate-12 rounded-lg bg-accent" />
      </div>
    ),
  },
  {
    name: "never-measured",
    title: "Never measured (always loading)",
    content: <p>This content is never shown, so it is never measured.</p>,
    alwaysLoading: true,
  },
];

// A tiny web component: its content lives in an open shadow root, the
// text passed in from outside is shown through a <slot>.
if (!customElements.get("ghostly-demo-card")) {
  customElements.define(
    "ghostly-demo-card",
    class extends HTMLElement {
      connectedCallback() {
        if (this.shadowRoot) return;
        this.attachShadow({ mode: "open" }).innerHTML = `
          <div style="display:flex;flex-direction:column;gap:4px;padding:16px;border:1px solid var(--border);border-radius:16px">
            <strong>Shadow DOM</strong>
            <slot></slot>
          </div>`;
      }
    },
  );
}

export default function EdgeCases() {
  const { isLoading } = useLoading();

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Edge cases</h1>
        <p className="text-muted">
          Small cases the measuring has to handle. The title stays visible, only
          the part below it is wrapped in a Ghost.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cases.map((item) => (
          <div
            key={item.name}
            // `min-w-0`: long unwrapped text (truncate) must not widen the
            // grid column.
            className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border p-5"
          >
            <h2 className="text-sm font-medium text-muted">{item.title}</h2>
            <Ghost
              name={`edge-${item.name}`}
              isLoading={isLoading || !!item.alwaysLoading}
            >
              {item.content}
            </Ghost>
          </div>
        ))}
      </div>
    </>
  );
}
