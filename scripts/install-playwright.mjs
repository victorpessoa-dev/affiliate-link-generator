import { spawnSync } from "node:child_process";

const shouldInstall = process.env.VERCEL === "1" || process.env.CI === "true" || process.env.INSTALL_PLAYWRIGHT === "1";

if (!shouldInstall) {
  process.exit(0);
}

process.env.PLAYWRIGHT_BROWSERS_PATH ||= "0";

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["playwright", "install", "chromium"], {
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}
