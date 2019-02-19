export default {
  "files": [
    //"test/**/*.js",
    "test/node/master-client-web.js",
    "!test/mocks/*",
    "!test/files/**/*",
    "!test/exclude/**/*",
    "!test/clients/**/*",
    "!test/devices/**/*",
    "!test/services/**/*",
    "!test/sessions/**/*"
  ],
  "cache": false,
  "failFast": false,
  "failWithoutAssertions": false,
  "tap": false,
  "verbose": true,
  "serial": false,
  "compileEnhancements": false
};
