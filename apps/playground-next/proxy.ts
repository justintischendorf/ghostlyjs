// The account page needs the pretend login (see lib/session.ts). Without
// the cookie, it sends you to /signin, like a real login would.

import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "./lib/session";

export function proxy(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/account",
};
