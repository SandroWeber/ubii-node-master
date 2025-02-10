const { LoggingService } = require('@tum-far/ubii-node-nodejs');
const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../service.js');

const logger = LoggingService.instance.logger;
const LOG_TAG = '[UBII ClientDeregistrationService]';

class ClientDeregistrationService extends Service {

  constructor(clientManager, deviceManager) {
    super(DEFAULT_TOPICS.SERVICES.CLIENT_DEREGISTRATION, MSG_TYPES.CLIENT, MSG_TYPES.SUCCESS + ', ' + MSG_TYPES.ERROR);

    this.clientManager = clientManager;
    this.deviceManager = deviceManager;
  }

  reply(message) {
    let client = this.clientManager.getClient(message.id);
    let clientString = client.toString();

    try {
      this.deviceManager.removeClientDevices(client.id);
      this.clientManager.removeClient(client.id);
    } catch (error) {
      logger.error({ label: LOG_TAG, message: 'ClientDeregistrationService ERROR' + error.toString() });
      return {
        error: {
          title: LOG_TAG,
          message: error && error.toString(),
          stack: error && error.stack
        }
      };
    }

    let msgSuccess = {
      title: LOG_TAG,
      message: clientString + ' was successfully removed'
    };
    logger.info({ label: LOG_TAG, message: msgSuccess.message });
    return {
      success: msgSuccess
    };
  }
}

module.exports = {
  ClientDeregistrationService: ClientDeregistrationService
};
