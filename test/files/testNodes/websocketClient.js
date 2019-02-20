const WebSocket = require('ws');

const {
    PING_MESSAGE,
    PONG_MESSAGE
} = require('../../../src/network/constants.js');

class WebsocketClient {

    /**
     * Communication endpoint implementing websocket.
     * @param {*} identity ID string to uniquely identify this object. This id is used to route messages to this socket.
     * @param {*} host Host to connect to.
     * @param {*} port Port to connect to.
     * @param {*} onReceive Callback function accepting a message parameter that is called when a new message is received.
     * @param {*} autoconnect Should the socket connect directly after the initialization of the object?
     * If not, the start method must be called manually.
     */
    constructor(identity,
                host = 'localhost',
                port = 5555,
                onReceive = (message) => {},
                autoconnect = true) {
        this.identity = identity;
        this.serverHost = host;
        this.port = port;
        this.onReceive = onReceive;

        if (autoconnect) {
            this.start();
        }
    }

    /**
     * Start the websocket client.
     */
    start() {
        // init
        this.websocket = new WebSocket(`ws://${this.serverHost}:${this.port}?clientID=${this.identity}`, {
            rejectUnauthorized: false
        });

        // add callbacks
        this.websocket.on('message', (message) => {
            // process pings
            /*if (payload.toString() === PING_MESSAGE) {
                this.send(PONG_MESSAGE);
                return;
            }*/

            this.onReceive(message);
        });

        this.websocket.on('error', (error) => {
            console.info(new Date() + ' WebsocketClient ' + error.toString());
            console.error(error);
        });
    }

    /**
     * Send a payload (string or Buffer object) to the server.
     * @param {(string|Buffer)} message
     */
    send(message) {
        // send
        this.websocket.send(message);
    }

    /**
     * Stop the dealer and close the socket.
     */
    stop() {
        this.websocket.close();
    }
}

module.exports = WebsocketClient;