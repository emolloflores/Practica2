'use strict';

/**
 * ESLint v9 flat config — users-service (Node.js / CommonJS)
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

    // Extender el conjunto recomendado de ESLint (errores comunes, buenas
    // prácticas y patrones problemáticos conocidos).
    ...js.configs.recommended,

    languageOptions: {
      ecmaVersion: 2021,
      sourceType:  'commonjs',   // require/module.exports
      globals: {
        // Variables globales de Node.js (process, Buffer, __dirname, etc.)
        ...globals.node,
      },
    },

    rules: {
      // ── Seguridad ──────────────────────────────────────────────────
      // eval() permite ejecución arbitraria de código: prohibido siempre.
      'no-eval':        'error',
      // new Function() es equivalente a eval(): mismos riesgos.
      'no-new-func':    'error',

      // ── Calidad ───────────────────────────────────────────────────
      // Variables declaradas pero no usadas indican lógica incompleta.
      // El prefijo _ marca parámetros intencionalmente ignorados (ej. _req).
      // caughtErrors: 'none' permite catch (err) sin usar err — patrón común
      // en middleware Express donde se captura el error pero no se expone al cliente.
      'no-unused-vars': ['error', {
        vars:                'all',
        args:                'after-used',
        argsIgnorePattern:   '^_',
        varsIgnorePattern:   '^_',
        caughtErrors:        'none',
      }],
      // Comparaciones siempre deben usar === / !== para evitar coerciones.
      'eqeqeq':         ['error', 'always'],
      // var tiene semántica confusa de hoisting; usar const/let.
      'no-var':         'error',
    },
  },
];
