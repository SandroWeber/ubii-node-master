/**
 * Time interval in ms for the sign of life check.
 */
const SIGN_OF_LIFE_DELTA_TIME = 500;
/**
 * Time interval in ms for the remote pinging.
 */
const TIME_UNTIL_PING = 1000;
/**
 * Time in ms until the client state should change to standby
 */
const TIME_UNTIL_STANDBY = 2000;
/**
 * Time in ms until the client state should change to inactive.
 */
const TIME_UNTIL_INACTIVE = 5000;
/**
 * Time in ms until the client should be regarded as disconnected.
 */
const TIME_UNTIL_DISCONNECT = 10000;

module.exports = {
  TIME_UNTIL_PING: TIME_UNTIL_PING,
  TIME_UNTIL_STANDBY: TIME_UNTIL_STANDBY,
  TIME_UNTIL_INACTIVE: TIME_UNTIL_INACTIVE,
  TIME_UNTIL_DISCONNECT: TIME_UNTIL_DISCONNECT,
  SIGN_OF_LIFE_DELTA_TIME: SIGN_OF_LIFE_DELTA_TIME
};
