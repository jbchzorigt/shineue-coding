/*
 * Vercel Blob uploads of news media (production). Pure helpers shared by
 * the token route and the browser; the local mode keeps /api/uploads.
 */
import { MAX_AUDIO_BYTES, MAX_IMAGE_BYTES, type AudioFormat, type MediaKind } from "@/lib/media";

/** Scales (width, height) down so the long side is at most `max`. */
export function fitWithin(width: number, height: number, max = 1920): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** A fresh news/ path (Blob also appends its own random suffix). Works in the browser and Node. */
export function blobPathname(ext: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `news/${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")}.${ext}`;
}

export const BLOB_PATH_RE = /^news\/[a-z0-9]{24}\.(webp|jpg|gif|mp3|m4a|wav|ogg)$/;

export const IMAGE_CONTENT_TYPES = ["image/webp", "image/jpeg", "image/gif"];
export const AUDIO_CONTENT_TYPES = ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/ogg"];

/** What a client token may upload, per kind. */
export function uploadTokenOptions(kind: MediaKind) {
  return kind === "image"
    ? { allowedContentTypes: IMAGE_CONTENT_TYPES, maximumSizeInBytes: MAX_IMAGE_BYTES, addRandomSuffix: true }
    : { allowedContentTypes: AUDIO_CONTENT_TYPES, maximumSizeInBytes: MAX_AUDIO_BYTES, addRandomSuffix: true };
}

const AUDIO_TYPE: Record<AudioFormat, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

export function audioContentType(format: AudioFormat): string {
  return AUDIO_TYPE[format];
}

/** The upload() clientPayload is {"kind": "image" | "audio"}; anything else → null. */
export function parseUploadPayload(payload: string | null): MediaKind | null {
  try {
    const kind = (JSON.parse(payload ?? "") as { kind?: unknown } | null)?.kind;
    return kind === "image" || kind === "audio" ? kind : null;
  } catch {
    return null;
  }
}
