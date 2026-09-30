import { createReadStream, type ReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { contentTypeFor, isMediaName, parseRange } from "@/lib/media";
import { uploadDir } from "@/lib/media-store";

const notFound = () => new Response("Not found", { status: 404 });

/** Serves uploaded news media; supports one Range so audio can seek. */
export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  // The strict name pattern is also what keeps "../" out of the path.
  if (!isMediaName(name)) return notFound();
  const file = path.join(/*turbopackIgnore: true*/ uploadDir(), name);
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return notFound();

  const size = info.size;
  const headers = new Headers({
    "Content-Type": contentTypeFor(name),
    "Accept-Ranges": "bytes",
    // Names are never reused, so a file never changes.
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  const range = parseRange(req.headers.get("range"), size);
  if (range === "invalid") {
    headers.set("Content-Range", `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  const { start, end } = range ?? { start: 0, end: size - 1 };
  headers.set("Content-Length", String(Math.max(0, end - start + 1)));
  if (range) headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  // HEAD also lands here, and Next never reads or cancels its body.
  const body = size === 0 || req.method === "HEAD" ? null : lazyFileStream(file, start, end);
  return new Response(body, { status: range ? 206 : 200, headers });
}

/**
 * Opens the file only when the body is first read (highWaterMark 0), so a
 * response that is never consumed — an aborted request — holds no file.
 */
function lazyFileStream(file: string, start: number, end: number): ReadableStream<Uint8Array> {
  let source: ReadStream | null = null;
  let chunks: AsyncIterator<Buffer> | null = null;
  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        if (!source) {
          source = createReadStream(file, { start, end });
          chunks = source[Symbol.asyncIterator]();
        }
        const { value, done } = await chunks!.next();
        if (done) controller.close();
        else controller.enqueue(new Uint8Array(value));
      },
      cancel() {
        source?.destroy();
      },
    },
    { highWaterMark: 0 }
  );
}
