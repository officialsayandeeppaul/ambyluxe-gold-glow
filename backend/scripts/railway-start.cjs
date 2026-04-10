const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

function run(cmd, args) {
  const printable = `${cmd} ${args.join(" ")}`;
  console.log(`[railway-start] running: ${printable}`);
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (res.status !== 0) {
    process.exit(res.status || 1);
  }
}

function main() {
  // Safe default for all deploys: only migrate schema.
  run("npm", ["run", "db:migrate"]);

  // Optional setup pass (collections/promotions/INR) for controlled maintenance deploys.
  if ((process.env.MEDUSA_SETUP_ON_DEPLOY || "").toLowerCase() === "true") {
    run("npm", ["run", "ensure:inr"]);
    run("npm", ["run", "ensure:collections"]);
    run("npm", ["run", "seed:promotions"]);
  }

  // Optional first-time catalog bootstrap on Railway:
  // set MEDUSA_BOOTSTRAP_ON_DEPLOY=true in service variables once.
  if ((process.env.MEDUSA_BOOTSTRAP_ON_DEPLOY || "").toLowerCase() === "true") {
    run("npm", ["run", "seed"]);
  }

  // Ensure admin/build artifacts always exist before boot.
  // This avoids intermittent "/app" 500 on Railway when artifacts are absent.
  run("npm", ["run", "build"]);

  // Safety check after build.
  const adminIndex = join(process.cwd(), ".medusa", "server", "public", "admin", "index.html");
  if (!existsSync(adminIndex)) {
    console.error(`[railway-start] missing admin build artifact: ${adminIndex}`);
    process.exit(1);
  }

  const port = process.env.PORT || "9000";
  run("npx", ["medusa", "start", "-H", "0.0.0.0", "-p", port]);
}

main();
