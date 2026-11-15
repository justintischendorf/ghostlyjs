// Real loading: the toggle in the nav has no effect here. Reload the page to
// see the skeletons again.
//
// The Next.js playground streams a server component here. A Vite app has no
// server components, so a lazy component that arrives after 2 seconds takes
// its place: the same <Suspense> fallback, only loaded in the browser.

import { Ghost } from "ghostlyjs";
import { lazy, Suspense } from "react";

import { posts } from "../../lib/data";
import ClientPosts from "./client-posts";

// `lazy` loads once per page load, so the skeleton shows again after a
// reload, not after switching pages.
const SlowProfile = lazy(async () => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return { default: Profile };
});

export default function Async() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Async</h1>
        <p className="text-muted">
          Real loading instead of the toggle. Reload the page to see the
          skeletons again.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted">
          Lazy component in Suspense (2 s)
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

function Profile() {
  const post = posts[0];
  if (!post) return null;

  return (
    <Ghost name="async-server" isLoading={false}>
      {/* The text moves next to the author from md on */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border p-4 sm:p-6 md:flex-row md:items-center md:gap-8">
        <div className="flex shrink-0 items-center gap-3">
          <div className="size-12 shrink-0 rounded-full bg-accent" />
          <div>
            <p className="font-semibold">{post.author}</p>
            <p className="text-sm text-muted">Loaded in the browser</p>
          </div>
        </div>
        <p className="xl:text-lg">{post.text}</p>
      </div>
    </Ghost>
  );
}
