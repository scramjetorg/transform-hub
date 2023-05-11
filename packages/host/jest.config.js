
module.exports = {
  coverageDirectory: "coverage",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist/"
  ],
  coverageProvider: "v8",
  coverageReporters: [
    // "json",
    "text",
    // "lcov",
  ],
  errorOnDeprecated: true,
  preset: 'ts-jest',
  slowTestThreshold: 5,
  testEnvironment: 'node',
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/test/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[tj]s?(x)"
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
  ],
};