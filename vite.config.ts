import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules/react')) return 'vendor-react'
          if (id.includes('node_modules/react-dom')) return 'vendor-react'
          if (id.includes('node_modules/three')) return 'vendor-three'
        },
      },
    },
  },
})
