import { defineConfig } from 'vite'

export default defineConfig({
  // Relative base so the build works both at a domain root (Netlify) and under
  // a sub-path (GitHub Pages: /huhhuhgame/). Runtime asset fetches are prefixed
  // with import.meta.env.BASE_URL (= './') so they resolve relative to the page.
  base: './',
  server: {
    port: 5173,
    open: true,
  },
})
