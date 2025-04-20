import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,     // bikin server bisa diakses dari device lain di jaringan
    port: 3000,     // ganti port ke 3000
  },
});
