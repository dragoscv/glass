import { defineConfig } from 'tsup';

export default defineConfig([
  // CLI entry with shebang
  {
    entry: { cli: 'src/cli.ts' },
    format: ['cjs'],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    minify: false,
    target: 'node18',
    outDir: 'dist',
    external: ['@glassmcp/shared', '@glassmcp/sdk'],
    banner: {
      js: '#!/usr/bin/env node'
    }
  },
  // Library entry without shebang
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs'],
    dts: true,
    clean: false, // Don't clean again
    splitting: false,
    sourcemap: true,
    minify: false,
    target: 'node18',
    outDir: 'dist',
    external: ['@glassmcp/shared', '@glassmcp/sdk']
  }
]);
