// A server component: the data really loads, the toggle in the nav has no
// effect here. Reload the page to see the skeletons again.

import { posts } from "@/lib/data";
import { Ghost } from "ghostlyjs";
import { connection } from "next/server";
import { Suspense } from "react";

import ClientPosts from "./client-posts";

export default function Async() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Async</h1>
        <p className="text-muted">
          Real loading instead of the toggle. Reload the page to see the
          skeletons again.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted">
          Server component streamed with Suspense (2 s)
        </h2>
        {/* The fallback and the content are two different Ghosts with the
            same name, so the skeleton always comes from ghostly.json. */}
        <Suspense
          fallback={
            <Ghost name="async-server" isLoading>
              {null}
            </Ghost>
          }
        >
          <SlowProfile />
        </Suspense>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted">
          Client component that loads in useEffect (1.5 s)
        </h2>
        <ClientPosts />
      </section>
    </>
  );
}

async function SlowProfile() {
  // Wait for a request, then pretend to fetch for 2 seconds.
  await connection();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const post = posts[0];

  return (
    <Ghost name="async-server" isLoading={false}>
      <div className="flex flex-col gap-4 rounded-2xl border border-border p-6">
        <div className="flex items-center gap-3">
          <div className="size-12 shrink-0 rounded-full bg-accent" />
          <div>
            <p className="font-semibold">{post.author}</p>
            <p className="text-sm text-muted">Loaded on the server</p>
          </div>
        </div>
        <p>{post.text}</p>
      </div>
    </Ghost>
  );
}
