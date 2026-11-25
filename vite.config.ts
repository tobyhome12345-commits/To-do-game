import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(process.env.APP_VERSION ?? 'dev') },
  base: './',
  build: { target: 'es2022', outDir: 'dist', sourcemap: false },
  server: { host: true },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as any);
