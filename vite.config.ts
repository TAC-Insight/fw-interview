import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'

// Styling mirrors the production app: plain CSS Modules + design tokens (no
// Tailwind). lightningcss is the transformer and `generateScopedName`
// keeps class names readable in DevTools.
const config = defineConfig({
  resolve: {
    // Force a single React copy so hooks work across package boundaries.
    dedupe: ['react', 'react-dom'],
  },
  css: {
    transformer: 'lightningcss',
    modules: {
      generateScopedName: '[name]_[local]__[hash:base64:5]',
    },
  },
  plugins: [
    devtools(),
    // The router plugin must come before the React plugin.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
  ],
})

export default config
