import { constants } from "node:fs";
import { access, chmod, cp, mkdir, rename, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
const desktopDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(desktopDirectory, "..");
const standaloneDirectory = path.join(rootDirectory, ".next", "standalone");
const serverEntry = path.join(standaloneDirectory, "server.js");

loadEnvConfig(rootDirectory, false, { info() {}, error() {} });

async function resolveWhisperBinary() {
  const binaryName = process.platform === "win32" ? "whisper-cli.exe" : "whisper-cli";
  const candidates = [
    process.env.WHISPER_CPP_BINARY,
    path.join(rootDirectory, "vendor", "whisper.cpp", "build", "bin", binaryName),
    ...(process.env.PATH || "").split(path.delimiter).filter(Boolean).map((directory) => path.join(directory, binaryName)),
    process.platform === "darwin" ? `/opt/homebrew/bin/${binaryName}` : undefined,
    process.platform === "darwin" ? `/usr/local/bin/${binaryName}` : undefined
  ].filter(Boolean);

  for (const candidate of candidates) {
    const absoluteCandidate = path.resolve(candidate);
    try {
      await access(absoluteCandidate, constants.X_OK);
      return absoluteCandidate;
    } catch {
      // Continue through explicit, vendored, PATH, and Homebrew candidates.
    }
  }
  throw new Error("whisper-cli was not found. Set WHISPER_CPP_BINARY or build vendor/whisper.cpp before packaging.");
}

const whisperSource = await resolveWhisperBinary();

await access(serverEntry);
await rm(path.join(standaloneDirectory, "public"), { recursive: true, force: true });
await rm(path.join(standaloneDirectory, ".next", "static"), { recursive: true, force: true });
await mkdir(path.join(standaloneDirectory, ".next"), { recursive: true });
await cp(path.join(rootDirectory, "public"), path.join(standaloneDirectory, "public"), { recursive: true });
await cp(path.join(rootDirectory, ".next", "static"), path.join(standaloneDirectory, ".next", "static"), { recursive: true });

const nodeModulesDirectory = path.join(standaloneDirectory, "node_modules");
const runtimeModulesDirectory = path.join(standaloneDirectory, "runtime_modules");
await rm(runtimeModulesDirectory, { recursive: true, force: true });
await rename(nodeModulesDirectory, runtimeModulesDirectory);

const executableCandidates = [
  path.join(runtimeModulesDirectory, "ffmpeg-static", "ffmpeg"),
  path.join(runtimeModulesDirectory, "@ffprobe-installer", `darwin-${process.arch}`, "ffprobe")
];

for (const executable of executableCandidates) {
  await access(executable);
  await chmod(executable, 0o755);
}

const runtimeToolsDirectory = path.join(standaloneDirectory, "runtime_tools");
const whisperTarget = path.join(runtimeToolsDirectory, "whisper-cli");
await rm(runtimeToolsDirectory, { recursive: true, force: true });
await mkdir(runtimeToolsDirectory, { recursive: true });
await cp(whisperSource, whisperTarget);
await chmod(whisperTarget, 0o755);

console.log(`Prepared desktop server at ${standaloneDirectory}`);
