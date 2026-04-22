import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules/react')) return 'vendor-react'
          if (id.includes('node_modules/react-dom')) return 'vendor-react'
          if (id.includes('node_modules/three')) return 'vendor-three'
          if (id.includes('node_modules/@tanstack')) return 'vendor-tanstack'
          if (id.includes('node_modules/zod')) return 'vendor-zod'
        },
      },
    },
  },
})
