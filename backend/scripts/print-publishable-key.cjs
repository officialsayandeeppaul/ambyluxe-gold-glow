/**
 * Prints the publishable API key from the local DB (dev) so you can paste into
 * repo-root `.env` as VITE_MEDUSA_PUBLISHABLE_KEY=...
 *
 * Requires Docker Postgres (see docker-compose.yml) and backend/.env DATABASE_URL.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const backendRoot = path.join(__dirname, "..");
const composeFile = path.join(backendRoot, "..", "docker-compose.yml");

function loadEnv() {
  const envPath = path.join(backendRoot, ".env");
  if (!fs.existsSync(envPath)) {
    console.error("Missing backend/.env");
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
    console.error("DATABASE_URL is not set in backend/.env");
    process.exit(1);
  }
  let u;
  try {
    u = new URL(dbUrl);
  } catch {
    console.error("Invalid DATABASE_URL");
    process.exit(1);
  }
  const dbName = u.pathname.replace(/^\//, "").split("?")[0];
  if (!dbName) {
    console.error("Could not parse database name from DATABASE_URL");
    process.exit(1);
  }
  if (!fs.existsSync(composeFile)) {
    console.error("Missing docker-compose.yml at repo root.");
    process.exit(1);
  }

  const dockerCompose = `docker compose -f "${composeFile}"`;
  const sql =
    "SELECT token FROM api_key WHERE type = 'publishable' AND deleted_at IS NULL LIMIT 1;";

  let token;
  try {
    token = execSync(
      `${dockerCompose} exec -T postgres psql -U postgres -d ${dbName} -t -A -c "${sql}"`,
      { encoding: "utf8" }
    ).trim();
  } catch (e) {
    console.error(
      "Could not read api_key. Is Docker running? Is Postgres up?\n",
      e.message || e
    );
    process.exit(1);
  }

  if (!token) {
    console.error(
      "No publishable key found. Seed the backend (npm run seed) or create a key in Admin → Settings → Publishable API keys."
    );
    process.exit(1);
  }

  console.log(`\nPaste into repo-root .env (then restart Vite: npm run dev):\n`);
  console.log(`VITE_MEDUSA_PUBLISHABLE_KEY=${token}\n`);
}

main();
