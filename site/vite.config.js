import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/agent-marketplace/',
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'node',
  },
});
