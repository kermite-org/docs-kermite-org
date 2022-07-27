import { defineConfig } from 'vite';
import vitePluginString from 'vite-plugin-string';

export default defineConfig({
  build: {
    outDir: './dist',
    emptyOutDir: true,
    minify: false,
  },
  plugins: [
    vitePluginString({
      include: ['**/*.fdoc'],
      compress: false,
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  clearScreen: false,
});
