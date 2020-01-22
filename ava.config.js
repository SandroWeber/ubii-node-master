export default {
  files: [
    'test/node/master-client-web.js',
    'test/node/master-client-zmq.js',
    'test/devices/**/*',
    'test/sessions/**/*',
    'test/clients/**/*',
    '!test/files/**/*',
    '!test/mocks/*',
    '!test/sessions/testUtility.js'
  ],
  cache: false,
  failFast: false,
  failWithoutAssertions: false,
  tap: false,
  verbose: false,
  serial: true,
  compileEnhancements: false
};
