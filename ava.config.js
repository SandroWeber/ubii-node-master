export default {
  "files": [
    //"test/**/*.js",
    "test/node/master-client-web.js",
    "test/node/master-client-zmq.js",
    "!test/mocks/*",
    "!test/files/**/*",
    "!test/exclude/**/*",
    "!test/clients/**/*",
    "!test/devices/**/*",
    "!test/services/**/*",
    "test/sessions/**/*",
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
