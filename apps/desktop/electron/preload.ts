import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("remoteNative", {
  setControl: (enabled: boolean) => ipcRenderer.invoke("session:set-control", enabled),
  input: (event: unknown) => ipcRenderer.invoke("control:input", event)
});
