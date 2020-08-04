export default {
  files: [
    'test/clients/integration-tests/*.js', //regexSubscriptions
    '!test/node/master-client-web.js',
    '!test/node/master-client-zmq.js',
    '!test/devices/**/*',
    '!test/sessions/**/*',
    'test/clients/**/*',
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
  serial: true,
  compileEnhancements: false
};
