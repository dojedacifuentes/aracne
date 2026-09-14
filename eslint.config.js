const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      '.reference/**',
      'files/**',
      'files2/**',
    ],
  },
  {
    // Scripts, pruebas y configuración: entorno Node, no React Native.
    files: ['scripts/**/*.{mjs,ts}', 'tests/**/*.ts', 'eslint.config.js', 'vitest.config.mts'],
    languageOptions: {
      globals: { Buffer: 'readonly', console: 'readonly', process: 'readonly' },
    },
  },
]);
