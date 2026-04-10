const { spawnSync } = require("node:child_process");

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
  // Always keep schema and promo setup synchronized on deploy.
  run("npm", ["run", "deploy:prepare"]);

  // Optional first-time catalog bootstrap on Railway:
  // set MEDUSA_BOOTSTRAP_ON_DEPLOY=true in service variables once.
  if ((process.env.MEDUSA_BOOTSTRAP_ON_DEPLOY || "").toLowerCase() === "true") {
    run("npm", ["run", "seed"]);
  }

  const port = process.env.PORT || "9000";
  run("npx", ["medusa", "start", "-H", "0.0.0.0", "-p", port]);
}

main();
