"use client";

import { activities } from "@/lib/data";
import { Ghost } from "ghostlyjs";
import { RotateCw } from "lucide-react";
import { useEffect, useState } from "react";

// The usual client pattern: start loading, show skeletons, show content.
// Like after a real request, there is no activity while loading. So the
// skeletons can't come from `.map`; `count` repeats the measured one.
export default function ClientPosts() {
  const [loaded, setLoaded] = useState<typeof activities>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaded(activities.slice(0, 3));
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
      {/* The skeletons are items of this grid: 1, 2, then 3 columns */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:gap-4">
        <Ghost name="async-client-posts" isLoading={isLoading} count={3}>
          {loaded.map((activity) => (
            <div
              key={activity.id}
              className="flex flex-col gap-1 rounded-2xl border border-border p-4 sm:p-5"
            >
              <p className="font-semibold">{activity.who}</p>
              <p className="text-muted">{activity.text}</p>
            </div>
          ))}
        </Ghost>
      </div>
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
