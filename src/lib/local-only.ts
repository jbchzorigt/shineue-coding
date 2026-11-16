const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** True only for a URL (http or postgres) whose host is this machine. */
export function isLocalUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return LOOPBACK.has(new URL(url).hostname);
  } catch {
    return false;
  }
}
