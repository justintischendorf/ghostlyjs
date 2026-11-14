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
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10 sm:px-8 sm:py-14">
          <Page />
        </main>
      </LoadingProvider>
    </GhostlyProvider>
  );
}

function NotFound() {
  return <h1 className="text-3xl font-bold">Page not found</h1>;
}
