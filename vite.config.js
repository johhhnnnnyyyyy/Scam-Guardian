import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// The UI is a React + Tailwind + shadcn/ui app with two pages (senior, family). `npm run build` writes it to dist/,
// which the Node server serves. Fixed-URL assets (service worker, worklet, manifest, privacy page) stay in public/.
const here = p => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
 root: here('./ui'),
 publicDir: false,
 plugins: [react(), tailwindcss()],
 resolve: { alias: { '@': here('./ui/src') } },
 build: {
  outDir: here('./dist'), emptyOutDir: true, sourcemap: false, target: 'es2022', cssCodeSplit: false,
  rollupOptions: { input: { index: here('./ui/index.html'), family: here('./ui/family.html') } },
 },
 server: { port: 5173, proxy: { '/api': { target: 'http://127.0.0.1:3000', ws: true, changeOrigin: false } } },
});
