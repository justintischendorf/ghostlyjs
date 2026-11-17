"use client";

import Case from "@/components/case";
import { useLoading } from "@/components/loading";
import { Dialog } from "@/components/ui/dialog";
import { Menu, MenuItem } from "@/components/ui/menu";
import { collections, moreCollections, type Collection } from "@/lib/data";
import { Link } from "@/lib/navigation";
import { Ghost } from "ghostlyjs";
import {
  ArrowUpDown,
  ChevronRight,
  LayoutGrid,
  List,
  Lock,
  Plus,
  Search,
  Star,
  Shapes,
} from "lucide-react";
import { useState, type FormEvent } from "react";

const sorts = {
  rank: {
    label: "Best rank",
    by: (a: Collection, b: Collection) => a.rank - b.rank,
  },
  name: {
    label: "Name",
    by: (a: Collection, b: Collection) => a.name.localeCompare(b.name),
  },
  members: {
    label: "Most items",
    by: (a: Collection, b: Collection) => b.items - a.items,
  },
};
type Sort = keyof typeof sorts;

// Search, a sort menu, two views of the same items (a grid and a list),
// "Load more" and a form in a dialog.
export default function Collections() {
  const { isLoading } = useLoading();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("rank");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [all, setAll] = useState(false);
  const [creating, setCreating] = useState(false);
  const shown = [...collections, ...(all ? moreCollections : [])]
    .filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
    .sort(sorts[sort].by);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold sm:text-3xl">Collections</h1>
          <p className="text-muted">
            A grid and a list of the same items, a menu and a dialog.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2 font-medium text-background"
        >
          <Plus className="size-4" /> New collection
        </button>
      </div>

      {/* Search grows, sort and view keep their size */}
      <div className="-mt-4 flex flex-wrap items-center gap-2 sm:-mt-6 sm:flex-nowrap">
        <label className="flex w-full items-center gap-2 rounded-full border border-border px-4 py-2 sm:w-auto sm:flex-1">
          <Search className="size-4 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search collections"
            className="w-full bg-transparent outline-none"
          />
        </label>
        <Menu
          label="Sort collections"
          triggerClassName="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm"
          trigger={
            <>
              <ArrowUpDown className="size-4" /> {sorts[sort].label}
            </>
          }
        >
          {(Object.keys(sorts) as Sort[]).map((key) => (
            <MenuItem
              key={key}
              checked={sort === key}
              onSelect={() => setSort(key)}
            >
              {sorts[key].label}
            </MenuItem>
          ))}
        </Menu>
        <div
          role="radiogroup"
          aria-label="View"
          className="ml-auto flex rounded-full border border-border p-1 sm:ml-0"
        >
          {(
            [
              ["grid", LayoutGrid],
              ["list", List],
            ] as const
          ).map(([value, Icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={view === value}
              aria-label={`Show as ${value}`}
              onClick={() => setView(value)}
              className={`rounded-full p-1.5 ${view === value ? "bg-card" : "text-muted"}`}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Two views of the same items, each its own <Ghost>: the list only
          shows after a tap on "Show as list". */}
      <Case
        title={view === "grid" ? "Grid with count" : "List with count"}
        note="1 to 4 columns, or rows. Cards of different heights."
      >
        {view === "grid" ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <Ghost name="collections-grid" isLoading={isLoading} count={4}>
              {shown.map((item) => (
                <CollectionCard key={item.id} item={item} />
              ))}
            </Ghost>
          </ul>
        ) : (
          <ul className="flex flex-col gap-2">
            <Ghost name="collections-rows" isLoading={isLoading} count={4}>
              {shown.map((item) => (
                <CollectionRow key={item.id} item={item} />
              ))}
            </Ghost>
          </ul>
        )}
      </Case>

      {!all && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mx-auto -mt-4 rounded-full border border-border px-5 py-2 text-sm"
        >
          Load more
        </button>
      )}

      <NewCollectionDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function CollectionCard({ item }: { item: Collection }) {
  const [favorite, setFavorite] = useState(item.id === "1");
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-border">
      {/* A banner with the emoji hanging over its bottom edge */}
      <div className="relative h-20 bg-linear-to-br from-accent/60 to-accent/10">
        <span className="absolute -bottom-6 left-4 flex size-12 items-center justify-center rounded-xl border-4 border-background bg-card text-2xl">
          {item.emoji}
        </span>
        <button
          type="button"
          aria-label="Favorite"
          aria-pressed={favorite}
          onClick={() => setFavorite((value) => !value)}
          className="absolute top-2 right-2 rounded-full bg-background/70 p-1.5"
        >
          <Star
            className={`size-4 ${favorite ? "fill-warning text-warning" : ""}`}
          />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 pt-8">
        <div className="flex items-center gap-2">
          <h2 className="truncate font-semibold">{item.name}</h2>
          {item.private && <Lock className="size-3.5 shrink-0 text-muted" />}
        </div>
        <p className="line-clamp-2 text-sm text-muted">{item.description}</p>
        <div className="mt-auto flex items-center justify-between pt-2 text-sm">
          <span className="flex items-center gap-1.5 text-muted">
            <Shapes className="size-4" /> {item.items}
          </span>
          <span className="font-semibold">#{item.rank}</span>
        </div>
        <Link
          href={`/collections/${item.id}`}
          className="rounded-full border border-border py-1.5 text-center text-sm font-medium"
        >
          Open
        </Link>
      </div>
    </li>
  );
}

function CollectionRow({ item }: { item: Collection }) {
  return (
    <li>
      <Link
        href={`/collections/${item.id}`}
        className="flex items-center gap-3 rounded-2xl border border-border p-3 sm:gap-4 sm:p-4"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-xl">
          {item.emoji}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{item.name}</span>
          <span className="truncate text-sm text-muted">
            {item.description}
          </span>
        </div>
        {/* Item count from sm on */}
        <span className="hidden w-20 items-center gap-1.5 text-sm text-muted sm:flex">
          <Shapes className="size-4" /> {item.items}
        </span>
        <span className="w-10 text-right font-semibold">#{item.rank}</span>
        <ChevronRight className="size-4 shrink-0 text-muted" />
      </Link>
    </li>
  );
}

const emojis = ["📐", "🪟", "🔤", "📈", "📝", "🖼️", "🧪", "🧩"];

// A form in a dialog. "Create" sends a POST, which `ghostly measure`
// blocks, so it shows the error.
function NewCollectionDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { isLoading } = useLoading();
  const [emoji, setEmoji] = useState(emojis[0]);
  const [error, setError] = useState<string>();

  async function create(event: FormEvent) {
    event.preventDefault();
    try {
      const response = await fetch("/api/collections", { method: "POST" });
      if (!response.ok) throw new Error();
      onClose();
    } catch {
      setError("Couldn't create it: `ghostly measure` blocks the POST.");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="A form in a dialog"
      description="With a Ghost that only shows in the dialog."
    >
      <form onSubmit={create} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Name
          <input
            name="name"
            placeholder="My collection"
            className="rounded-xl border border-border bg-background px-3 py-2 font-normal"
          />
        </label>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">Emoji</legend>
          <div className="grid grid-cols-8 gap-1">
            {emojis.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={emoji === value}
                onClick={() => setEmoji(value)}
                className={`aspect-square rounded-lg text-xl ${
                  emoji === value ? "bg-accent/25" : "hover:bg-card"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1.5 font-medium">Visibility</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="privacy" defaultChecked /> Private
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="privacy" /> Everyone
          </label>
        </fieldset>

        {/* Suggestions that load with the dialog */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Public collections</p>
          <Ghost name="collections-suggestions" isLoading={isLoading}>
            <ul className="flex flex-col gap-2">
              {collections
                .filter((item) => !item.private)
                .map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl bg-card p-2.5 text-sm"
                  >
                    <span className="text-lg">{item.emoji}</span>
                    <span className="flex-1 font-medium">{item.name}</span>
                    <span className="text-muted">{item.items} items</span>
                  </li>
                ))}
            </ul>
          </Ghost>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Create
          </button>
        </div>
      </form>
    </Dialog>
  );
}
