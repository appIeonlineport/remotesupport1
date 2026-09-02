import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

type InputEvent =
  | { kind: "move" | "down" | "up"; x: number; y: number; button?: number }
  | { kind: "key"; key: string };

export class NativeController {
  private helper?: ChildProcessWithoutNullStreams;

  private helperPath(): string {
    const executable = process.platform === "win32" ? "remote-input-helper.exe" : "remote-input-helper";
    return process.env.VITE_DEV_SERVER_URL
      ? join(import.meta.dirname, "../native/bin", executable)
      : join(process.resourcesPath, "native", executable);
  }

  start(): { ready: boolean; reason?: string } {
    if (this.helper && !this.helper.killed) return { ready: true };
    if (!(["win32", "darwin"] as NodeJS.Platform[]).includes(process.platform))
      return { ready: false, reason: "Native control supports Windows and macOS only" };
    const path = this.helperPath();
    if (!existsSync(path)) return { ready: false, reason: "Native helper is not built for this computer" };
    this.helper = spawn(path, [], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    this.helper.once("exit", () => { this.helper = undefined; });
    return { ready: true };
  }

  stop(): void {
    if (this.helper && !this.helper.killed) {
      this.helper.stdin.end();
      this.helper.kill();
    }
    this.helper = undefined;
  }

  send(input: unknown): { accepted: boolean; injected: boolean } {
    if (!this.helper || this.helper.killed || !this.valid(input)) return { accepted: false, injected: false };
    this.helper.stdin.write(`${JSON.stringify(input)}\n`);
    return { accepted: true, injected: true };
  }

  private valid(input: unknown): input is InputEvent {
    if (!input || typeof input !== "object" || !("kind" in input)) return false;
    const item = input as Record<string, unknown>;
    if (item.kind === "key") return typeof item.key === "string" && item.key.length <= 32;
    return ["move", "down", "up"].includes(String(item.kind)) &&
      typeof item.x === "number" && item.x >= 0 && item.x <= 1 &&
      typeof item.y === "number" && item.y >= 0 && item.y <= 1 &&
      (item.button === undefined || [0, 1, 2].includes(Number(item.button)));
  }
}
