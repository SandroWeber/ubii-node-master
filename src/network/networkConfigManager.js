const os = require('os');

class NetworkConfigManager {
  constructor() {
    this.getIPConfig();
  }

  getIPConfig() {
    this.hostAdresses = {
      ethernet: '',
      wifi: ''
    };

    let ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach(ifname => {
      ifaces[ifname].forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal && ifname.indexOf('Default Switch') === -1) {
          if (
            ifname.indexOf('en') === 0 ||
            ifname.indexOf('vEthernet') === 0 ||
            ifname.indexOf('Ethernet') === 0
          ) {
            this.hostAdresses.ethernet = iface.address;
          } else if (ifname.indexOf('wl') === 0 || ifname.indexOf('Wi-Fi') === 0) {
            this.hostAdresses.wifi = iface.address;
          }
        }
      });
    });
  }
}

module.exports = new NetworkConfigManager();
