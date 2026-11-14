"use client";

import { Ghost } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LoadingToggle } from "./loading";

const links = [
  { href: "/", label: "Overview" },
  { href: "/feed", label: "Feed" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/form", label: "Form" },
  { href: "/layouts", label: "Layouts" },
  { href: "/async", label: "Async" },
  { href: "/edge-cases", label: "Edge cases" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Ghost className="size-5" />
          Ghostly
        </Link>
        <nav className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                pathname === link.href
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {/* /async loads for real, so the toggle would do nothing there */}
        <div className="ml-auto">
          {pathname !== "/async" && <LoadingToggle />}
        </div>
      </div>
    </header>
  );
}
