import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/index.ts',
      name: 'FourthDimensionEngine',
      formats: ['es'],
      fileName: 'index',
    },
    sourcemap: true,
  },
});
