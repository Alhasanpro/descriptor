import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
const desktopDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(desktopDirectory, "..");
loadEnvConfig(rootDirectory, false, { info() {}, error() {} });
const target = process.argv[2] === "dmg" ? "dmg" : "dir";
const outputDirectory = path.resolve(
  process.env.DESCRIPTOR_DESKTOP_OUTPUT
    || process.env.DESCRIPTER_DESKTOP_OUTPUT
    || path.join(rootDirectory, "dist")
);
const requestedArch = process.env.DESCRIPTOR_DESKTOP_ARCH || process.arch;
if (!["arm64", "x64"].includes(requestedArch)) {
  throw new Error("DESCRIPTOR_DESKTOP_ARCH must be arm64 or x64.");
}
if (requestedArch !== process.arch) {
  throw new Error(`Cross-architecture packaging is not supported because FFmpeg, FFprobe, and whisper-cli are native executables. Run npm ci and package on a ${requestedArch} Mac.`);
}

await mkdir(outputDirectory, { recursive: true });
const builder = path.join(rootDirectory, "node_modules", ".bin", "electron-builder");
const child = spawn(builder, [
  "--projectDir", desktopDirectory,
  "--mac", target,
  `--${requestedArch}`,
  `--config.directories.output=${outputDirectory}`
], { cwd: rootDirectory, stdio: "inherit" });

const exitCode = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code) => resolve(code ?? 1));
});
if (exitCode !== 0) process.exit(exitCode);
