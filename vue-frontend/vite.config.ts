import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': '/src'
        }
    },
    optimizeDeps: {
        entries: ['index.html']
    },
    build: {
        rollupOptions: {
            input: 'index.html'
        }
    }
})