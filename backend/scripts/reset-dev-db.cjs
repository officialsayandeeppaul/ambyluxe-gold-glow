/**
 * Drops and recreates the Medusa PostgreSQL database (local Docker Compose only),
 * then runs migrations and seed. Removes old demo categories/products (e.g. Shirts).
 *
 * Prerequisites:
 * - Stop `npm run dev` (Medusa) so no connections hold the DB.
 * - Postgres from repo-root: `docker compose up -d postgres`
 * - backend/.env with DATABASE_URL pointing at that instance (default: port 5433).
 *
 * Usage (from backend/):  node ./scripts/reset-dev-db.cjs
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const backendRoot = path.join(__dirname, "..");
const composeFile = path.join(backendRoot, "..", "docker-compose.yml");

function loadEnv() {
  const envPath = path.join(backendRoot, ".env");
  if (!fs.existsSync(envPath)) {
    console.error("Missing backend/.env — copy from backend/.env.template");
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function main() {
  loadEnv();
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  let u;
  try {
    u = new URL(dbUrl);
  } catch {
    console.error("Invalid DATABASE_URL.");
    process.exit(1);
  }

  const dbName = u.pathname.replace(/^\//, "").split("?")[0];
  if (!dbName) {
    console.error("Could not parse database name from DATABASE_URL.");
    process.exit(1);
  }

  const host = u.hostname;
  if (!["127.0.0.1", "localhost"].includes(host)) {
    console.error(
      "reset-dev-db only supports localhost Postgres (dev). For remote DB, use your host’s tools."
    );
    process.exit(1);
  }

  if (!fs.existsSync(composeFile)) {
    console.error("Missing docker-compose.yml at repo root.");
    process.exit(1);
  }

  const dockerCompose = `docker compose -f "${composeFile}"`;

  console.log(`\n→ Dropping database "${dbName}" (Docker postgres)...\n`);

  try {
    execSync(
      `${dockerCompose} exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${dbName} WITH (FORCE);"`,
      { stdio: "inherit", shell: true }
    );
  } catch {
    console.error(
      "\nDrop failed. Is Docker running? Is `postgres` up? Did you stop Medusa (`npm run dev`)?\n"
    );
    process.exit(1);
  }

  console.log(`\n→ Creating database "${dbName}"...\n`);
  execSync(
    `${dockerCompose} exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${dbName};"`,
    { stdio: "inherit", shell: true }
  );

  console.log("\n→ medusa db:migrate\n");
  execSync("npx medusa db:migrate", {
    cwd: backendRoot,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  console.log("\n→ medusa db:sync-links\n");
  try {
    execSync("npx medusa db:sync-links", {
      cwd: backendRoot,
      stdio: "inherit",
      shell: true,
      env: process.env,
    });
  } catch {
    console.warn(
      "db:sync-links failed (optional on some setups). Continuing to seed...\n"
    );
  }

  console.log("\n→ seed\n");
  execSync("npx medusa exec ./src/scripts/seed.ts", {
    cwd: backendRoot,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  console.log(`
Done. Jewelry catalogue + categories are seeded.

- Recreate an admin user:
    npm run user:create -- you@example.com YourPassword
  (plain email + password after --; avoids npm stripping flags on Windows.)
- Start Vite on :8080 before relying on product image URLs from seed.
- Start Medusa: npm run dev
`);
}

main();
