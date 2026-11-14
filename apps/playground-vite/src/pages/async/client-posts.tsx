import { Ghost } from "ghostlyjs";
import { RotateCw } from "lucide-react";
import { useEffect, useState } from "react";

import { posts } from "../../lib/data";

// The usual client pattern: start loading, show skeletons, show content.
export default function ClientPosts() {
  const [isLoading, setIsLoading] = useState(true);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [round]);

  function reload() {
    setIsLoading(true);
    setRound((value) => value + 1);
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post, index) => (
        <Ghost key={index} name={`async-client-${index}`} isLoading={isLoading}>
          <div className="flex flex-col gap-1 rounded-2xl border border-border p-5">
            <p className="font-semibold">{post.author}</p>
            <p className="text-muted">{post.text}</p>
          </div>
        </Ghost>
      ))}
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
