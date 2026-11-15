import logo from "../../../../assets/logo.svg";
import { Link, usePathname } from "../router";
import { LoadingToggle } from "./loading";
import ThemeToggle from "./theme-toggle";

const links = [
  { href: "/", label: "Overview" },
  { href: "/feed", label: "Feed" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/form", label: "Form" },
  { href: "/layouts", label: "Layouts" },
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

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-384 flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6 md:px-8 xl:px-10 2xl:px-12">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <img src={logo} alt="" className="size-6" />
          Ghostly
        </Link>
        {/* Below lg the links get their own row and scroll sideways */}
        <nav className="order-last flex w-full gap-1 overflow-x-auto lg:order-none lg:w-auto">
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
        <div className="ml-auto flex items-center gap-2">
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
          <ThemeToggle />
          {/* /async loads for real, so the toggle would do nothing there */}
          {pathname !== "/async" && <LoadingToggle />}
        </div>
      </div>
    </header>
  );
}
