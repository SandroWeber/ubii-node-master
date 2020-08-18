export default {
  files: [
    '!test/devices/**/*',
    '!test/sessions/**/*',
    '!test/clients/**/*',
    'test/processing/**/*',
    // outdated client integration tests, replaced by actual clients from web-frontend and Unity with their integration tests and demos
    '!test/node/master-client-web.js',
    '!test/node/master-client-zmq.js',
    // not part of the tests
    '!test/files/**/*',
    '!test/mocks/*',
    '!test/sessions/testUtility.js'
  ],
  cache: false,
  failFast: false,
  failWithoutAssertions: false,
  tap: false,
  verbose: true,
  serial: false,
  compileEnhancements: false
};
