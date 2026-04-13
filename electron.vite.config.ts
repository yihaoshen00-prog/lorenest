import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry:    resolve('electron/main.ts'),
        fileName: () => 'index.js',
      },
    },
    resolve: {
      alias: {
        '@shared': resolve('shared'),
        '@main':   resolve('electron'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry:    resolve('electron/preload.ts'),
        fileName: () => 'index.js',
      },
    },
  },
  renderer: {
    root: resolve('src/renderer'),
    build: {
      rollupOptions: {
        input: resolve('src/renderer/index.html'),
      },
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared':   resolve('shared'),
      },
    },
    plugins: [react()],
  },
})
