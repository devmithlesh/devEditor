import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@deveditor/react-editor/styles', replacement: path.resolve(__dirname, 'packages/react-editor/src/styles/base.css') },
      { find: '@deveditor/react-editor', replacement: path.resolve(__dirname, 'packages/react-editor/src') },
    ],
  },
})
