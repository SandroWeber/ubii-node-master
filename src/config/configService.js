const fs = require('fs');

class ConfigService {
  constructor() {
    console.info('### ConfigService constructor ###');
    this.config = JSON.parse(fs.readFileSync('./config.json'));
  }
}

module.exports = new ConfigService();
