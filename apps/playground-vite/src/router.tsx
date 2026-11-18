// A tiny router, enough for a handful of pages. React Router 8 needs
// React 19, and this playground runs on React 18.

import {
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type MouseEvent,
} from "react";

// The browser fires `popstate` on back/forward; `navigate` fires it too.
function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

// The current path, e.g. "/feed". Re-renders when it changes.
export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

// A query parameter of the current URL, e.g. "3" for `?item=3`.
export function useSearchParam(name: string): string | null {
  return useSyncExternalStore(subscribe, () =>
    new URLSearchParams(window.location.search).get(name),
  );
}

export function navigate(
  href: string,
  { replace = false, scroll = true } = {},
): void {
  if (replace) window.history.replaceState(null, "", href);
  else window.history.pushState(null, "", href);
  // `pushState` doesn't fire `popstate` on its own.
  window.dispatchEvent(new PopStateEvent("popstate"));
  if (scroll) window.scrollTo(0, 0);
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

// A normal <a>, but a plain click changes the page without a reload.
export function Link({ href, onClick, ...props }: LinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    // Leave new tabs (Cmd/Ctrl click), other buttons and other sites to the
    // browser.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !href.startsWith("/")
    ) {
      return;
    }
    event.preventDefault();
    navigate(href);
  }

  return <a {...props} href={href} onClick={handleClick} />;
}
