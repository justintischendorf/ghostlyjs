"use client";

import { useLoading } from "@/components/loading";
import MemberCard from "@/components/member";
import { members } from "@/lib/data";
import { Ghost } from "ghostlyjs";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const { isLoading } = useLoading();

  return (
    <>
      <Ghost name="home-hero" isLoading={isLoading}>
        {/* One column below lg, from lg on with the cover next to it */}
        <section className="grid items-center gap-8 lg:grid-cols-2 xl:gap-12 2xl:grid-cols-[3fr_2fr]">
          <div className="flex flex-col gap-4 sm:gap-5">
            <span className="w-fit rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-accent">
              Playground
            </span>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl xl:text-6xl">
              Skeletons that measure themselves
            </h1>
            <p className="max-w-2xl text-base text-muted sm:text-lg">
              Use the button in the top right to switch every page between the
              real content and its skeleton. Each section is wrapped in a Ghost
              and measured in dev mode.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/feed"
                className="flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-medium text-background"
              >
                Open the feed <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/edge-cases"
                className="rounded-full border border-border px-5 py-2.5 text-center font-medium"
              >
                Edge cases
              </Link>
            </div>
          </div>
          {/* Hidden below lg: the skeleton must leave it out there */}
          <Image
            src="/cover.svg"
            alt=""
            width={800}
            height={400}
            unoptimized
            // Above the fold: Next.js warns about a lazy one.
            loading="eager"
            className="hidden h-auto w-full rounded-3xl lg:block"
          />
        </section>
      </Ghost>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Team</h2>
        {/* 1, 2, 3, then 6 columns of stacked cards. Not 3 at md: the names
            would wrap in some cards, and the repeated first card is shorter. */}
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {/* One Ghost for the whole list: the first card is measured and
              repeated as often as there were cards. The skeletons are
              items of this grid, so its columns and gap apply. */}
          <Ghost name="home-members" isLoading={isLoading} count>
            {members.map((member) => (
              <MemberCard key={member.name} {...member} stacked />
            ))}
          </Ghost>
        </div>
      </section>

      <Ghost name="home-cta" isLoading={isLoading}>
        <section className="flex flex-col items-start gap-4 rounded-3xl bg-accent p-6 text-on-accent sm:p-8 md:flex-row md:items-center md:justify-between lg:p-10">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl xl:text-3xl">
              Ready to try it?
            </h2>
            <p className="text-on-accent/80">
              Run ghostly measure and reload a page.
            </p>
          </div>
          <code className="rounded-xl bg-on-accent/20 px-4 py-2 font-mono text-sm">
            bunx ghostly measure http://localhost:3000
          </code>
        </section>
      </Ghost>
    </>
  );
}
