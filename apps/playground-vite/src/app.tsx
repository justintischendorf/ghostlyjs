// The app shell: provider, nav, the current page and the footer. Matches
// the root layout of the Next.js playground.

import Footer from "@/components/footer";
import { LoadingProvider } from "@/components/loading";
import Nav from "@/components/nav";
import { isSignedIn } from "@/lib/session";
import Account from "@/screens/account";
import Admin from "@/screens/admin";
import Async from "@/screens/async";
import Cards from "@/screens/cards";
import Charts from "@/screens/charts";
import Collection from "@/screens/collection";
import Collections from "@/screens/collections";
import EdgeCases from "@/screens/edge-cases";
import Overview from "@/screens/overview";
import SignIn from "@/screens/signin";
import { GhostlyProvider } from "ghostlyjs";
import { useEffect, type ComponentType } from "react";

import data from "../ghostly.json";
import { navigate, usePathname } from "./router";

const pages: Record<string, ComponentType> = {
  "/": Overview,
  "/cards": Cards,
  "/collections": Collections,
  "/charts": Charts,
  "/account": Account,
  "/signin": SignIn,
  "/admin": Admin,
  "/async": Async,
  "/edge-cases": EdgeCases,
};

export default function App() {
  const pathname = usePathname();
  const collectionId = /^\/collections\/([^/]+)$/.exec(pathname)?.[1];
  const Page = pages[pathname];

  return (
    <GhostlyProvider data={data}>
      <LoadingProvider>
        <div id="top" />
        <Nav />
        {/* Full width up to 2xl with more padding per breakpoint, so the
            content is narrower or wider at every breakpoint. */}
        <main className="mx-auto flex w-full max-w-384 flex-1 flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10 md:gap-12 md:px-8 lg:py-14 xl:px-10 2xl:px-12">
          {pathname === "/account" && !isSignedIn(document.cookie) ? (
            <Redirect to="/signin" />
          ) : collectionId ? (
            <Collection id={collectionId} />
          ) : Page ? (
            <Page />
          ) : (
            <h1 className="text-3xl font-bold">Page not found</h1>
          )}
        </main>
        <Footer />
      </LoadingProvider>
    </GhostlyProvider>
  );
}

// The account page without a session; the Next.js playground redirects in
// proxy.ts.
function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to]);
  return null;
}
