"use client";

import { useLoading } from "@/components/loading";
import MemberCard from "@/components/member";
import { members, posts } from "@/lib/data";
import { Ghost } from "ghostlyjs";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import Image from "next/image";

const actions = [
  { label: "Like", Icon: Heart },
  { label: "Comment", Icon: MessageCircle },
  { label: "Share", Icon: Share2 },
];

export default function Feed() {
  const { isLoading } = useLoading();

  return (
    // The sidebar moves next to the posts from lg on and gets wider at xl
    // and 2xl.
    <div className="grid gap-8 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_320px] xl:gap-10 2xl:grid-cols-[1fr_380px]">
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold sm:text-3xl">Feed</h1>
        {posts.map((post, index) => (
          <Ghost key={index} name={`feed-post-${index}`} isLoading={isLoading}>
            <article className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:gap-4 sm:p-5 xl:p-6">
              <div className="flex items-center gap-3">
                <div className="size-10 shrink-0 rounded-full bg-accent sm:size-12" />
                <div>
                  <p className="font-semibold">{post.author}</p>
                  <p className="text-sm text-muted">{post.time}</p>
                </div>
              </div>
              <p className="sm:text-lg">{post.text}</p>
              {post.image && (
                <Image
                  src="/cover.svg"
                  alt=""
                  width={800}
                  height={400}
                  className="h-auto w-full rounded-xl"
                  unoptimized
                />
              )}
              {/* Icons only below md, with labels from md on */}
              <div className="flex gap-6 text-muted">
                {actions.map(({ label, Icon }) => (
                  <span key={label} className="flex items-center gap-2 text-sm">
                    <Icon className="size-5" />
                    <span className="hidden md:inline">{label}</span>
                  </span>
                ))}
              </div>
            </article>
          </Ghost>
        ))}
      </section>

      <aside className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Who to follow</h2>
        {/* Below the posts: a list, then 3 columns from md on. Next to the
            posts (lg): a list again. */}
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-1">
          {members.slice(0, 3).map((member, index) => (
            <Ghost
              key={member.name}
              name={`feed-follow-${index}`}
              isLoading={isLoading}
            >
              <MemberCard {...member} />
            </Ghost>
          ))}
        </div>
      </aside>
    </div>
  );
}
