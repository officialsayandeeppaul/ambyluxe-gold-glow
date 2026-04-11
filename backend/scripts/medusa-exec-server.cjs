const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

/**
 * Run `medusa exec` with cwd `.medusa/server`, same as `medusa start` on Railway.
 * Exec from repo root makes loaders resolve TypeScript under `src/` (no ts-node after npm prune) → syntax errors.
 *
 * Usage (from backend/): node ./scripts/medusa-exec-server.cjs src/scripts/seed.js
 */
const root = process.cwd();
const serverDir = join(root, ".medusa", "server");
const rel = process.argv[2];
if (!rel) {
  console.error("usage: node ./scripts/medusa-exec-server.cjs <path relative to .medusa/server>");
  process.exit(1);
}
const abs = join(serverDir, rel);
if (!existsSync(abs)) {
  console.error(
    `[medusa-exec-server] missing ${abs} — run "npm run build" in backend first`,
  );
  process.exit(1);
}
const cli = join(root, "node_modules", "@medusajs", "cli", "cli.js");
const res = spawnSync(process.execPath, [cli, "exec", rel], {
  stdio: "inherit",
  cwd: serverDir,
  env: process.env,
  shell: false,
});
process.exit(res.status ?? 1);
