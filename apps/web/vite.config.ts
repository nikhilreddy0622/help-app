import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  ssr: {
    // Workspace packages ship TypeScript source; CJS-only libs are bundled for Node ESM interop.
    noExternal: [/^@help\//, 'react-helmet-async', 'react-router-dom', 'react-router', '@remix-run/router', '@tanstack/react-query', 'lucide-react'],
  },
  build: { outDir: 'dist/client', chunkSizeWarningLimit: 700 },
});
