import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'tests/**/*.spec.{js,ts}',
      'tests/**/*.test.{js,ts}',
      'src/tests/**/*.test.{js,ts}',
      'src/**/__tests__/**/*.{js,ts}',
    ],
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/hooks/**', 'src/lib/**', 'src/components/lib/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});