export default {
  files: [
    'test/devices/**/*',
    'test/sessions/**/*',
    'test/clients/**/*',
    'test/processing/**/*',
    'test/storage/**/*',
    // not part of the tests
    '!test/mocks/*',
    '!test/files/*',
    '!test/sessions/utils.js',
    '!test/devices/topicMultiplexer.js', // outdated, to be merged and removed with ubii-node-nodejs
    '!test/devices/topicDemultiplexer.js' // outdated, to be merged and removed with ubii-node-nodejs
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
