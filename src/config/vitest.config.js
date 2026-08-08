import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [resolve(__dirname, '../tests/vitest.setup.js')],
    include: ['src/tests/**/*.test.js', 'src/tests/**/*.spec.js', 'src/**/*.test.js', 'src/**/*.spec.js'],
    exclude: ['node_modules/', 'dist/', 'coverage/', '*.config.js', '*.config.mjs', 'scripts/'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/tests/',
        'dist/',
        'coverage/',
        '*.config.js',
        '*.config.mjs',
        'scripts/',
        '**/*.d.ts',
        '**/*.test.js',
        '**/*.spec.js'
      ],
      thresholds: {
        global: {
          branches: 25,
          functions: 25,
          lines: 25,
          statements: 25
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
});
