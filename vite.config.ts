import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

// The version shown in the game comes from package.json (bump it there for each release).
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// base './' keeps dist/ portable: it runs from any folder, file host or itch.io.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
