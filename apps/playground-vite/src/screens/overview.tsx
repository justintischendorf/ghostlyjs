"use client";

import Avatar from "@/components/avatar";
import Case from "@/components/case";
import { useLoading } from "@/components/loading";
import { Tabs } from "@/components/ui/tabs";
import { activities, monthly, people, stats, weekly } from "@/lib/data";
import { Link } from "@/lib/navigation";
import { Ghost } from "ghostlyjs";
import { ArrowRight, Columns3, FileText, Layers, Ruler } from "lucide-react";
import { useState, type ComponentType } from "react";

const statIcons: ComponentType<{ className?: string }>[] = [
  FileText,
  Layers,
  Ruler,
  Columns3,
];

// The start page: a main column that grows with the window and, from lg
// on, a sidebar of a fixed width next to it.
export default function Overview() {
  const { isLoading } = useLoading();
  const [tab, setTab] = useState<"activity" | "people">("activity");

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start xl:gap-12">
      <div className="flex min-w-0 flex-1 flex-col gap-10">
        {/* The button moves to the right edge from md on */}
        <Ghost name="overview-hero" isLoading={isLoading}>
          <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Skeletons that measure themselves
              </h1>
              <p className="max-w-xl text-muted">
                Every part of these pages is a case for{" "}
                <code className="font-mono">ghostly measure</code>. The button
                in the top right switches between the content and its skeleton;
                both must cover the same area.
              </p>
            </div>
            <Link
              href="/cards"
              className="flex w-fit shrink-0 items-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-medium text-background"
            >
              Start with cards <ArrowRight className="size-4" />
            </Link>
          </section>
        </Ghost>

        <Case
          title="Grid of separate Ghosts"
          note="2, then 4 columns. Each card is its own Ghost."
        >
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = statIcons[index]!;
              return (
                <Ghost
                  key={stat.label}
                  name={`overview-stat-${index}`}
                  isLoading={isLoading}
                >
                  <div className="flex flex-col gap-1 rounded-2xl border border-border p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted">{stat.label}</p>
                      <Icon className="size-4 text-accent" />
                    </div>
                    <p className="text-2xl font-bold sm:text-3xl">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted">{stat.hint}</p>
                  </div>
                </Ghost>
              );
            })}
          </div>
        </Case>

        <BarChart />

        <Case
          title="List with count"
          note="One Ghost for the list: the first row is measured and repeated."
          action={
            <Link href="/cards" className="text-sm text-accent">
              More lists
            </Link>
          }
        >
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border px-4">
            <Ghost name="overview-list" isLoading={isLoading} count>
              {people.slice(0, 4).map((person) => (
                <li key={person.id} className="flex items-center gap-3 py-3">
                  <Avatar member={person} size="sm" />
                  <p className="min-w-0 flex-1 truncate text-sm">
                    {person.name}
                    <span className="text-muted"> · {person.role}</span>
                  </p>
                  <span className="shrink-0 text-xs text-muted">
                    {person.score}
                  </span>
                </li>
              ))}
            </Ghost>
          </ul>
        </Case>

        {/* The second tab only shows its <Ghost> after a tap */}
        <Case
          title="Tabs"
          note="The second tab's Ghost only shows after a tap."
        >
          <Tabs
            label="Tabs"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "activity", label: "Activity" },
              { id: "people", label: "People", count: people.length - 1 },
            ]}
          />
          {tab === "activity" ? (
            <ul role="tabpanel" className="flex flex-col gap-4">
              <Ghost name="overview-activity" isLoading={isLoading}>
                {activities.map((activity) => {
                  const person = people.find(
                    (item) => item.name === activity.who,
                  )!;
                  return (
                    <li key={activity.id} className="flex items-start gap-3">
                      <Avatar member={person} size="sm" />
                      <p className="flex-1 text-sm">
                        <span className="font-semibold">{activity.who}</span>{" "}
                        <span className="text-muted">{activity.text}</span>
                      </p>
                      <span className="shrink-0 text-xs text-muted">
                        {activity.time}
                      </span>
                    </li>
                  );
                })}
              </Ghost>
            </ul>
          ) : (
            // 2, 3, then 5 columns of centered cards.
            <div
              role="tabpanel"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-5"
            >
              <Ghost name="overview-people" isLoading={isLoading} count={5}>
                {people.slice(1).map((person) => (
                  <div
                    key={person.id}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-border p-4 text-center"
                  >
                    <Avatar member={person} size="lg" />
                    {/* One line each: every card as high as the first, like the
                        skeletons that repeat it */}
                    <p className="max-w-full truncate text-sm font-medium">
                      {person.name}
                    </p>
                    <p className="max-w-full truncate text-xs text-muted">
                      {person.role}
                    </p>
                  </div>
                ))}
              </Ghost>
            </div>
          )}
        </Case>
      </div>

      {/* Below the main column on phones, a sidebar from lg on */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:w-80 lg:shrink-0 xl:w-96">
        <SidebarCard />
        <Ghost name="overview-progress" isLoading={isLoading}>
          <div className="flex flex-col gap-3 rounded-2xl bg-card p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Progress bar</h2>
              <span className="text-sm text-muted">12 / 34</span>
            </div>
            <div className="h-2 rounded-full bg-border">
              <div className="h-full w-[35%] rounded-full bg-accent" />
            </div>
            <p className="text-sm text-muted">
              A card on a filled surface, with a bar that is 35% of its width.
            </p>
          </div>
        </Ghost>
      </aside>
    </div>
  );
}

// Bars that keep their aspect ratio: taller on wider windows.
function BarChart() {
  const { isLoading } = useLoading();
  const [range, setRange] = useState<"month" | "week">("month");
  const values = range === "month" ? monthly : weekly;
  const max = Math.max(...values);

  return (
    <Ghost name="overview-chart" isLoading={isLoading}>
      <section className="flex flex-col gap-4 rounded-2xl border border-border p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Bars with an aspect ratio</h2>
          <div className="flex rounded-full bg-card p-1 text-sm">
            {(["month", "week"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={range === value}
                onClick={() => setRange(value)}
                className={`rounded-full px-3 py-1 capitalize ${
                  range === value ? "bg-background shadow" : "text-muted"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="flex aspect-[2/1] items-end gap-1 sm:aspect-[3/1] sm:gap-2">
          {values.map((value, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-md bg-accent"
              style={{ height: `${(value / max) * 100}%` }}
            />
          ))}
        </div>
      </section>
    </Ghost>
  );
}

function SidebarCard() {
  const { isLoading } = useLoading();

  return (
    <Ghost name="overview-sidebar" isLoading={isLoading}>
      <div className="flex flex-col gap-4 rounded-2xl border border-border p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-card text-2xl">
            📐
          </span>
          <div className="flex min-w-0 flex-col">
            <p className="text-xs text-muted uppercase">Fixed width</p>
            <h2 className="truncate font-semibold">Sidebar card</h2>
          </div>
          <span className="ml-auto text-3xl font-bold">#1</span>
        </div>
        {/* Overlapping avatars */}
        <div className="flex items-center">
          <div className="flex -space-x-3">
            {people.slice(0, 4).map((person) => (
              <Avatar
                key={person.id}
                member={person}
                size="sm"
                className="ring-2 ring-background"
              />
            ))}
          </div>
          <span className="ml-3 text-sm text-muted">overlapping avatars</span>
        </div>
        <Link
          href="/collections/1"
          className="rounded-full border border-border py-2 text-center text-sm font-medium"
        >
          Open a detail page
        </Link>
      </div>
    </Ghost>
  );
}
