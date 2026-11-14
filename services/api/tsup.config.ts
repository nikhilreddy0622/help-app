import { defineConfig } from 'tsup';

// Workspace packages ship TS sources, so they are bundled; everything else stays external.
export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node20',
  sourcemap: true,
  clean: true,
  noExternal: ['@help/domain', '@help/validation', '@help/types', '@help/ui-tokens'],
});
