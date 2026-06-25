import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    base: process.env.NODE_ENV === 'production' ? '/PowerGridDesigner' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        sourcemap: true
    },
    server: {
        sourcemapIgnoreList: false // Ensures VS Code can map internal files if needed
    },
    css: {
        devSourcemap: true // Optional: Also maps your CSS/SASS files
    }
})
