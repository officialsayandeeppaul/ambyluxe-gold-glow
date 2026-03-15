import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/models',
  out: './drizzle',
  verbose: true,
  strict: true,
});
