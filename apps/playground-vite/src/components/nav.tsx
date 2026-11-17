"use client";

import { me, notifications } from "@/lib/data";
import { Link, logo, useNavigate, usePathname } from "@/lib/navigation";
import { signOut } from "@/lib/session";
import { Ghost } from "ghostlyjs";
import { Bell, ChevronDown, LogOut, Menu as MenuIcon } from "lucide-react";
import { useState } from "react";

import Avatar from "./avatar";
import { LoadingToggle, useLoading } from "./loading";
import ThemeToggle from "./theme-toggle";
import { Drawer } from "./ui/drawer";
import { Menu, MenuItem, MenuLink, MenuSeparator } from "./ui/menu";
import { Popover } from "./ui/popover";

const links = [
  { href: "/", label: "Overview" },
  { href: "/cards", label: "Cards" },
  { href: "/collections", label: "Collections" },
  { href: "/charts", label: "Charts" },
];

// Behind "More": pages for the playground itself.
const moreLinks = [
  { href: "/async", label: "Async" },
  { href: "/edge-cases", label: "Edge cases" },
];

// Each breakpoint and the classes that show its name only in its range.
// CSS instead of JavaScript, so the server renders the same HTML.
const breakpoints = [
  { name: "base", className: "sm:hidden" },
  { name: "sm", className: "hidden sm:inline md:hidden" },
  { name: "md", className: "hidden md:inline lg:hidden" },
  { name: "lg", className: "hidden lg:inline xl:hidden" },
  { name: "xl", className: "hidden xl:inline 2xl:hidden" },
  { name: "2xl", className: "hidden 2xl:inline" },
];

export default function Nav() {
  const pathname = usePathname();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  function logOut() {
    signOut();
    navigate("/signin");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-384 items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6 md:px-8 xl:px-10 2xl:px-12">
        {/* Below lg the links move into a drawer */}
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setDrawer(true)}
          className="rounded-full p-2 hover:bg-card lg:hidden"
        >
          <MenuIcon className="size-5" />
        </button>
        <Link href="/" className="flex items-center gap-2 font-bold">
          <img src={logo} alt="" className="size-6" />
          <span className="hidden sm:inline">Ghostly playground</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-1.5 text-sm ${
                isActive(link.href)
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Menu
            label="More pages"
            align="start"
            triggerClassName="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted hover:text-foreground"
            trigger={
              <>
                More <ChevronDown className="size-4" />
              </>
            }
          >
            {moreLinks.map((link) => (
              <MenuLink key={link.href} href={link.href}>
                {link.label}
              </MenuLink>
            ))}
          </Menu>
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* The current breakpoint, to know which skeleton is measured */}
          <span
            title="Current breakpoint"
            className="rounded-full bg-card px-2.5 py-1 font-mono text-xs text-muted"
          >
            {breakpoints.map((breakpoint) => (
              <span key={breakpoint.name} className={breakpoint.className}>
                {breakpoint.name}
              </span>
            ))}
          </span>
          {/* /async loads for real, so the toggle would do nothing there */}
          {pathname !== "/async" && <LoadingToggle />}
          <ThemeToggle />
          <Inbox />
          <Menu
            label="Account menu"
            triggerClassName="flex items-center gap-1 rounded-full p-0.5 hover:bg-card"
            trigger={<Avatar member={me} size="sm" />}
          >
            <div className="flex flex-col px-3 py-2">
              <span className="text-sm font-semibold">{me.name}</span>
              <span className="text-xs text-muted">ada@example.com</span>
            </div>
            <MenuSeparator />
            <MenuLink href="/account">Account settings</MenuLink>
            <MenuLink href="/collections">Collections</MenuLink>
            <MenuSeparator />
            {/* `ghostly measure` never taps this: it would end the session */}
            <MenuItem onSelect={logOut} danger>
              <LogOut className="size-4" /> Log out
            </MenuItem>
          </Menu>
        </div>
      </div>

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        side="left"
        title="Ghostly playground"
      >
        <nav className="flex flex-col gap-1">
          {[...links, ...moreLinks].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setDrawer(false)}
              className={`rounded-xl px-3 py-2 ${
                isActive(link.href) ? "bg-card font-semibold" : "text-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </Drawer>
    </header>
  );
}

// The bell with the notifications. They load with the page, so the list
// inside the popover is a <Ghost> that only shows after a tap.
function Inbox() {
  const { isLoading } = useLoading();
  const unread = notifications.filter((item) => item.unread).length;

  return (
    <Popover
      label="Notifications"
      triggerClassName="relative rounded-full border border-border p-2 hover:bg-card"
      // Fixed to the window on phones, below the bell from sm on.
      panelClassName="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:w-96"
      trigger={
        <>
          <Bell className="size-4" />
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-danger text-[0.6rem] font-bold text-white">
            {unread}
          </span>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Notifications</h2>
          <button type="button" className="text-xs text-accent">
            Mark all as read
          </button>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          <Ghost name="nav-notifications" isLoading={isLoading} count>
            {notifications.map((item) => (
              <li key={item.id} className="flex gap-3 py-3">
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${
                    item.unread ? "bg-accent" : "bg-transparent"
                  }`}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <span className="shrink-0 text-xs text-muted">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-sm text-muted">{item.text}</p>
                </div>
              </li>
            ))}
          </Ghost>
        </ul>
      </div>
    </Popover>
  );
}
