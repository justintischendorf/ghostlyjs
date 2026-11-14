"use client";

import { posts } from "@/lib/data";
import { Ghost } from "ghostlyjs";
import { RotateCw } from "lucide-react";
import { useEffect, useState } from "react";

// The usual client pattern: start loading, show skeletons, show content.
// Like after a real request, there are no posts while loading. So the
// skeletons can't come from `posts.map`; `count` repeats the measured post.
export default function ClientPosts() {
  const [loaded, setLoaded] = useState<typeof posts>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaded(posts);
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [round]);

  function reload() {
    setLoaded([]);
    setIsLoading(true);
    setRound((value) => value + 1);
  }

  return (
    <div className="flex flex-col gap-3">
      <Ghost name="async-client-posts" isLoading={isLoading} count={3}>
        {loaded.map((post) => (
          <div
            key={post.author}
            className="flex flex-col gap-1 rounded-2xl border border-border p-5"
          >
            <p className="font-semibold">{post.author}</p>
            <p className="text-muted">{post.text}</p>
          </div>
        ))}
      </Ghost>
      <button
        type="button"
        onClick={reload}
        className="flex w-fit items-center gap-2 rounded-full border border-border px-4 py-2 text-sm"
      >
        <RotateCw className="size-4" /> Load again
      </button>
    </div>
  );
}
