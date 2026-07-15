/* eslint-disable @typescript-eslint/no-require-imports -- Electron loads this entry as CommonJS. */
const { app, BrowserWindow, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const { appendFileSync, constants, accessSync, mkdirSync } = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { PRODUCT_NAME, LEGACY_USER_DATA_NAME } = require("./product-identity.cjs");

let mainWindow = null;
let serverProcess = null;
let serverOrigin = null;
let quitting = false;

// Keep the established data boundary so the product rename cannot orphan
// projects, LUTs, or completed exports.
app.setPath("userData", path.join(app.getPath("appData"), LEGACY_USER_DATA_NAME));
app.setName(PRODUCT_NAME);

function writeLog(message) {
  try {
    const logsDirectory = app.getPath("logs");
    mkdirSync(logsDirectory, { recursive: true });
    appendFileSync(path.join(logsDirectory, "descripter-desktop.log"), `${new Date().toISOString()} ${message}\n`);
  } catch {
    // Desktop logging must never prevent the editor from launching.
  }
}

function reserveLoopbackPort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function waitForServer(origin, timeoutMs = 45_000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      const request = http.get(origin, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) return resolve();
        if (Date.now() - startedAt >= timeoutMs) return reject(new Error(`Server returned ${response.statusCode || "no status"}`));
        setTimeout(poll, 180);
      });
      request.setTimeout(1_500, () => request.destroy());
      request.once("error", () => {
        if (Date.now() - startedAt >= timeoutMs) reject(new Error("The private editor server did not become ready."));
        else setTimeout(poll, 180);
      });
    };
    poll();
  });
}

function stopServer() {
  if (!serverProcess?.pid) return;
  const pid = serverProcess.pid;
  serverProcess = null;
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try { process.kill(pid, "SIGTERM"); } catch { /* already stopped */ }
  }
  writeLog(`Stopped private editor server ${pid}`);
}

async function startServer() {
  const serverDirectory = app.isPackaged
    ? path.join(process.resourcesPath, "app-server")
    : path.join(__dirname, "..", ".next", "standalone");
  const serverEntry = path.join(serverDirectory, "server.js");
  const runtimeModulesDirectory = path.join(serverDirectory, "runtime_modules");
  const runtimeToolsDirectory = path.join(serverDirectory, "runtime_tools");
  const ffmpegPath = path.join(runtimeModulesDirectory, "ffmpeg-static", "ffmpeg");
  const ffprobePath = path.join(runtimeModulesDirectory, "@ffprobe-installer", `darwin-${process.arch}`, "ffprobe");
  const whisperBinaryPath = path.join(runtimeToolsDirectory, "whisper-cli");
  accessSync(ffmpegPath, constants.X_OK);
  accessSync(ffprobePath, constants.X_OK);
  accessSync(whisperBinaryPath, constants.X_OK);
  const port = await reserveLoopbackPort();
  const dataDirectory = path.join(app.getPath("userData"), "data");
  mkdirSync(dataDirectory, { recursive: true });
  const childEnvironment = {
    PATH: process.env.PATH || "/usr/bin:/bin:/usr/sbin:/sbin",
    HOME: process.env.HOME || app.getPath("home"),
    TMPDIR: process.env.TMPDIR || app.getPath("temp"),
    LANG: process.env.LANG || "en_US.UTF-8",
    LC_ALL: process.env.LC_ALL || "",
    TZ: process.env.TZ || "",
    ELECTRON_RUN_AS_NODE: "1",
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    HOSTNAME: "127.0.0.1",
    PORT: String(port),
    NODE_PATH: runtimeModulesDirectory,
    FFMPEG_PATH: ffmpegPath,
    FFPROBE_PATH: ffprobePath,
    DESCRIPTER_DATA_DIR: dataDirectory,
    WHISPER_CPP_BINARY: whisperBinaryPath,
    WHISPER_CPP_MODEL: process.env.WHISPER_CPP_MODEL || path.join(app.getPath("userData"), "models", "ggml-large-v3.bin"),
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    OLLAMA_TRANSLATION_MODEL: process.env.OLLAMA_TRANSLATION_MODEL || "qwen3:8b-q4_K_M",
    MAX_UPLOAD_BYTES: process.env.MAX_UPLOAD_BYTES || String(20 * 1024 ** 3)
  };

  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: serverDirectory,
    env: childEnvironment,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  serverProcess.stdout.on("data", (chunk) => writeLog(`[server] ${String(chunk).trim()}`));
  serverProcess.stderr.on("data", (chunk) => writeLog(`[server:error] ${String(chunk).trim()}`));
  serverProcess.once("error", (error) => writeLog(`Private server failed to start: ${error.message}`));
  serverProcess.once("exit", (code, signal) => {
    writeLog(`Private editor server exited code=${code ?? "none"} signal=${signal ?? "none"}`);
    serverProcess = null;
    if (!quitting && mainWindow) {
      dialog.showErrorBox(`${PRODUCT_NAME} stopped`, `The private editor service stopped unexpectedly. Reopen ${PRODUCT_NAME} to continue.`);
      app.quit();
    }
  });

  serverOrigin = `http://127.0.0.1:${port}`;
  writeLog(`Starting private editor server on loopback port ${port}; local speech runtime ready`);
  await waitForServer(serverOrigin);
  return serverOrigin;
}

function createWindow(origin) {
  mainWindow = new BrowserWindow({
    width: 1512,
    height: 982,
    minWidth: 1120,
    minHeight: 760,
    show: false,
    backgroundColor: "#f3f4f6",
    title: PRODUCT_NAME,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: true
    }
  });

  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    let isInternal = false;
    try { isInternal = new URL(url).origin === origin; } catch { /* deny malformed URLs */ }
    if (!isInternal) void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    let isInternal = false;
    try { isInternal = new URL(url).origin === origin; } catch { /* deny malformed URLs */ }
    if (isInternal) return;
    event.preventDefault();
    void shell.openExternal(url);
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
  mainWindow.on("closed", () => { mainWindow = null; });
  void mainWindow.loadURL(origin);
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    try {
      const origin = await startServer();
      createWindow(origin);
    } catch (error) {
      writeLog(`Desktop startup failed: ${error instanceof Error ? error.stack || error.message : String(error)}`);
      dialog.showErrorBox(`${PRODUCT_NAME} could not open`, `The private editor service could not start. Rebuild the app or check the ${PRODUCT_NAME} desktop log.`);
      app.quit();
    }
  });

  app.on("activate", () => {
    if (!mainWindow && serverOrigin) createWindow(serverOrigin);
  });

  app.on("before-quit", () => {
    quitting = true;
    stopServer();
  });

  app.on("window-all-closed", () => app.quit());
}
