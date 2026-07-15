import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
const desktopDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(desktopDirectory, "..");
const appBinary = process.argv[2];

if (!appBinary || !path.isAbsolute(appBinary)) throw new Error("An absolute Descriptor app binary path is required.");

loadEnvConfig(rootDirectory, false, { info() {}, error() {} });
const appEnvironment = {
  PATH: process.env.PATH || "/usr/bin:/bin:/usr/sbin:/sbin",
  HOME: process.env.HOME || "",
  TMPDIR: process.env.TMPDIR || "/tmp",
  LANG: process.env.LANG || "en_US.UTF-8",
  LC_ALL: process.env.LC_ALL || "",
  TZ: process.env.TZ || "",
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
  OLLAMA_TRANSLATION_MODEL: process.env.OLLAMA_TRANSLATION_MODEL || "qwen3:8b-q4_K_M",
  MAX_UPLOAD_BYTES: process.env.MAX_UPLOAD_BYTES || String(20 * 1024 ** 3)
};
if (process.env.WHISPER_CPP_MODEL) appEnvironment.WHISPER_CPP_MODEL = process.env.WHISPER_CPP_MODEL;
const child = spawn(appBinary, [], { cwd: rootDirectory, env: appEnvironment, detached: true, stdio: "ignore" });
child.unref();
