"use client";

import { useLoading } from "@/components/loading";
import MemberCard from "@/components/member";
import { members } from "@/lib/data";
import { Ghost } from "ghostlyjs";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { isLoading } = useLoading();

  return (
    <>
      <Ghost name="home-hero" isLoading={isLoading}>
        <section className="flex flex-col gap-5">
          <span className="w-fit rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-accent">
            Playground
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Skeletons that measure themselves
          </h1>
          <p className="max-w-2xl text-lg text-muted">
            Use the button in the top right to switch every page between the
            real content and its skeleton. Each section is wrapped in a Ghost
            and measured in dev mode.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/feed"
              className="flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-medium text-background"
            >
              Open the feed <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/edge-cases"
              className="rounded-full border border-border px-5 py-2.5 font-medium"
            >
              Edge cases
            </Link>
          </div>
        </section>
      </Ghost>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Team</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* One Ghost for the whole list: the first card is measured and
              repeated as often as there were cards. The skeletons are
              items of this grid, so its columns and gap apply. */}
          <Ghost name="home-members" isLoading={isLoading} count>
            {members.map((member) => (
              <MemberCard key={member.name} {...member} />
            ))}
          </Ghost>
        </div>
      </section>

      <Ghost name="home-cta" isLoading={isLoading}>
        <section className="flex flex-col items-start gap-4 rounded-3xl bg-accent p-8 text-on-accent sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Ready to try it?</h2>
            <p className="text-on-accent/80">
              Run ghostly dev and reload a page.
            </p>
          </div>
          <code className="rounded-xl bg-on-accent/20 px-4 py-2 font-mono text-sm">
            bunx ghostly dev
          </code>
        </section>
      </Ghost>
    </>
  );
}
