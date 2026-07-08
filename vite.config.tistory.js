import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/tistory.entry.js'),
      name: 'TistorySkin',
      formats: ['iife'],
      fileName: () => 'tistory.js',
    },
    outDir: 'dist',
  },
});
