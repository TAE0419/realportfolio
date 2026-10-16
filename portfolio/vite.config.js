import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import projectAssetsPlugin from './build/projectAssets.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), projectAssetsPlugin()],
})
