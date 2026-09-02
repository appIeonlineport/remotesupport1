import { mkdirSync, copyFileSync, chmodSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "native", "bin");
mkdirSync(out, { recursive: true });

if (process.platform === "win32") {
  const project = join(root, "native", "windows", "RemoteInput.csproj");
  const result = spawnSync("dotnet", ["publish", project, "-c", "Release", "-r", "win-x64", "--self-contained", "true", "-p:PublishSingleFile=true", "-o", out], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
  copyFileSync(join(out, "RemoteInput.exe"), join(out, "remote-input-helper.exe"));
} else if (process.platform === "darwin") {
  const source = join(root, "native", "macos", "RemoteInput.swift");
  const target = join(out, "remote-input-helper");
  const result = spawnSync("swiftc", [source, "-O", "-o", target], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
  chmodSync(target, 0o755);
} else {
  console.log("Native helper builds are available on Windows and macOS runners.");
}
