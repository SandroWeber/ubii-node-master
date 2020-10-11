export default {
  files: [
    'test/devices/**/*',
    'test/sessions/**/*',
    'test/clients/**/*',
    'test/processing/**/*',
    // not part of the tests
    '!test/mocks/*',
    '!test/sessions/testUtility.js'
  ],
  cache: false,
  failFast: true,
  failWithoutAssertions: false,
  tap: false,
  verbose: true,
  serial: true,
  babel: {
    compileEnhancements: false
  }
};
