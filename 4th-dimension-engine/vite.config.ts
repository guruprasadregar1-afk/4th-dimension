import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: {
        index: 'src/index.ts',
        geometry: 'src/geometry.ts',
        slicing: 'src/slicing.ts',
        mathExport: 'src/mathExport.ts',
        physicsExport: 'src/physicsExport.ts',
        rendererExport: 'src/rendererExport.ts',
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    sourcemap: true,
  },
});
