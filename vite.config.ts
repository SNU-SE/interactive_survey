import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/interactive_survey/',
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/firestore', 'firebase/storage'],
  },
})
