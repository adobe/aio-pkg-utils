module.exports = {
  collectCoverage: true,
  verbose: false,
  collectCoverageFrom: ['../web/index.ejs', '../web/invokeAction.mjs'],
  testRegex: 'web.test[^/]*.mjs$',
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      lines: 100,
      branches: 100,
      statements: 100
    }
  }
}
