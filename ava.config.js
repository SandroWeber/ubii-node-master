export default {
  "files": [
    //"test/**/*.js",
    "test/node/master-client-web.js",
    "test/node/master-client-zmq.js",
    "test/devices/**/*",
    "test/sessions/**/*",
    //"test/clients/**/*",
    //"test/services/**/*",
    "!test/files/**/*",
    "!test/mocks/*",
    "!test/sessions/testUtility.js"
  ],
  "cache": false,
  "failFast": false,
  "failWithoutAssertions": false,
  "tap": false,
  "verbose": true,
  "serial": false,
  "compileEnhancements": false
};
