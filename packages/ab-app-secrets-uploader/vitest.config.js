import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    {
      name: 'strip-shebang',
      transform (code) {
        if (code.startsWith('#!')) {
          return { code: code.replace(/^#![^\n]*\n/, '') }
        }
        return null
      }
    }
  ]
})
