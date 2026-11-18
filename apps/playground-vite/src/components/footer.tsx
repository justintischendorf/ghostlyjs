"use client";

import { Link } from "@/lib/navigation";

// Links of every kind: pages, pages no other link points to (/signin and
// /admin are only linked here), another site, an e-mail address, a file download and
// a jump to the top of the same page. A client component, because
// lib/navigation has the router's hooks too.
export default function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-384 flex-col gap-6 px-4 py-8 text-sm text-muted sm:px-6 md:flex-row md:items-start md:justify-between md:px-8 xl:px-10 2xl:px-12">
        <div className="flex max-w-sm flex-col gap-2">
          <span className="font-semibold text-foreground">
            Ghostly playground
          </span>
          <p>
            Test pages for GhostlyJs: every kind of layout and tap that{" "}
            <code className="font-mono">ghostly measure</code> has to get right.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 sm:grid-cols-3">
          <Link href="/cards">Cards</Link>
          <Link href="/collections">Collections</Link>
          <Link href="/signin">Sign in</Link>
          <Link href="/admin">Admin</Link>
          <a
            href="https://github.com/justintischendorf/ghostlyjs"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a href="mailto:hello@example.com">Contact</a>
          <a href="/cover.svg" download>
            Press kit
          </a>
          <a href="#top">Back to top</a>
        </div>
      </div>
    </footer>
  );
}
