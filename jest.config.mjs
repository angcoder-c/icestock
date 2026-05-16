/** @type {import('jest').Config} */
const tsJest = [
  'ts-jest',
  {
    useESM: true,
    tsconfig: {
      module: 'ESNext',
      moduleResolution: 'bundler',
      allowImportingTsExtensions: false,
      jsx: 'react-jsx',
    },
  },
]

/** @type {import('jest').Config} */
export default {
  projects: [
    {
      displayName: 'node',
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      roots: ['<rootDir>/tests'],
      testMatch: ['**/*.test.ts'],
      testPathIgnorePatterns: ['<rootDir>/tests/ui/'],
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(#/(.*))$': '<rootDir>/src/$2',
      },
      transform: {
        '^.+\\.ts$': tsJest,
      },
    },
    {
      displayName: 'ui',
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'jest-environment-jsdom',
      roots: ['<rootDir>/tests/ui'],
      testMatch: ['**/*.test.tsx'],
      setupFilesAfterEnv: ['<rootDir>/tests/ui/jest.setup.polyfill.ts', '<rootDir>/tests/ui/jest.setup.ts'],
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      moduleNameMapper: {
        '^(#/(.*))$': '<rootDir>/src/$2',
      },
      transform: {
        '^.+\\.tsx?$': tsJest,
      },
    },
  ],
}
