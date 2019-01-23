const {
    MasterNode
} = require('../../src/index.js');
const readline = require('readline');

(function () {
    let rl1 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
   
    let topicDataServerPort = 0, serviceServerPort = 0;

    rl1.question("Enter the port number for the TOPICDATA server of the master node: ", function (answer) {
        topicDataServerPort = answer;

        rl1.question("Enter the port number for the SERVICE server of the master node: ", function (answer2) {
            serviceServerPort = answer2;

            console.log("Starting master node with topicData server on port: ", topicDataServerPort);
            console.log("Starting master node with service server on port: ", serviceServerPort);
        
            let master = new MasterNode('localhost', topicDataServerPort, serviceServerPort);

            rl1.close();
        });
    });
})();