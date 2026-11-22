import { defineConfig } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';

// Genera dist/sw.js con la lista de archivos a guardar para funcionar como app (sin la textura de 8k:
// solo se usa con la calidad «Alta» elegida a mano y se guarda la primera vez que se carga).
function serviceWorker() {
  return {
    name: 'service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).map((f) => `/${f}`);
      const textures = readdirSync('public/textures').filter((f) => !f.startsWith('8k_') && !f.endsWith('.tmp')).map((f) => `/textures/${f}`);
      const icons = readdirSync('public/icons').map((f) => `/icons/${f}`);
      const precache = ['/', '/index.html', '/manifest.webmanifest', ...files.filter((f) => f !== '/index.html'), ...icons, ...textures];
      const version = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
      const source = readFileSync('src/pwa/sw.template.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(precache, null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  server: { port: 5173, host: true },
  build: { chunkSizeWarningLimit: 1500, target: 'es2020' },
  plugins: [serviceWorker()],
});
