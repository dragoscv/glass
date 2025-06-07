import { defineConfig } from 'tsup';

export default defineConfig([
  // Main server library
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: false,
    treeshake: true,
    target: 'es2022',
    outDir: 'dist',
    external: ['node-ffi-napi', 'ref-napi', 'ref-struct-napi', 'ref-array-napi'],
  },
  // CLI executable
  {
    entry: ['src/cli.ts'],
    format: ['cjs'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    minify: false,
    target: 'es2022',
    outDir: 'dist',
    banner: {
      js: '#!/usr/bin/env node',
    },
    external: ['node-ffi-napi', 'ref-napi', 'ref-struct-napi', 'ref-array-napi'],
  },
]);
