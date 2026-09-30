/*
 * Uploaded news media: what we accept, how files are named, and how
 * they are served. Pure functions — shared by the upload route, the
 * media route, the news action and the teacher form.
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

export type MediaKind = "image" | "audio";
export type ImageFormat = "jpeg" | "png" | "gif" | "webp";
export type AudioFormat = "mp3" | "m4a" | "wav" | "ogg";
export type DetectedMedia =
  | { kind: "image"; format: ImageFormat }
  | { kind: "audio"; format: AudioFormat };

export const TYPE_MESSAGE: Record<MediaKind, string> = {
  image: "Зөвхөн JPG, PNG, WebP, GIF зураг оруулна.",
  audio: "Зөвхөн MP3, M4A, WAV, OGG дуу оруулна.",
};

const LIMIT: Record<MediaKind, { bytes: number; message: string }> = {
  image: { bytes: MAX_IMAGE_BYTES, message: "Зураг 5MB-аас ихгүй байх ёстой." },
  audio: { bytes: MAX_AUDIO_BYTES, message: "Дуу 20MB-аас ихгүй байх ёстой." },
};

export function mediaLimitError(size: number, kind: MediaKind): string | null {
  return size > LIMIT[kind].bytes ? LIMIT[kind].message : null;
}

function ascii(b: Uint8Array, at: number, text: string): boolean {
  if (b.length < at + text.length) return false;
  for (let i = 0; i < text.length; i++) if (b[at + i] !== text.charCodeAt(i)) return false;
  return true;
}

/** Identifies a file by its first bytes; the name and the browser's MIME type are never trusted. */
export function detectMedia(b: Uint8Array): DetectedMedia | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { kind: "image", format: "jpeg" };
  if (ascii(b, 0, "\x89PNG\r\n\x1a\n")) return { kind: "image", format: "png" };
  if (ascii(b, 0, "GIF87a") || ascii(b, 0, "GIF89a")) return { kind: "image", format: "gif" };
  if (ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP")) return { kind: "image", format: "webp" };
  if (ascii(b, 0, "RIFF") && ascii(b, 8, "WAVE")) return { kind: "audio", format: "wav" };
  if (ascii(b, 0, "OggS")) return { kind: "audio", format: "ogg" };
  if (ascii(b, 4, "ftyp")) return { kind: "audio", format: "m4a" };
  if (ascii(b, 0, "ID3") || (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) {
    return { kind: "audio", format: "mp3" };
  }
  return null;
}

export const MEDIA_NAME_RE = /^[a-z0-9]{24}\.(webp|gif|mp3|m4a|wav|ogg)$/;

export function isMediaName(name: string): boolean {
  return MEDIA_NAME_RE.test(name);
}

const CONTENT_TYPE: Record<string, string> = {
  webp: "image/webp",
  gif: "image/gif",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

export function contentTypeFor(name: string): string {
  return CONTENT_TYPE[name.slice(name.lastIndexOf(".") + 1)] ?? "application/octet-stream";
}

/**
 * One `bytes=` range (what browsers send for audio seeking). null = no
 * Range header; "invalid" = answer 416.
 */
export function parseRange(header: string | null, size: number): { start: number; end: number } | "invalid" | null {
  if (header === null) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return "invalid";
  if (m[1] === "") {
    const suffix = Number(m[2]);
    if (suffix === 0 || size === 0) return "invalid";
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(m[1]);
  const end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (start >= size || start > end) return "invalid";
  return { start, end };
}

/** Web links, or files this server stored itself. */
export function isAllowedMediaUrl(url: string): boolean {
  if (url.startsWith("/media/")) return isMediaName(url.slice("/media/".length));
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
