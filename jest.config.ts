export default {
  preset: "ts-jest",
  testEnvironment: "node",
  testRegex: ".test.ts$",
  testPathIgnorePatterns: ["packages/*/lib-es", "packages/*/lib"],
  transformIgnorePatterns: ["/node_modules/(?!@everscale)"],
  passWithNoTests: true,
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
