/**
 * Medusa expects Redis at REDIS_URL (default redis://127.0.0.1:6379).
 * If Redis is down, /app can hang and you see [ioredis] ECONNRESET.
 */
const net = require("net");
const fs = require("fs");
const path = require("path");

function readRedisUrlFromEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return null;
  const text = fs.readFileSync(envPath, "utf8");
  const line = text.split(/\r?\n/).find((l) => /^\s*REDIS_URL=/.test(l));
  if (!line) return null;
  const v = line.replace(/^\s*REDIS_URL=\s*/, "").trim();
  return v.replace(/^["']|["']$/g, "") || null;
}

function parseRedisUrl(raw) {
  if (!raw) return { host: "127.0.0.1", port: 6379 };
  try {
    const u = new URL(raw);
    return {
      host: u.hostname || "127.0.0.1",
      port: u.port ? parseInt(u.port, 10) : 6379,
    };
  } catch {
    return { host: "127.0.0.1", port: 6379 };
  }
}

if (process.env.SKIP_REDIS_CHECK === "1") {
  process.exit(0);
}

const rawUrl = process.env.REDIS_URL || readRedisUrlFromEnvFile();
const { host, port } = parseRedisUrl(rawUrl);

const socket = net.createConnection({ host, port, timeout: 4000 });

socket.on("connect", () => {
  socket.end();
  process.exit(0);
});

socket.on("timeout", () => {
  socket.destroy();
  printHelp(host, port);
  process.exit(1);
});

socket.on("error", () => {
  printHelp(host, port);
  process.exit(1);
});

function printHelp(host, port) {
  console.error("");
  console.error(`[Medusa] Cannot reach Redis at ${host}:${port}`);
  console.error("  Admin at http://localhost:9000/app will not load reliably without Redis.");
  console.error("");
  console.error("  Fix (Docker): from the repo root folder run:");
  console.error("    docker compose up -d redis");
  console.error("  Or from backend/:");
  console.error("    npm run redis:up");
  console.error("");
  console.error("  Then: npm run dev");
  console.error("");
  console.error("  Skip this check (not recommended): set SKIP_REDIS_CHECK=1");
  console.error("");
}
