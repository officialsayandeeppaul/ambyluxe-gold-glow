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
  const sourceTs = join(root, rel.replace(/\.js$/i, ".ts"));
  const hasSource = existsSync(sourceTs);
  console.error(`[medusa-exec-server] missing compiled script:\n  ${abs}`);
  if (hasSource) {
    console.error(
      "The TypeScript source exists but was not emitted into .medusa/server (stale Docker image).\n" +
        "Fix: trigger a fresh Railway deploy from latest main (rebuild image), or in this container run:\n" +
        "  npm run build   # needs RAM; may take several minutes\n" +
        "Then retry this command.",
    );
  } else {
    console.error(
      'Run "npm run build" in backend locally, or deploy a commit that includes this script.',
    );
  }
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
