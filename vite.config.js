import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Set an alias for /src to point to the correct src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
});