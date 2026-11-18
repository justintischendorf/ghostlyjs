"use client";

import Avatar from "@/components/avatar";
import { useLoading } from "@/components/loading";
import { monthly, people } from "@/lib/data";
import { Ghost } from "ghostlyjs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

// Charts of every kind: SVG, a donut, a heatmap grid, a carousel and text
// in columns.
export default function Charts() {
  const { isLoading } = useLoading();

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Charts</h1>
        <p className="text-muted">
          SVG, a donut, a grid that fits as many squares as it can, a carousel
          and text in columns.
        </p>
      </div>

      {/* Donut and trend side by side from md on, the trend grows */}
      <div className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Ghost name="charts-donut" isLoading={isLoading}>
          <section className="flex flex-col items-center gap-4 rounded-2xl border border-border p-5">
            <h2 className="self-start font-semibold">Donut with a legend</h2>
            <Donut />
            <ul className="flex w-full flex-col gap-1.5 text-sm">
              {[
                ["Good", "17%", "bg-success"],
                ["Okay", "57%", "bg-accent"],
                ["Bad", "26%", "bg-danger"],
              ].map(([label, value, color]) => (
                <li key={label} className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${color}`} />
                  {label}
                  <span className="ml-auto text-muted">{value}</span>
                </li>
              ))}
            </ul>
          </section>
        </Ghost>

        <Ghost name="charts-line" isLoading={isLoading}>
          <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Stretched SVG line</h2>
              <span className="text-sm text-success">
                fixed height, any width
              </span>
            </div>
            <Trend />
          </section>
        </Ghost>
      </div>

      <Ghost name="charts-squares" isLoading={isLoading}>
        <section className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <h2 className="font-semibold">auto-fill grid</h2>
          {/* As many squares per row as fit */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(0.875rem,1fr))] gap-1">
            {Array.from({ length: 84 }, (_, index) => (
              <span
                key={index}
                className="aspect-square rounded-sm bg-accent"
                style={{ opacity: [0.1, 0.3, 0.6, 1][((index * 7) % 11) % 4] }}
              />
            ))}
          </div>
        </section>
      </Ghost>

      <Carousel />

      <Ghost name="charts-columns" isLoading={isLoading}>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Text in columns</h2>
          {/* Text in 1, 2, then 3 columns */}
          <div className="gap-8 text-sm leading-relaxed text-muted md:columns-2 xl:columns-3">
            <p className="mb-4">
              CSS columns break text into one, two, then three columns. Where a
              paragraph breaks into the next column changes with the width, so
              its lines move between columns as the window grows.
            </p>
            <p className="mb-4">
              The skeleton draws one bar per line of text, at the place the line
              has in its column, and is measured again wherever a line moves.
            </p>
            <p className="mb-4">
              {people[1]!.name} wrote the third paragraph. It is short, so at
              some widths the last column is shorter than the others.
            </p>
          </div>
        </section>
      </Ghost>
    </>
  );
}

function Donut() {
  // Circumference of a circle with r = 15.9: ~100, so the dash lengths
  // are percentages.
  const parts = [
    { value: 17, offset: 0, className: "stroke-success" },
    { value: 57, offset: -17, className: "stroke-accent" },
    { value: 26, offset: -74, className: "stroke-danger" },
  ];
  return (
    <div className="relative size-40 xl:size-48">
      <svg viewBox="0 0 36 36" className="size-full -rotate-90">
        {parts.map((part) => (
          <circle
            key={part.value}
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            strokeWidth="4"
            strokeDasharray={`${part.value} ${100 - part.value}`}
            strokeDashoffset={part.offset}
            className={part.className}
          />
        ))}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">74%</span>
        <span className="text-xs text-muted">centered</span>
      </span>
    </div>
  );
}

// A line chart that stretches with its card, at a fixed height.
function Trend() {
  const max = Math.max(...monthly);
  const points = monthly
    .map(
      (value, index) =>
        `${(index / (monthly.length - 1)) * 100},${40 - (value / max) * 36}`,
    )
    .join(" ");
  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="h-40 w-full sm:h-48"
      >
        <polyline
          points={points}
          fill="none"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          className="stroke-accent"
        />
      </svg>
      <div className="flex justify-between text-xs text-muted">
        <span>January</span>
        <span>December</span>
      </div>
    </div>
  );
}

// Cards that scroll sideways, with buttons to scroll.
function Carousel() {
  const { isLoading } = useLoading();
  const track = useRef<HTMLDivElement>(null);
  const scroll = (direction: number) =>
    track.current?.scrollBy({ left: direction * 240, behavior: "smooth" });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Carousel</h2>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scroll(-1)}
            className="rounded-full border border-border p-2"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scroll(1)}
            className="rounded-full border border-border p-2"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <Ghost name="charts-carousel" isLoading={isLoading}>
        <div ref={track} className="flex snap-x gap-3 overflow-x-auto pb-2">
          {people.map((person, index) => (
            <div
              key={person.id}
              className="flex w-56 shrink-0 snap-start flex-col gap-3 rounded-2xl border border-border p-4"
            >
              <div className="flex items-center gap-3">
                <Avatar member={person} />
                <span className="truncate font-medium">{person.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Overflow</span>
                <span className="font-semibold">
                  {60 + ((index * 7) % 35)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </Ghost>
    </section>
  );
}
