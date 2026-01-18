/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.test.ts',
    '**/*.spec.ts',
  ],
  moduleNameMapper: {
    '^@p2p/shared$': '<rootDir>/packages/shared/src/index.ts',
    '^@p2p/shared/(.*)$': '<rootDir>/packages/shared/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.base.json',
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/index.ts',
    '!packages/shared/src/generated/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000, // 30 seconds for async tests
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/packages/shared/src/tests/setup.ts'],
  
  // Global setup/teardown for database
  globalSetup: '<rootDir>/packages/shared/src/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/packages/shared/src/tests/globalTeardown.ts',
};
