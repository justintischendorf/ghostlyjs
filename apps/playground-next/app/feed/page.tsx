"use client";

import { useLoading } from "@/components/loading";
import MemberCard from "@/components/member";
import { members, posts } from "@/lib/data";
import { Ghost } from "ghostlyjs";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import Image from "next/image";

export default function Feed() {
  const { isLoading } = useLoading();

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Feed</h1>
        {posts.map((post, index) => (
          <Ghost key={index} name={`feed-post-${index}`} isLoading={isLoading}>
            <article className="flex flex-col gap-4 rounded-2xl border border-border p-5">
              <div className="flex items-center gap-3">
                <div className="size-10 shrink-0 rounded-full bg-accent" />
                <div>
                  <p className="font-semibold">{post.author}</p>
                  <p className="text-sm text-muted">{post.time}</p>
                </div>
              </div>
              <p>{post.text}</p>
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
              <div className="flex gap-6 text-muted">
                <Heart className="size-5" />
                <MessageCircle className="size-5" />
                <Share2 className="size-5" />
              </div>
            </article>
          </Ghost>
        ))}
      </section>

      <aside className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Who to follow</h2>
        {members.slice(0, 3).map((member, index) => (
          <Ghost
            key={member.name}
            name={`feed-follow-${index}`}
            isLoading={isLoading}
          >
            <MemberCard {...member} />
          </Ghost>
        ))}
      </aside>
    </div>
  );
}
