import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import projectAssetsPlugin from './build/projectAssets.js'
import chatApiPlugin from './build/chatApi.js'
import bootScreenPlugin from './build/bootScreen.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'vendor', test: /node_modules[\\/](?:react|react-dom|scheduler|lucide-react)[\\/]/ }],
        },
      },
    },
  },
  plugins: [react(), bootScreenPlugin(), projectAssetsPlugin(), chatApiPlugin({
    ...loadEnv(mode, path.resolve(import.meta.dirname, '..'), ''),
    ...loadEnv(mode, import.meta.dirname, ''),
    ...process.env,
  })],
}))
