import { defineConfig } from 'jest';

export default defineConfig({
  injectGlobals: false,
  restoreMocks: true,
  transform: {},
  setupFiles: [
    '<rootDir>/tests/support/setup-env.mjs',
    '<rootDir>/tests/support/setup-database.mjs',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/support/mock-server.mjs'],
});
