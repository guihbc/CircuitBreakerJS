/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type {JestConfigWithTsJest} from 'ts-jest';

const config: JestConfigWithTsJest = {
  rootDir: "./tests",
  preset: "ts-jest",
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8"
};

export default config;
