/*export default*/ const avaConfig = {
  files: [
    'test/devices/deviceManagerTest.js',
    //'test/devices/**/*',
    //'test/sessions/**/*',
    //'test/clients/**/*',
    //'test/services/filterUtils.js',
    // not part of the tests
    '!test/storage/**/*',
    '!test/mocks/*',
    '!test/files/*',
    '!test/sessions/utils.js',
    '!test/devices/topicMultiplexer.js', // outdated, to be merged and removed with ubii-node-nodejs
    '!test/devices/topicDemultiplexer.js', // outdated, to be merged and removed with ubii-node-nodejs
    '!test/sessions/integration-tests/topic-mux-demux.js', // outdated, to be merged and removed with ubii-node-nodejs
    '!test/clients/integration-tests/regexSubscriptions.js' // needs rework
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

module.exports = avaConfig;
