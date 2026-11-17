"use client";

import { useLoading } from "@/components/loading";
import { Ghost } from "ghostlyjs";
import { Bell, Search, Settings, Star } from "lucide-react";
import type { ReactNode } from "react";

// Each case: a title and what is inside the <Ghost>. `wrap` puts the
// <Ghost> into a parent of its own, e.g. next to another element.
const cases: {
  name: string;
  title: string;
  content: ReactNode;
  wrap?: (ghost: ReactNode) => ReactNode;
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
    name: "flex-grow",
    title: "Grows next to a fixed box",
    // The <Ghost> is the `flex-1` item next to a box outside of it.
    wrap: (ghost) => (
      <div className="flex items-center gap-3">
        <div className="size-12 shrink-0 rounded-xl bg-accent" />
        {ghost}
      </div>
    ),
    content: (
      <div className="flex min-w-0 flex-1 flex-col rounded-xl bg-card p-3">
        <span className="font-medium">Fills the rest</span>
        <span className="text-sm text-muted">of the row</span>
      </div>
    ),
  },
  {
    name: "pushed-right",
    title: "Pushed to the right edge",
    content: (
      <button className="ml-auto block rounded-full bg-foreground px-4 py-2 text-background">
        On the right
      </button>
    ),
  },
  {
    name: "centered",
    title: "Centered with auto margins",
    content: (
      <div className="mx-auto flex w-fit flex-col items-center gap-2">
        <div className="size-12 rounded-full bg-accent" />
        <span className="text-sm">Centered</span>
      </div>
    ),
  },
  {
    name: "aspect-ratio",
    title: "Keeps its aspect ratio",
    content: (
      <div className="flex aspect-video w-full items-end rounded-xl bg-linear-to-br from-accent to-danger p-3 font-semibold text-white">
        16 : 9
      </div>
    ),
  },
  {
    name: "toolbar",
    title: "In a parent sized by its content",
    // The parent is as wide as its content, the skeleton included.
    wrap: (ghost) => (
      <div className="flex w-fit items-center gap-1 rounded-full border border-border p-1">
        {ghost}
        <span className="px-2 text-sm text-muted">static</span>
      </div>
    ),
    content: (
      <div className="flex gap-1">
        {["B", "I", "U"].map((letter) => (
          <button
            key={letter}
            className="size-8 rounded-full bg-card font-serif font-bold"
          >
            {letter}
          </button>
        ))}
      </div>
    ),
  },
  {
    name: "mixed-sizes",
    title: "Text of different sizes in one line",
    content: (
      <p className="flex items-baseline gap-2">
        <span className="text-4xl font-bold">42</span>
        <span className="text-sm text-muted">points this week</span>
      </p>
    ),
  },
  {
    name: "screen-reader",
    title: "Text for screen readers only",
    content: (
      <p>
        Visible text<span className="sr-only"> and a hidden explanation</span>
      </p>
    ),
  },
  {
    name: "scaled",
    title: "Scaled element",
    content: (
      <div className="flex h-16 items-center justify-center">
        <div className="h-12 w-40 scale-75 rounded-xl bg-accent" />
      </div>
    ),
  },
  {
    name: "form-controls",
    title: "Form controls",
    content: (
      <div className="flex flex-col gap-2">
        <input
          placeholder="Input"
          className="rounded-lg border border-border bg-background px-2 py-1"
        />
        <select className="rounded-lg border border-border bg-background px-2 py-1">
          <option>Select</option>
        </select>
        <input type="range" aria-label="Range" />
        <progress value={60} max={100} className="w-full" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked /> Checkbox
        </label>
      </div>
    ),
  },
  {
    name: "table",
    title: "Table",
    content: (
      <table className="w-full text-left text-sm">
        <tbody>
          {[
            ["Berlin", "142"],
            ["Hamburg", "98"],
            ["Munich", "131"],
          ].map(([city, points]) => (
            <tr key={city} className="border-b border-border">
              <td className="py-1.5">{city}</td>
              <td className="py-1.5 text-right font-mono">{points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  },
  {
    name: "right-to-left",
    title: "Right-to-left text",
    content: (
      <p dir="rtl" lang="ar">
        نص عربي يمتد على أكثر من سطر واحد في البطاقة الضيقة
      </p>
    ),
  },
  {
    name: "emoji",
    title: "Emoji only",
    content: <p className="text-3xl">⚽ 🏆 🔥</p>,
  },
  {
    name: "highlight",
    title: "Highlight across lines",
    content: (
      <p className="text-sm">
        Before{" "}
        <mark className="box-decoration-clone bg-accent/30 px-1 text-foreground">
          a highlighted part that breaks onto the next line
        </mark>{" "}
        after.
      </p>
    ),
  },
  {
    name: "display-contents",
    title: "Element with display: contents",
    content: (
      <div className="contents">
        <span className="block rounded-lg bg-card p-2">Inside contents</span>
      </div>
    ),
  },
  {
    name: "auto-fit",
    title: "Grid with as many columns as fit",
    content: (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(3.5rem,1fr))] gap-2">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="h-10 rounded-lg bg-accent/40" />
        ))}
      </div>
    ),
  },
  {
    name: "overlay",
    title: "Text over an image",
    content: (
      <div className="relative">
        <img
          src="/cover.svg"
          alt=""
          width={800}
          height={400}
          className="h-auto w-full rounded-xl"
        />
        <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white">
          Caption
        </span>
      </div>
    ),
  },
  {
    name: "gradient-border",
    title: "Gradient border",
    content: (
      <div className="rounded-2xl bg-linear-to-r from-accent to-danger p-0.5">
        <div className="rounded-[0.875rem] bg-background p-3 text-sm">
          A card inside a gradient
        </div>
      </div>
    ),
  },
  {
    name: "details",
    title: "Open details",
    content: (
      <details open className="text-sm">
        <summary className="cursor-pointer font-medium">Summary</summary>
        <p className="pt-1 text-muted">Shown because it is open.</p>
      </details>
    ),
  },
  {
    name: "nested",
    title: "A Ghost inside a Ghost",
    content: (
      <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
        <span className="font-medium">Outer</span>
        <InnerGhost />
      </div>
    ),
  },
  {
    name: "twin",
    title: "Same name twice (1)",
    content: <TwinContent />,
  },
  {
    name: "twin",
    title: "Same name twice (2)",
    content: <TwinContent />,
  },
  {
    name: "empty",
    title: "Nothing inside",
    content: null,
  },
  {
    name: "never-measured",
    title: "Never measured (always loading)",
    content: <p>This content is never shown, so it is never measured.</p>,
    alwaysLoading: true,
  },
];

// A tiny web component: its content lives in an open shadow root, the
// text passed in from outside is shown through a <slot>. Not on the server.
if (typeof window !== "undefined" && !customElements.get("ghostly-demo-card")) {
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

// A <Ghost> inside the content of another one.
function InnerGhost() {
  const { isLoading } = useLoading();
  return (
    <Ghost name="edge-nested-inner" isLoading={isLoading}>
      <p className="rounded-lg bg-card p-2 text-sm">Inner</p>
    </Ghost>
  );
}

function TwinContent() {
  return (
    <div className="flex items-center gap-2">
      <div className="size-8 rounded-lg bg-accent" />
      <span className="text-sm">Two Ghosts, one name</span>
    </div>
  );
}

export default function EdgeCases() {
  const { isLoading } = useLoading();

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Edge cases</h1>
        <p className="text-muted">
          Small cases the measuring has to handle. The title stays visible, only
          the part below it is wrapped in a Ghost.
        </p>
      </div>
      {/* 1, 2, 3, then 4 columns */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:gap-6">
        {cases.map((item, index) => {
          const ghost = (
            <Ghost
              name={`edge-${item.name}`}
              isLoading={isLoading || !!item.alwaysLoading}
            >
              {item.content}
            </Ghost>
          );
          return (
            <div
              key={index}
              // `min-w-0`: long unwrapped text (truncate) must not widen the
              // grid column.
              className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border p-4 md:p-5"
            >
              <h2 className="text-sm font-medium text-muted">{item.title}</h2>
              {item.wrap ? item.wrap(ghost) : ghost}
            </div>
          );
        })}
      </div>
    </>
  );
}
