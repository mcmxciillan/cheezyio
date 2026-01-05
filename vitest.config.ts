import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'client/**/*.test.ts', 'client/**/*.test.tsx'],
    environment: 'node', // Use 'jsdom' if testing React components deeply later
  },
});
