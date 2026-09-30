import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { GET } from "@/app/media/[name]/route";

const NAME = "abcdefghijklmnopqrstuvwx.mp3";
const SIZE = 300_000; // above a read stream's 64KB high-water mark
let dir = "";

before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "media-route-"));
  await writeFile(path.join(dir, NAME), Buffer.from(Array.from({ length: SIZE }, (_, i) => i % 256)));
  process.env.UPLOAD_DIR = dir;
});
after(async () => {
  delete process.env.UPLOAD_DIR;
  await rm(dir, { recursive: true, force: true });
});

const call = (method: string, headers: Record<string, string> = {}, name = NAME) =>
  GET(new Request(`http://localhost/media/${name}`, { method, headers }), { params: Promise.resolve({ name }) });

test("HEAD answers with headers only and opens no file stream", async () => {
  const res = await call("HEAD");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-length"), String(SIZE));
  assert.equal(res.body, null);
});

test("GET serves the whole file or the requested range", async () => {
  const full = await call("GET");
  assert.equal(full.status, 200);
  assert.equal((await full.arrayBuffer()).byteLength, SIZE);

  const part = await call("GET", { Range: "bytes=256-265" });
  assert.equal(part.status, 206);
  assert.equal(part.headers.get("content-range"), `bytes 256-265/${SIZE}`);
  assert.deepEqual([...new Uint8Array(await part.arrayBuffer())], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

  assert.equal((await call("GET", { Range: `bytes=${SIZE}-` })).status, 416);
  assert.equal((await call("GET", {}, `${"missing".padEnd(24, "0")}.mp3`)).status, 404);
});
