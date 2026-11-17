"use client";

import Avatar from "@/components/avatar";
import { useLoading } from "@/components/loading";
import { Dialog } from "@/components/ui/dialog";
import { Menu, MenuItem } from "@/components/ui/menu";
import { Popover } from "@/components/ui/popover";
import { Tabs } from "@/components/ui/tabs";
import {
  cardPages,
  collections,
  matrix,
  me,
  messages,
  moreCollections,
  people,
  type CellResult,
} from "@/lib/data";
import { Link, useNavigate } from "@/lib/navigation";
import { Ghost } from "ghostlyjs";
import {
  BellOff,
  Copy,
  Ellipsis,
  Flag,
  Minus,
  Send,
  Share2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState, type FormEvent } from "react";

type Tab = "table" | "people" | "chat" | "matrix";

// A detail page, one per collection (/collections/1 to /6): the same
// <Ghost>s with other data. A cover image, a podium, tabs with a sticky
// table column, a chat and a wide matrix.
export default function CollectionScreen({ id }: { id: string }) {
  const { isLoading } = useLoading();
  const [tab, setTab] = useState<Tab>("table");
  const collection = [...collections, ...moreCollections].find(
    (item) => item.id === id,
  );

  if (!collection) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-2xl font-bold">Not found</h1>
        <Link href="/collections" className="text-accent">
          Back to all collections
        </Link>
      </div>
    );
  }

  return (
    <>
      <Ghost name="collection-header" isLoading={isLoading}>
        <section className="flex flex-col">
          {/* A cover that keeps its aspect ratio */}
          <img
            src="/cover.svg"
            alt=""
            width={800}
            height={400}
            className="aspect-[3/1] w-full rounded-3xl object-cover sm:aspect-[4/1] xl:aspect-[6/1]"
          />
          <div className="flex flex-col gap-4 px-2 sm:px-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-3">
              {/* Hangs over the bottom edge of the cover */}
              <span className="-mt-10 flex size-20 items-center justify-center rounded-2xl border-4 border-background bg-card text-4xl">
                {collection.emoji}
              </span>
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold sm:text-3xl">
                  {collection.name}
                </h1>
                <p className="max-w-xl text-muted">{collection.description}</p>
              </div>
            </div>
            <Actions />
          </div>
        </section>
      </Ghost>

      <Ghost name="collection-podium" isLoading={isLoading}>
        {/* Centered, at most 28rem wide: 2nd, 1st, 3rd */}
        <section className="mx-auto grid w-full max-w-md grid-cols-3 items-end gap-2 text-center">
          {[people[1]!, people[0]!, people[2]!].map((member, index) => (
            <div key={member.id} className="flex flex-col items-center gap-2">
              <Avatar member={member} size={index === 1 ? "lg" : "md"} />
              <span className="text-sm font-medium">
                {member.name.split(" ")[0]}
              </span>
              <div
                className={`flex w-full items-start justify-center rounded-t-xl bg-card pt-2 text-lg font-bold ${
                  ["h-16", "h-24", "h-12"][index]
                }`}
              >
                {[2, 1, 3][index]}
              </div>
            </div>
          ))}
        </section>
      </Ghost>

      <section className="flex flex-col gap-4">
        <Tabs
          label="Views"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "table", label: "Table" },
            { id: "people", label: "People", count: people.length },
            { id: "chat", label: "Chat", count: messages.length },
            { id: "matrix", label: "Matrix" },
          ]}
        />
        <div role="tabpanel">
          {tab === "table" && (
            <Ghost name="collection-table" isLoading={isLoading}>
              <StickyTable />
            </Ghost>
          )}
          {tab === "people" && (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Ghost name="collection-people" isLoading={isLoading} count={6}>
                {people.map((member, index) => (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 rounded-2xl border border-border p-3"
                  >
                    <Avatar member={member} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">
                        {member.name}
                      </span>
                      <span className="text-sm text-muted">{member.role}</span>
                    </div>
                    {index === 0 && (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                        Owner
                      </span>
                    )}
                  </li>
                ))}
              </Ghost>
            </ul>
          )}
          {tab === "chat" && <Chat />}
          {tab === "matrix" && (
            <Ghost name="collection-matrix" isLoading={isLoading}>
              <Matrix />
            </Ghost>
          )}
        </div>
      </section>
    </>
  );
}

// Share (a popover), more (a menu) and remove (asks first, then sends a
// DELETE that `ghostly measure` blocks).
function Actions() {
  const navigate = useNavigate();
  const [removing, setRemoving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function remove() {
    try {
      const response = await fetch("/api/collections/1", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
      navigate("/collections");
    } catch {
      setError(true);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Popover
        label="Share"
        triggerClassName="flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
        panelClassName="left-0 w-72 md:right-0 md:left-auto"
        trigger={
          <>
            <Share2 className="size-4" /> Share
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">A popover</p>
          <div className="flex gap-2">
            <input
              readOnly
              value="example.com/c/7f3a"
              className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-1.5 font-mono text-xs"
            />
            <button
              type="button"
              aria-label="Copy link"
              onClick={() => {
                void navigator.clipboard
                  ?.writeText("https://example.com/c/7f3a")
                  .catch(() => {});
                setCopied(true);
              }}
              className="rounded-xl border border-border p-2"
            >
              <Copy className="size-4" />
            </button>
          </div>
          {copied && <p className="text-xs text-success">Copied</p>}
        </div>
      </Popover>
      <button
        type="button"
        onClick={() => setRemoving(true)}
        className="rounded-full border border-border px-4 py-2 text-sm"
      >
        Remove
      </button>
      <Menu
        label="More actions"
        triggerClassName="rounded-full border border-border p-2"
        trigger={<Ellipsis className="size-4" />}
      >
        <MenuItem>
          <BellOff className="size-4" /> Mute
        </MenuItem>
        <MenuItem danger>
          <Flag className="size-4" /> Report
        </MenuItem>
      </Menu>
      <Dialog
        open={removing}
        onClose={() => setRemoving(false)}
        alert
        title="An alert dialog"
        description="Remove sends a DELETE, which `ghostly measure` blocks and never taps."
      >
        {error && (
          <p className="text-sm text-danger">Couldn&apos;t remove it.</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setRemoving(false)}
            className="rounded-full px-4 py-2 text-sm"
          >
            Keep
          </button>
          <button
            type="button"
            onClick={remove}
            className="rounded-full bg-danger px-4 py-2 text-sm font-medium text-white"
          >
            Remove
          </button>
        </div>
      </Dialog>
    </div>
  );
}

// A table that scrolls sideways on phones, with the first column stuck to
// the left edge (opaque, so the other columns scroll below it).
function StickyTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-md text-left text-sm">
        <thead className="text-muted">
          <tr>
            <th className="sticky left-0 bg-background p-3 font-medium">
              Person
            </th>
            <th className="p-3 text-right font-medium">Done</th>
            <th className="p-3 text-right font-medium">Open</th>
            <th className="hidden p-3 text-right font-medium md:table-cell">
              Trend
            </th>
            <th className="p-3 text-right font-medium">Score</th>
          </tr>
        </thead>
        <tbody>
          {people.map((member, index) => (
            <tr
              key={member.id}
              className={`border-t border-border ${
                member.id === me.id ? "bg-card" : "bg-background"
              }`}
            >
              <td className="sticky left-0 bg-inherit p-3">
                <div className="flex items-center gap-3">
                  <span className="w-5 font-mono text-muted">{index + 1}</span>
                  <Avatar member={member} size="sm" />
                  <span className="font-medium whitespace-nowrap">
                    {member.name}
                  </span>
                </div>
              </td>
              <td className="p-3 text-right">{member.done}</td>
              <td className="p-3 text-right">{member.open}</td>
              <td className="hidden p-3 md:table-cell">
                <span
                  className={`ml-auto flex w-fit items-center gap-1 ${
                    member.change > 0
                      ? "text-success"
                      : member.change < 0
                        ? "text-danger"
                        : "text-muted"
                  }`}
                >
                  {member.change > 0 ? (
                    <TrendingUp className="size-4" />
                  ) : member.change < 0 ? (
                    <TrendingDown className="size-4" />
                  ) : (
                    <Minus className="size-4" />
                  )}
                  {Math.abs(member.change)}
                </span>
              </td>
              <td className="p-3 text-right text-base font-bold">
                {member.score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Messages from others on the left, own ones on the right. Sending posts
// the message, which `ghostly measure` blocks.
function Chat() {
  const { isLoading } = useLoading();
  const [error, setError] = useState(false);

  async function send(event: FormEvent) {
    event.preventDefault();
    try {
      const response = await fetch("/api/messages", { method: "POST" });
      if (!response.ok) throw new Error();
    } catch {
      setError(true);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Ghost name="collection-chat" isLoading={isLoading}>
        <div className="flex flex-col gap-3">
          {/* A divider with lines on both sides */}
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            Today
            <span className="h-px flex-1 bg-border" />
          </div>
          {messages.map((message) => {
            const member = people.find((item) => item.id === message.from)!;
            const own = member.id === me.id;
            return (
              <div
                key={message.id}
                className={`flex max-w-[85%] items-end gap-2 sm:max-w-[70%] ${
                  own ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                {!own && <Avatar member={member} size="sm" />}
                <div
                  className={`flex flex-col gap-1 rounded-2xl px-3.5 py-2 ${
                    own ? "bg-accent text-on-accent" : "bg-card"
                  }`}
                >
                  {!own && (
                    <span className="text-xs font-semibold">{member.name}</span>
                  )}
                  <p className="text-sm">{message.text}</p>
                  <span className="self-end text-[0.65rem] opacity-60">
                    {message.time}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Ghost>
      <form onSubmit={send} className="flex gap-2">
        <input
          name="message"
          placeholder="Write a message"
          className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2"
        />
        <button
          type="submit"
          aria-label="Send"
          className="rounded-full bg-foreground p-2.5 text-background"
        >
          <Send className="size-4" />
        </button>
      </form>
      {error && (
        <p className="text-sm text-danger">
          The message couldn&apos;t be sent.
        </p>
      )}
    </div>
  );
}

const resultStyles: Record<CellResult, string> = {
  good: "bg-success text-white",
  okay: "bg-success/20 text-success",
  bad: "bg-danger/15 text-danger",
  empty: "text-muted",
};

// People × cards: wide, scrolls sideways on phones.
function Matrix() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-center text-sm">
        <thead>
          <tr>
            <th className="p-2" />
            {cardPages[0]!.map((card) => (
              <th key={card.id} className="p-2 font-mono text-xs text-muted">
                #{card.id}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => {
            const member = people.find((item) => item.id === row.person)!;
            return (
              <tr key={row.person}>
                <td className="p-2 text-left">
                  <Avatar member={member} size="sm" />
                </td>
                {row.cells.map(([value, result], index) => (
                  <td key={index} className="p-1">
                    <span
                      className={`inline-block min-w-11 rounded-lg px-2 py-1 font-mono text-xs ${resultStyles[result]}`}
                    >
                      {value}
                    </span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
