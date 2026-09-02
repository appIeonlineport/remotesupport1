import { app, BrowserWindow, desktopCapturer, ipcMain, session, systemPreferences } from "electron";
import { join } from "node:path";
import { NativeController } from "./native-control.js";

let controlEnabled = false;
const nativeController = new NativeController();

ipcMain.handle("session:set-control", (_event, enabled: boolean) => {
  if (!enabled) {
    controlEnabled = false;
    nativeController.stop();
    return { enabled: false };
  }
  if (process.platform === "darwin" && !systemPreferences.isTrustedAccessibilityClient(true))
    return { enabled: false, reason: "Allow Accessibility access in macOS System Settings, then try again" };
  const result = nativeController.start();
  controlEnabled = result.ready;
  return { enabled: controlEnabled, reason: result.reason };
});

ipcMain.handle("control:input", (_event, input: unknown) => {
  if (!controlEnabled) return { accepted: false, injected: false };
  return nativeController.send(input);
});

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: "#07111f",
    title: "Remote Support",
    webPreferences: {
      preload: join(import.meta.dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    const sources = await desktopCapturer.getSources({ types: ["screen"] });
    callback({ video: sources[0], audio: "loopback" });
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) await win.loadURL(devUrl);
  else await win.loadFile(join(import.meta.dirname, "../dist-renderer/index.html"));
}

app.whenReady().then(createWindow);
app.on("before-quit", () => nativeController.stop());
app.on("window-all-closed", () => { nativeController.stop(); if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) void createWindow(); });
