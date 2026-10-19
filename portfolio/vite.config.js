import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import projectAssetsPlugin from './build/projectAssets.js'
import chatApiPlugin from './build/chatApi.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), projectAssetsPlugin(), chatApiPlugin({
    ...loadEnv(mode, path.resolve(import.meta.dirname, '..'), ''),
    ...loadEnv(mode, import.meta.dirname, ''),
    ...process.env,
  })],
}))
