/**
 * Generate migrations from src/db/schema.ts
 * Run: npm run db:generate
 * 1. Runs drizzle-kit generate
 * 2. Appends RLS + triggers from src/db/extras.ts
 */
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { RLS_AND_TRIGGERS } from '../src/db/extras';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DRIZZLE_DIR = join(ROOT, 'drizzle');
const SUPABASE_DIR = join(ROOT, 'supabase', 'migrations');

// 1. Run drizzle-kit generate
execSync('npx drizzle-kit generate', { cwd: ROOT, stdio: 'inherit' });

// 2. Find latest migration, append RLS + triggers
if (!existsSync(DRIZZLE_DIR)) {
  console.log('Run drizzle-kit generate first. No drizzle output found.');
  process.exit(1);
}
const files = readdirSync(DRIZZLE_DIR).filter((f) => f.endsWith('.sql')).sort();
const latest = files[files.length - 1];
if (!latest) {
  console.log('No migration files found.');
  process.exit(0);
}

const inPath = join(DRIZZLE_DIR, latest);
let sql = readFileSync(inPath, 'utf-8');
sql += RLS_AND_TRIGGERS;

// Write to supabase/migrations
if (!existsSync(SUPABASE_DIR)) mkdirSync(SUPABASE_DIR, { recursive: true });
const outPath = join(SUPABASE_DIR, latest);
writeFileSync(outPath, sql, 'utf-8');
console.log('Generated:', outPath);
