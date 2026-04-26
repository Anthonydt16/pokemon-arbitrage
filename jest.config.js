/** @type {import('jest').Config} */
const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  projects: [
    // Tests composants (jsdom)
    {
      displayName: 'components',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
      testMatch: ['<rootDir>/__tests__/components/**/*.test.{ts,tsx}'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
      },
    },
    // Tests API routes (node)
    {
      displayName: 'api',
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
      testMatch: ['<rootDir>/__tests__/api/**/*.test.{ts,tsx}'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
      },
    },
  ],
})
