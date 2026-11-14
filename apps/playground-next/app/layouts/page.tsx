"use client";

import { useLoading } from "@/components/loading";
import MemberCard from "@/components/member";
import { members } from "@/lib/data";
import { Ghost } from "ghostlyjs";

export default function Layouts() {
  const { isLoading } = useLoading();

  return (
    <>
      <h1 className="text-3xl font-bold">Layouts</h1>

      {/* A Ghost as flex item next to a `shrink-0` circle */}
      <Section title="Flex row with a shrink-0 avatar">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Profile header</h2>
          <Ghost name="layout-avatar" isLoading={isLoading}>
            <div className="size-20 shrink-0 rounded-full bg-accent" />
          </Ghost>
        </div>
      </Section>

      {/* Two `flex-1` columns: the browser splits them by content */}
      <Section title="Two flex-1 columns">
        <div className="flex flex-col gap-6 md:flex-row">
          <Ghost name="layout-article" isLoading={isLoading}>
            <article className="flex flex-col gap-3 rounded-2xl border border-border p-6 md:flex-1">
              <h2 className="text-xl font-bold">Article</h2>
              <p className="text-muted">
                This column and the list next to it both use flex-1. The
                skeleton has to take the same share of the row as the real
                content, otherwise the text lines get too short or overlap the
                neighbour. Resize the window to see how it adapts.
              </p>
            </article>
          </Ghost>
          <div className="flex flex-col gap-3 md:flex-1">
            {members.slice(0, 3).map((member, index) => (
              <Ghost
                key={member.name}
                name={`layout-member-${index}`}
                isLoading={isLoading}
              >
                <MemberCard {...member} />
              </Ghost>
            ))}
          </div>
        </div>
      </Section>

      {/* Several siblings in one Ghost: they are separate flex items of the
          parent, but share one skeleton */}
      <Section title="Several siblings in one Ghost">
        <div className="flex flex-col gap-4">
          <Ghost name="layout-siblings" isLoading={isLoading}>
            <h2 className="text-xl font-bold">First sibling</h2>
            <p className="text-muted">Second sibling, a paragraph.</p>
            <button
              type="button"
              className="w-fit rounded-full bg-foreground px-4 py-2 text-background"
            >
              Third sibling
            </button>
          </Ghost>
        </div>
      </Section>

      {/* Centered content: `mx-auto` and `justify-center` */}
      <Section title="Centered content">
        <div className="flex flex-col gap-6">
          <Ghost name="layout-centered" isLoading={isLoading}>
            <div className="mx-auto flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-border p-6 text-center">
              <div className="size-14 rounded-full bg-accent" />
              <h2 className="font-bold">Centered card</h2>
              <p className="text-sm text-muted">
                With mx-auto and centered text.
              </p>
            </div>
          </Ghost>
          <div className="flex justify-center">
            <Ghost name="layout-justify-center" isLoading={isLoading}>
              <button
                type="button"
                className="rounded-full border border-border px-6 py-2"
              >
                Centered by the parent
              </button>
            </Ghost>
          </div>
        </div>
      </Section>

      {/* A Ghost inside a Ghost */}
      <Section title="Nested Ghosts">
        <Ghost name="layout-outer" isLoading={isLoading}>
          <div className="flex flex-col gap-4 rounded-2xl border border-border p-6">
            <h2 className="font-bold">Outer Ghost</h2>
            <Ghost name="layout-inner" isLoading={isLoading}>
              <div className="rounded-xl bg-card p-4">
                <p>Inner Ghost with its own measurement.</p>
              </div>
            </Ghost>
          </div>
        </Ghost>
      </Section>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted">{title}</h2>
      {children}
    </section>
  );
}
