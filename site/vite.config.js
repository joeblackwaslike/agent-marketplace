import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const writingDir = resolve(__dirname, 'writing');

const articleEntries = existsSync(writingDir)
  ? Object.fromEntries(
      readdirSync(writingDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => [`writing-${entry.name}`, resolve(writingDir, entry.name, 'index.html')]),
    )
  : {};

export default defineConfig({
  root: '.',
  base: '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ...articleEntries,
      },
    },
  },
  test: {
    environment: 'node',
  },
});
