import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Ignorar output generado y configuraciones de herramientas externas.
  // cypress.config.js usa la firma estándar de Cypress (on, config) que puede
  // estar vacía — excluirla evita falsos positivos de no-unused-vars.
  globalIgnores(['dist/', 'cypress.config.js']),

  // ── Configuración principal para código fuente React/JS ─────────────
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },

  // ── Globales de Jest para archivos de test ───────────────────────────
  // Jest inyecta describe, test, expect, beforeAll, afterAll, etc. como
  // globales implícitos. Sin este bloque ESLint los reporta como no definidos.
  {
    files: ['**/__tests__/**/*.{js,jsx}', '**/*.test.{js,jsx}', '**/*.spec.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
])
