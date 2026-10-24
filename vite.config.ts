import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Development plugin to prevent WebSocket handshake errors in environments
 * (such as Google Cloud Run / AI Studio preview) where proxy WebSocket upgrade forwarding is unsupported.
 */
function disableHmrInPreviewPlugin(): Plugin {
  return {
    name: 'disable-hmr-in-preview',
    apply: 'serve',
    transform(code: string, id: string) {
      if (id.includes('vite/dist/client/client.mjs') || id.includes('@vite/client')) {
        return {
          code: code.replace(
            /const transport = normalizeModuleRunnerTransport[\s\S]*?\n\);/,
            `const transport = normalizeModuleRunnerTransport({
              async connect() {
                console.debug("[vite] HMR WebSocket disabled: proxy upgrade unsupported in preview environment.");
              },
              async disconnect() {},
              send() {},
            });`
          ),
          map: null,
        };
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), disableHmrInPreviewPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    watch: {
      usePolling: true,
    },
    hmr: false,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  },
});
