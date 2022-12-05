const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');
const { UbiiClientNode } = require('@tum-far/ubii-node-nodejs');

let config = {
  clientNode: {
    name: 'pub_regex_script'
  },
  masterNode: {
    services: {
      address: 'http://localhost:8102/services/json',
      format: 'JSON'
    },
    topicdata: {
      address: 'ws://localhost:8104'
    }
  }
};

let ubiiNode = undefined;

(async function () {
  if (process.argv[2] === '--help') {
    console.log(
      `USAGE PARAMS:\n` +
        `#1 topic regular expression\n` +
        `#2 TopicDataReord\n` +
        `#3 service address (default=${config.masterNode.services.address}\n` +
        `#3 topic data address (default=${config.masterNode.topicdata.address}\n`
    );

    process.exit(0);
  }

  let regex = undefined;
  let recordTemplate = undefined;
  if (process.argv[2]) {
    regex = new RegExp(process.argv[2]);
  } else {
    console.error('Must provide regular expression!');
    process.exit(0);
  }

  if (process.argv[3]) {
    recordTemplate = JSON.parse(process.argv[3]); //JSON.parse(process.argv[3]);
    recordTemplate.int32 = parseInt(recordTemplate.int32);
  } else {
    console.error('Must provide TopicDataRecord!');
    process.exit(0);
  }

  if (process.argv[4]) {
    config.masterNode.services.address = process.argv[4];
  }
  if (process.argv[5]) {
    config.masterNode.topicdata.address = process.argv[5];
  }

  ubiiNode = new UbiiClientNode(config.clientNode.name, config.masterNode.services, config.masterNode.topicdata);
  await ubiiNode.initialize();
  //console.log(`client node spawned (ID ${ubiiNode.id})`);

  let list = await getMatchingTopics(regex);
  sendRecords(list, recordTemplate);

  setTimeout(() => {
    process.exit(0);
  }, 1000);
})();

let getMatchingTopics = async (regex) => {
  let reply = await ubiiNode.callService({
    topic: DEFAULT_TOPICS.SERVICES.TOPIC_LIST
  });

  if (reply.stringList && reply.stringList.elements) {
    topicList = [];
    for (let topic of reply.stringList.elements) {
      if (regex.test(topic)) {
        topicList.push(topic);
      }
    }

    return topicList;
  }
};

/* min size = 8byte (timestamp) */
let sendRecords = (topicList, recordTemplate) => {
  for (let topic of topicList) {
    let record = {};
    Object.assign(record, recordTemplate);
    record.topic = topic;
    ubiiNode.publishRecordImmediately(record);
  }
};

module.exports = {
  CONSTANTS: {}
};
