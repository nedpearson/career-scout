import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.replit',
      'tests/setup.ts',
      'tests/helpers/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        'client/src/components/ui/**', // Exclude shadcn/ui components
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/jobtracker/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
