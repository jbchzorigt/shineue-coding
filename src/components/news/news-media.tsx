/* eslint-disable @next/next/no-img-element */

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("mn-MN", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** Extracts a YouTube video id from the common URL shapes, or null. */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]+)/);
      if (m) return m[2];
    }
  } catch {
    /* not a URL */
  }
  return null;
}

export function NewsImage({ url, title }: { url: string; title: string }) {
  return (
    <img
      src={url}
      alt={title}
      className="max-h-96 w-full rounded-lg border object-cover"
    />
  );
}

export function NewsVideo({ url }: { url: string }) {
  const yt = youtubeId(url);
  if (yt) {
    return (
      <div className="aspect-video overflow-hidden rounded-lg border">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${yt}`}
          title="Видео"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="size-full"
        />
      </div>
    );
  }
  return (
    <video src={url} controls className="w-full rounded-lg border" preload="metadata" />
  );
}

export function NewsAudio({ url }: { url: string }) {
  return <audio src={url} controls className="w-full" preload="metadata" />;
}
