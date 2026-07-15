import "server-only";
import path from "node:path";

const configuredRoot = process.env.DESCRIPTER_DATA_DIR?.trim();

if (configuredRoot && !path.isAbsolute(configuredRoot)) {
  throw new Error("DESCRIPTER_DATA_DIR must be an absolute path.");
}

export const DATA_ROOT = configuredRoot
  || path.join(/* turbopackIgnore: true */ process.cwd(), "data");
