import { upload } from "@vercel/blob/client";
import { audioContentType, blobPathname, fitWithin } from "@/lib/blob-upload";
import { detectMedia, TYPE_MESSAGE, type MediaKind } from "@/lib/media";

export type MediaStore = "local" | "blob";

/**
 * Uploads news media: to /api/uploads (local disk, sharp) or, on Vercel,
 * straight from the browser to Vercel Blob — functions there take at most
 * 4.5MB, so the file must not pass through one.
 */
export async function uploadMedia(
  file: File,
  kind: MediaKind,
  store: MediaStore,
  onProgress: (percent: number) => void
): Promise<string> {
  if (store === "local") return uploadFile(file, kind, onProgress);

  const media = detectMedia(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  if (!media || media.kind !== kind) throw new Error(TYPE_MESSAGE[kind]);

  let body: Blob = file;
  let ext: string;
  let contentType: string;
  if (media.kind === "audio") {
    ext = media.format;
    contentType = audioContentType(media.format);
  } else if (media.format === "gif") {
    ext = "gif";
    contentType = "image/gif";
  } else {
    const out = await reencodeImage(file);
    body = out.blob;
    ext = out.ext;
    contentType = out.blob.type;
  }

  const result = await upload(blobPathname(ext), body, {
    access: "public",
    handleUploadUrl: "/api/uploads/token",
    clientPayload: JSON.stringify({ kind }),
    contentType,
    multipart: body.size > 4 * 1024 * 1024,
    onUploadProgress: ({ percentage }) => onProgress(Math.round(percentage)),
  });
  return result.url;
}

/** The browser's stand-in for sharp: orientation applied, ≤1920px, re-encoded — no EXIF survives a canvas. */
async function reencodeImage(file: File): Promise<{ blob: Blob; ext: "webp" | "jpg" }> {
  const unreadable = new Error("Зургийг уншиж чадсангүй.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw unreadable;
  });
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  const webp = await encode("image/webp");
  if (webp?.type === "image/webp") return { blob: webp, ext: "webp" };
  // Browsers that cannot encode WebP fall back to JPEG.
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw unreadable;
  return { blob: jpeg, ext: "jpg" };
}

/** POSTs one file to /api/uploads and resolves to its /media URL. XHR, for upload progress. */
export function uploadFile(file: File, kind: MediaKind, onProgress: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      const data = xhr.response as { url?: string; message?: string } | null;
      if (xhr.status === 200 && data?.url) resolve(data.url);
      else reject(new Error(data?.message ?? "Файл оруулахад алдаа гарлаа."));
    };
    xhr.onerror = () => reject(new Error("Сервертэй холбогдож чадсангүй."));
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    xhr.send(form);
  });
}

export const ACCEPT: Record<MediaKind, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  audio: "audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,.mp3,.m4a,.wav,.ogg",
};
