import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

const result = spawnSync(
  "pnpm",
  ["--dir", "lib/db", "run", "push"],
  {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
  },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}