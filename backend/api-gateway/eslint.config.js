'use strict';

/**
 * ESLint v9 flat config — api-gateway (Node.js / CommonJS)
 *
 * El paquete no tiene "type": "module", por lo que este archivo
 * se carga como CommonJS y usa module.exports (no export default).
 */

const js      = require('@eslint/js');
const globals = require('globals');

module.exports = [
  // ── Ignorar directorios que no deben lintarse ────────────────────────
  {
    ignores: ['node_modules/', 'coverage/', 'dist/'],
  },

  // ── Reglas para todo el código fuente JS ────────────────────────────
  {
    files: ['**/*.js'],

    // Extender el conjunto recomendado de ESLint.
    ...js.configs.recommended,

    languageOptions: {
      ecmaVersion: 2021,
      sourceType:  'commonjs',
      globals: {
        ...globals.node,
      },
    },

    rules: {
      // ── Seguridad ──────────────────────────────────────────────────
      'no-eval':        'error',
      'no-new-func':    'error',

      // ── Calidad ───────────────────────────────────────────────────
      // caughtErrors: 'none' permite catch (err) sin usar err — patrón común
      // en middleware Express donde se captura el error pero no se expone al cliente.
      'no-unused-vars': ['error', {
        vars:                'all',
        args:                'after-used',
        argsIgnorePattern:   '^_',
        varsIgnorePattern:   '^_',
        caughtErrors:        'none',
      }],
      'eqeqeq':         ['error', 'always'],
      'no-var':         'error',
    },
  },
];
