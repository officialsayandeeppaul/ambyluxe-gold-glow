/**
 * Creates a Medusa Admin user. npm on Windows often strips --email/--password when
 * running `npm run user:create -- --email ...`, so this script takes email + password
 * as plain arguments and passes them to Medusa with spawn (no npm in the middle).
 *
 * Usage (from backend/):
 *   npm run user:create -- admin@example.com YourSecurePassword
 */
const { spawnSync } = require("child_process");
const path = require("path");

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error(
    "Usage: npm run user:create -- <email> <password>\n" +
      "Example: npm run user:create -- admin@yourdomain.com YourSecurePassword"
  );
  process.exit(1);
}

const backendRoot = path.join(__dirname, "..");
const r = spawnSync(
  "npx",
  ["medusa", "user", "--email", email, "--password", password],
  {
    cwd: backendRoot,
    stdio: "inherit",
    env: process.env,
    shell: true,
  }
);

process.exit(r.status ?? 1);
