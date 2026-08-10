/** Origen público visto por el navegador (evita 0.0.0.0 con --hostname 0.0.0.0). */
export function publicOriginFromHeaders(request: {
  headers: { get(name: string): string | null };
  url: string;
}): string {
  const hostHeader =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  const fallbackHost = (() => {
    try {
      return new URL(request.url).host;
    } catch {
      return "localhost:3000";
    }
  })();

  let host = hostHeader || fallbackHost;

  if (
    !host ||
    host.startsWith("0.0.0.0") ||
    host.startsWith("[::]") ||
    host === "::"
  ) {
    host = "localhost:3000";
  }

  const proto =
    request.headers.get("x-forwarded-proto") ||
    (process.env.COOKIE_SECURE === "true" ? "https" : "http");

  return `${proto}://${host}`;
}

export function publicUrl(
  request: {
    headers: { get(name: string): string | null };
    url: string;
  },
  pathname: string,
  search = ""
): URL {
  const url = new URL(pathname, publicOriginFromHeaders(request));
  if (search) url.search = search.startsWith("?") ? search : `?${search}`;
  return url;
}
