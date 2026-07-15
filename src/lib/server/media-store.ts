import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { DATA_ROOT } from "@/lib/server/data-root";

const ROOT = DATA_ROOT;
const SOURCE_DIR = path.join(ROOT, "sources");
export const WORK_DIR = path.join(ROOT, "work");
const TYPE_EXTENSIONS: Record<string, string> = { "video/mp4": ".mp4", "video/quicktime": ".mov", "video/x-m4v": ".m4v", "video/webm": ".webm" };

export type SourceManifest = { id: string; originalName: string; mimeType: string; size: number; sha256: string; sourcePath: string; importedAt: string };

export async function importSource(body: ReadableStream<Uint8Array>, mimeType: string, originalName: string, declaredSize: number) {
  const extension = TYPE_EXTENSIONS[mimeType];
  if (!extension) throw new Error("UNSUPPORTED_MEDIA");
  const maxBytes = Number(process.env.MAX_UPLOAD_BYTES || 20 * 1024 ** 3);
  if (!Number.isFinite(declaredSize) || declaredSize <= 0 || declaredSize > maxBytes) throw new Error("FILE_TOO_LARGE");
  await mkdir(SOURCE_DIR, { recursive: true });
  await mkdir(WORK_DIR, { recursive: true });
  const id = randomUUID();
  const sourcePath = path.join(SOURCE_DIR, `${id}${extension}`);
  const hash = createHash("sha256");
  let received = 0;
  const meter = new Transform({ transform(chunk, _encoding, callback) { received += chunk.length; if (received > maxBytes) return callback(new Error("FILE_TOO_LARGE")); hash.update(chunk); callback(null, chunk); } });
  await pipeline(Readable.fromWeb(body as never), meter, createWriteStream(sourcePath, { flags: "wx", mode: 0o600 }));
  if (received !== declaredSize) throw new Error("UPLOAD_INCOMPLETE");
  await chmod(sourcePath, 0o400);
  const manifest: SourceManifest = { id, originalName: path.basename(originalName).slice(0, 240), mimeType, size: received, sha256: hash.digest("hex"), sourcePath, importedAt: new Date().toISOString() };
  await writeFile(path.join(SOURCE_DIR, `${id}.json`), JSON.stringify(manifest), { mode: 0o600 });
  return manifest;
}

export async function getSource(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("INVALID_SOURCE_ID");
  return JSON.parse(await readFile(path.join(SOURCE_DIR, `${id}.json`), "utf8")) as SourceManifest;
}
