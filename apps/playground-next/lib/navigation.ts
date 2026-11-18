// What the shared screens and components need from the router, on top of
// `next/link` and `next/navigation`. The Vite playground has its own
// version of this file; everything else in `components`, `lib` and
// `screens` is the same file in both playgrounds.

import { useRouter, useSearchParams } from "next/navigation";

import logoImage from "../../../assets/logo.svg";

export { default as Link } from "next/link";
export { usePathname } from "next/navigation";

// The repo logo.
export const logo: string = logoImage.src;

// A query parameter of the current URL, e.g. "3" for `?item=3`. Needs a
// <Suspense> around it (see the Next.js docs of `useSearchParams`).
export function useSearchParam(name: string): string | null {
  return useSearchParams().get(name);
}

// Changes the page in the app, e.g. after a form or to open a dialog by
// its URL. `scroll: false` keeps the scroll position (for `?item=3`).
export function useNavigate(): (
  href: string,
  options?: { replace?: boolean; scroll?: boolean },
) => void {
  const router = useRouter();
  return (href, { replace = false, scroll = true } = {}) => {
    if (replace) router.replace(href, { scroll });
    else router.push(href, { scroll });
  };
}
