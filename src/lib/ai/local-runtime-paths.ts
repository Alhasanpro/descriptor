import path from "node:path";

type RuntimePathOptions = {
  configured?: string;
  cwd: string;
  home: string;
  pathValue?: string;
  platform: NodeJS.Platform;
  xdgDataHome?: string;
};

function uniqueAbsolutePaths(values: Array<string | undefined>) {
  return [...new Set(values
    .map((value) => value?.trim())
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .filter((value) => path.isAbsolute(value)))];
}

export function whisperBinaryCandidates(options: RuntimePathOptions) {
  const binaryName = options.platform === "win32" ? "whisper-cli.exe" : "whisper-cli";
  const pathCandidates = (options.pathValue || "")
    .split(path.delimiter)
    .filter(Boolean)
    .map((directory) => path.join(directory, binaryName));

  return uniqueAbsolutePaths([
    options.configured,
    path.join(options.cwd, "runtime_tools", binaryName),
    path.join(options.cwd, "vendor", "whisper.cpp", "build", "bin", binaryName),
    ...pathCandidates,
    options.platform === "darwin" ? `/opt/homebrew/bin/${binaryName}` : undefined,
    options.platform === "darwin" ? `/usr/local/bin/${binaryName}` : undefined,
    path.join(options.home, ".local", "bin", binaryName)
  ]);
}

export function whisperModelCandidates(options: RuntimePathOptions) {
  const modelName = "ggml-large-v3.bin";
  const applicationData = options.platform === "darwin"
    ? path.join(options.home, "Library", "Application Support", "Descripter")
    : path.join(options.xdgDataHome || path.join(options.home, ".local", "share"), "descriptor");

  return uniqueAbsolutePaths([
    options.configured,
    path.join(options.cwd, "models", modelName),
    path.join(applicationData, "models", modelName),
    path.join(options.home, ".cache", "whisper", modelName)
  ]);
}
