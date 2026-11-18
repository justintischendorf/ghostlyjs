"use client";

import Avatar from "@/components/avatar";
import Case from "@/components/case";
import { useLoading } from "@/components/loading";
import { Dialog } from "@/components/ui/dialog";
import { Drawer } from "@/components/ui/drawer";
import {
  cardPages,
  cards,
  people,
  type Card,
  type CardStatus,
} from "@/lib/data";
import { useNavigate, useSearchParam } from "@/lib/navigation";
import { Ghost } from "ghostlyjs";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  MapPin,
  MessageSquare,
  Pin,
} from "lucide-react";
import { Suspense, useState } from "react";

const filters = ["all", "draft", "active", "review", "done"] as const;
type Filter = (typeof filters)[number];

const statusStyles: Record<CardStatus, string> = {
  draft: "bg-accent/15 text-accent",
  active: "bg-success/15 text-success",
  review: "bg-warning/20 text-warning",
  done: "bg-card text-muted",
};

const person = (id: string) => people.find((item) => item.id === id)!;

// The URL of a state of this page: `?page=2`, `?item=7`, or both.
function hrefOf(page: number, item?: string): string {
  const query = new URLSearchParams();
  if (page > 1) query.set("page", String(page));
  if (item) query.set("item", item);
  const search = query.toString();
  return search ? `/cards?${search}` : "/cards";
}

// The <Suspense> is for Next.js, where reading the URL needs one.
export default function Cards() {
  return (
    <Suspense fallback={null}>
      <CardsScreen />
    </Suspense>
  );
}

// A list of cards on three pages with other content each (`?page=2`),
// filters, a dialog that opens by its URL (`?item=3`), a closed accordion,
// and a summary that is a sidebar from lg on and a sheet below it.
function CardsScreen() {
  const { isLoading } = useLoading();
  const navigate = useNavigate();
  const page = Math.min(
    Math.max(Number(useSearchParam("page") ?? 1) || 1, 1),
    cardPages.length,
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [sheet, setSheet] = useState(false);
  const shown = cardPages[page - 1]!.filter(
    (card) => filter === "all" || card.status === filter,
  );
  const pinned = cards.filter((card) => card.pinned).length;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold sm:text-3xl">Cards</h1>
          <p className="text-muted">
            Pages with other content, filters, a dialog, an accordion and a
            sheet.
          </p>
        </div>
        {/* Buttons, not links: the page is the same, only `?page=`
            changes, and the same <Ghost>s show other cards */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => navigate(hrefOf(page - 1), { scroll: false })}
            className="rounded-full border border-border p-2 disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-28 text-center font-medium">
            Page {page} of {cardPages.length}
          </span>
          <button
            type="button"
            aria-label="Next page"
            disabled={page >= cardPages.length}
            onClick={() => navigate(hrefOf(page + 1), { scroll: false })}
            className="rounded-full border border-border p-2 disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Filter chips, they scroll sideways on phones */}
      <div className="-mt-4 flex gap-2 overflow-x-auto pb-1 sm:-mt-6">
        {filters.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm capitalize ${
              filter === value
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {/* The summary is a sidebar from lg on, a sheet below. One column of
          minmax(0, 1fr) on phones: an auto column would grow to the longest
          title (`truncate` doesn't wrap) and overflow the window. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem] 2xl:gap-8">
        <div className="flex flex-col gap-6">
          <Case
            title="Cards with count"
            note="1, then 2 columns. Each page has other cards, and another number of them."
          >
            {shown.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
                No {filter} cards on this page.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Ghost name="cards-list" isLoading={isLoading} count>
                  {shown.map((card) => (
                    <CardItem key={card.id} card={card} page={page} />
                  ))}
                </Ghost>
              </ul>
            )}
          </Case>

          {/* Closed until tapped: the <Ghost> inside is hidden until then */}
          <details className="group rounded-2xl border border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 font-medium">
              A Ghost in a closed accordion
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4">
              <Ghost name="cards-accordion" isLoading={isLoading}>
                <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
                  <dt>Hidden until the summary is tapped</dt>
                  <dd className="font-semibold">yes</dd>
                  <dt>Measured once it opens</dt>
                  <dd className="font-semibold">yes</dd>
                  <dt>Two columns, one wide</dt>
                  <dd className="font-semibold">yes</dd>
                  <dt className="text-muted">Muted last row</dt>
                  <dd className="text-muted">–</dd>
                </dl>
              </Ghost>
            </div>
          </details>
        </div>

        <aside className="sticky top-24 hidden lg:block">
          <Summary />
        </aside>
      </div>

      {/* Below lg: a button at the bottom of the window opens the sheet */}
      <button
        type="button"
        onClick={() => setSheet(true)}
        className="fixed right-4 bottom-4 z-10 flex items-center gap-2 rounded-full bg-foreground px-5 py-3 font-medium text-background shadow-xl lg:hidden"
      >
        <Pin className="size-4" /> Summary ({pinned})
      </button>
      <Drawer
        open={sheet}
        onClose={() => setSheet(false)}
        side="bottom"
        title="Summary"
      >
        <Summary />
      </Drawer>

      <CardDialog page={page} />
    </>
  );
}

function CardItem({ card, page }: { card: Card; page: number }) {
  const navigate = useNavigate();
  const owner = person(card.owner);

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-xl">
          {card.emoji}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="truncate font-semibold">{card.title}</h2>
          <p className="truncate text-xs text-muted">
            Due {card.due} · {card.place}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[card.status]}`}
        >
          {card.status}
        </span>
      </div>
      {/* Two lines at most; shorter text on other pages */}
      <p className="line-clamp-2 text-sm text-muted">{card.excerpt}</p>
      {/* Wraps when there are many */}
      <ul className="flex flex-wrap gap-1.5">
        {card.tags.map((tag) => (
          <li
            key={tag}
            className="rounded-md bg-card px-2 py-0.5 font-mono text-xs"
          >
            #{tag}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${card.progress}%` }}
          />
        </div>
        <span className="w-9 text-right text-xs text-muted">
          {card.progress}%
        </span>
      </div>
      <div className="flex items-center gap-2 border-t border-border pt-3">
        <Avatar member={owner} size="sm" />
        <span className="min-w-0 truncate text-sm">{owner.name}</span>
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
          <MessageSquare className="size-3.5" /> {card.comments}
        </span>
        <button
          type="button"
          // The same label on every card: `ghostly measure` taps only one.
          aria-label="Details"
          onClick={() => navigate(hrefOf(page, card.id), { scroll: false })}
          className="ml-auto flex shrink-0 items-center gap-1 rounded-xl px-2 py-1.5 text-xs text-muted hover:bg-card"
        >
          <Info className="size-4" />
          <span className="hidden sm:inline">Details</span>
        </button>
      </div>
    </li>
  );
}

// The same <Ghost> in the sidebar (from lg on) and in the sheet (below
// lg). Its button sends a POST, which `ghostly measure` blocks.
function Summary() {
  const { isLoading } = useLoading();
  const [saved, setSaved] = useState<string>();
  const pinned = cards.filter((card) => card.pinned);

  async function save() {
    try {
      const response = await fetch("/api/pins", { method: "POST" });
      setSaved(response.ok ? "Saved" : "Couldn't save, try again.");
    } catch {
      setSaved("Couldn't save, try again.");
    }
  }

  return (
    <Ghost name="cards-summary" isLoading={isLoading}>
      <div className="flex flex-col gap-4 rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Sidebar or sheet</h2>
          <span className="rounded-full bg-card px-2 py-0.5 text-xs">
            {pinned.length} pinned
          </span>
        </div>
        <ul className="flex flex-col gap-3">
          {pinned.map((card) => (
            <li key={card.id} className="flex items-center gap-3 text-sm">
              <span className="text-lg">{card.emoji}</span>
              <span className="min-w-0 flex-1 truncate">{card.title}</span>
              <span className="shrink-0 text-xs text-muted">{card.due}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-border pt-4 text-sm">
          <span className="text-muted">Done on all pages</span>
          <span className="text-xl font-bold">
            {cards.filter((card) => card.status === "done").length} /{" "}
            {cards.length}
          </span>
        </div>
        <button
          type="button"
          onClick={save}
          className="rounded-full bg-accent py-2.5 font-medium text-on-accent"
        >
          Save (a blocked POST)
        </button>
        {saved && <p className="text-center text-xs text-muted">{saved}</p>}
      </div>
    </Ghost>
  );
}

// The card in `?item=`: opened by a tap on "Details", or by the URL.
function CardDialog({ page }: { page: number }) {
  const { isLoading } = useLoading();
  const navigate = useNavigate();
  const id = useSearchParam("item");
  const card = cards.find((item) => item.id === id);
  const owner = card && person(card.owner);

  return (
    <Dialog
      open={!!card}
      onClose={() => navigate(hrefOf(page), { scroll: false })}
      title="A dialog opened by its URL"
      wide
    >
      {card && owner && (
        <Ghost name="cards-details" isLoading={isLoading}>
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-card text-3xl">
                {card.emoji}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="text-xl font-semibold">{card.title}</h3>
                <p className="text-sm text-muted">{card.excerpt}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Avatar member={owner} />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{owner.name}</span>
                <span className="text-xs text-muted">{owner.role}</span>
              </div>
              <span
                className={`ml-auto rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[card.status]}`}
              >
                {card.status}
              </span>
            </div>

            {/* One bar in three parts */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs text-muted">
                <span>Done</span>
                <span>Open</span>
                <span>Blocked</span>
              </div>
              <div className="flex h-2.5 gap-1">
                <div className="w-1/2 rounded-full bg-accent" />
                <div className="w-[30%] rounded-full bg-border" />
                <div className="w-1/5 rounded-full bg-danger" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Squares results="GGOBG" />
              <span className="hidden text-xs text-muted sm:inline">
                Badges at both edges
              </span>
              <Squares results="BOGBB" />
            </div>

            <figure className="flex flex-col gap-2">
              <img
                src="/cover.svg"
                alt=""
                width={800}
                height={400}
                className="aspect-[3/1] w-full rounded-2xl object-cover"
              />
              <figcaption className="flex items-center gap-1.5 text-sm text-muted">
                <MapPin className="size-4" /> {card.place}
              </figcaption>
            </figure>
          </div>
        </Ghost>
      )}
    </Dialog>
  );
}

function Squares({ results }: { results: string }) {
  const colors: Record<string, string> = {
    G: "bg-success text-white",
    O: "bg-border",
    B: "bg-danger text-white",
  };
  return (
    <div className="flex gap-0.5 sm:gap-1">
      {[...results].map((result, index) => (
        <span
          key={index}
          className={`flex size-5 items-center justify-center rounded-md text-[0.65rem] font-bold sm:size-6 sm:text-xs ${colors[result]}`}
        >
          {result}
        </span>
      ))}
    </div>
  );
}
