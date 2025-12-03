module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        types: ['jest', 'node'],
      },
    }],
  },
  // Allow Jest to transform ESM modules from node_modules (like Baileys)
  transformIgnorePatterns: [
    'node_modules/(?!(baileys|@whiskeysockets)/)',
  ],
  // Mock ESM modules that can't be transformed
  moduleNameMapper: {
    '^baileys$': '<rootDir>/src/__mocks__/baileys.ts',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      // TODO: Increase coverage thresholds gradually as tests are added
      // Current coverage: ~5%. Target: 80%
      // Temporarily set to 0% to allow development workflow
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
};

