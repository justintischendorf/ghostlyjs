// A pretend login: the session is a cookie the browser sets itself. The
// account page needs it; `ghostly measure --cookie session=playground`
// measures it like a real login session. Same file in both playgrounds.

export const SESSION_COOKIE = "session";

export function signIn(): void {
  document.cookie = `${SESSION_COOKIE}=playground; path=/; max-age=86400`;
}

export function signOut(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
}

export function isSignedIn(cookies: string): boolean {
  return cookies
    .split(";")
    .some(
      (cookie) =>
        cookie.trim().startsWith(`${SESSION_COOKIE}=`) &&
        cookie.trim().length > SESSION_COOKIE.length + 1,
    );
}
