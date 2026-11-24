import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' makes the build work from any static host sub-path (GitHub Pages, Netlify, a folder).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2022', sourcemap: false },
})
