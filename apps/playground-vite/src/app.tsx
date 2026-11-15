// The app shell: provider, nav and the current page. Matches the root
// layout of the Next.js playground.

import { GhostlyProvider } from "ghostlyjs";
import type { ComponentType } from "react";

import data from "../ghostly.json";
import { LoadingProvider } from "./components/loading";
import Nav from "./components/nav";
import Async from "./pages/async";
import Dashboard from "./pages/dashboard";
import EdgeCases from "./pages/edge-cases";
import Feed from "./pages/feed";
import Form from "./pages/form";
import Home from "./pages/home";
import Layouts from "./pages/layouts";
import { usePathname } from "./router";

const pages: Record<string, ComponentType> = {
  "/": Home,
  "/feed": Feed,
  "/dashboard": Dashboard,
  "/form": Form,
  "/layouts": Layouts,
  "/async": Async,
  "/edge-cases": EdgeCases,
};

export default function App() {
  const pathname = usePathname();
  const Page = pages[pathname] ?? NotFound;

  return (
    <GhostlyProvider data={data}>
      <LoadingProvider>
        <Nav />
        {/* Full width up to 2xl with more padding per breakpoint, so the
            content is narrower or wider at every breakpoint. */}
        <main className="mx-auto flex w-full max-w-384 flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10 md:gap-12 md:px-8 lg:py-14 xl:px-10 2xl:px-12">
          <Page />
        </main>
      </LoadingProvider>
    </GhostlyProvider>
  );
}

function NotFound() {
  return <h1 className="text-3xl font-bold">Page not found</h1>;
}
