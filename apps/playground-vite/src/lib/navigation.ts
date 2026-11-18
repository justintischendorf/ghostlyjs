// What the shared screens and components need from the router. The Next.js
// playground has its own version of this file on top of `next/link` and
// `next/navigation`; everything else in `components`, `lib` and `screens`
// is the same file in both playgrounds.

import logoUrl from "../../../../assets/logo.svg";
import { navigate } from "../router";

export { Link, usePathname, useSearchParam } from "../router";

// The repo logo.
export const logo: string = logoUrl;

// Changes the page in the app, e.g. after a form or to open a dialog by
// its URL. `scroll: false` keeps the scroll position (for `?item=3`).
export function useNavigate(): (
  href: string,
  options?: { replace?: boolean; scroll?: boolean },
) => void {
  return navigate;
}
