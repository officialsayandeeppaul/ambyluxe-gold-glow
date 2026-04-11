const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

/**
 * Run `medusa user` with cwd `.medusa/server` (same as production `medusa start`).
 * From repo root, loaders pull `src/subscribers/*.ts` without ts-node → SyntaxError.
 *
 * Usage (from backend/): node ./scripts/medusa-user-server.cjs admin@example.com 'password'
 * Or: npm run user:create:prod -- admin@example.com 'password'
 */
const email = process.argv[2];
const password = process.argv[3];
if (!email || !password) {
  console.error(
    "usage: node ./scripts/medusa-user-server.cjs <email> <password>\n" +
      "   or: npm run user:create:prod -- <email> <password>",
  );
  process.exit(1);
}
const root = process.cwd();
const serverDir = join(root, ".medusa", "server");
if (!existsSync(serverDir)) {
  console.error(
    `[medusa-user-server] missing ${serverDir} — run "npm run build" in backend first`,
  );
  process.exit(1);
}
const cli = join(root, "node_modules", "@medusajs", "cli", "cli.js");
const res = spawnSync(
  process.execPath,
  [cli, "user", "-e", email, "-p", password],
  {
    stdio: "inherit",
    cwd: serverDir,
    env: process.env,
    shell: false,
  },
);
process.exit(res.status ?? 1);
