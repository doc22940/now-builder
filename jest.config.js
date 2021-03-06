module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: [
    'lib/**/*.js',
    '!lib/launcher.js'
  ],
  modulePathIgnorePatterns: [
    '/node_modules/',
    '/node_modules_dev/',
    '/node_modules_prod/'
  ]
}
