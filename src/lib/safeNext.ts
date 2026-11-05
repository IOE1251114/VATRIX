/**
 * The page to open after signing in, taken from `?next=`. Only paths on this site are allowed:
 * anything else falls back to "/", so a crafted link can't send people to another website.
 * Browsers treat "\" like "/" and silently drop tabs and newlines, so "/\evil.com" or "/\t/evil.com"
 * would become "//evil.com" — those characters are rejected too.
 */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return "/";
  return next;
}
