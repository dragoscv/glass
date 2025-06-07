import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node18',
  external: [
    'ws',
    'express',
    'robot-js',
    'node-window-manager',
    'clipboardy',
    'commander'
  ]
})
