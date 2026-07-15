import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseCubeLut } from "@/lib/editor/cube-lut";
import { DATA_ROOT } from "@/lib/server/data-root";

const LUT_DIR = path.join(DATA_ROOT, "luts");
export const MAX_LUT_BYTES = 5 * 1024 * 1024;

export type LutManifest = {
  id: string;
  name: string;
  title?: string;
  size: number;
  gridSize: number;
  sha256: string;
  lutPath: string;
  importedAt: string;
};

export async function storeLut(bytes: Uint8Array, originalName: string) {
  if (!bytes.byteLength || bytes.byteLength > MAX_LUT_BYTES) throw new Error("LUT_FILE_TOO_LARGE");
  const name = path.basename(originalName).slice(0, 180);
  if (!name.toLowerCase().endsWith(".cube")) throw new Error("LUT_EXTENSION_REQUIRED");
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const parsed = parseCubeLut(text);
  const id = randomUUID();
  const lutPath = path.join(LUT_DIR, `${id}.cube`);
  const tempPath = `${lutPath}.tmp`;
  const manifest: LutManifest = { id, name: name.replace(/\.cube$/i, ""), title: parsed.title, size: bytes.byteLength, gridSize: parsed.size, sha256: createHash("sha256").update(bytes).digest("hex"), lutPath, importedAt: new Date().toISOString() };
  await mkdir(LUT_DIR, { recursive: true });
  try {
    await writeFile(tempPath, bytes, { flag: "wx", mode: 0o600 });
    await rename(tempPath, lutPath);
    await chmod(lutPath, 0o400);
    await writeFile(path.join(LUT_DIR, `${id}.json`), JSON.stringify(manifest), { flag: "wx", mode: 0o600 });
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    await unlink(lutPath).catch(() => undefined);
    throw error;
  }
  return { manifest, parsed };
}

export async function getLut(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("INVALID_LUT_ID");
  const manifest = JSON.parse(await readFile(path.join(LUT_DIR, `${id}.json`), "utf8")) as LutManifest;
  const text = await readFile(manifest.lutPath, "utf8");
  return { manifest, parsed: parseCubeLut(text) };
}
