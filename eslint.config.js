import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const ignores = [
  'dist/**',
  'node_modules/**',
  '.tanstack/**',
  'src/routeTree.gen.ts',
  'eslint.config.js',
]

const reactDetection = { settings: { react: { version: '19.2' } } }

export default tseslint.config(
  { ignores },
  reactDetection,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
    settings: { react: { version: '19.2' } },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.jest } },
  },
  {
    files: ['**/*.mjs', 'jest.config.mjs'],
    languageOptions: { globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
)
