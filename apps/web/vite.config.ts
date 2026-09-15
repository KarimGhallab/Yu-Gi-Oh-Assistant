import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API_TARGET = 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': API_TARGET,
      '/health': API_TARGET
    }
  }
});
