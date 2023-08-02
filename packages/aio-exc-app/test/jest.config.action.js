module.exports = {
  collectCoverage: true,
  verbose: false,
  collectCoverageFrom: ['../action/*.js'],
  testRegex: '/[^/]*.test.js$',
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      lines: 100,
      branches: 95,
      statements: 100
    }
  }
}
