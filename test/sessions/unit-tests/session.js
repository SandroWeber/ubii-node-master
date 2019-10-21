import test from 'ava';
import sinon from 'sinon';

import { Session } from '../../../src/index.js'

import { MockInteractionIOMapping } from '../../mocks/mock-interaction-io-mapping.js'
import MockTopicData from '../../mocks/mock-topicdata.js';


let runProcessing = (session, milliseconds) => {
  return new Promise((resolve, reject) => {
    session.start();
    setTimeout(() => {
      session.stop();
      resolve();
    }, milliseconds);
  });
};

test.beforeEach(t => {
  t.context.mockInteractionIOMappings = [];
  t.context.mockInteractionIOMappings.push(new MockInteractionIOMapping());
  t.context.mockInteractionIOMappings.push(new MockInteractionIOMapping());
  t.context.mockInteractionIOMappings.push(new MockInteractionIOMapping());

  t.context.topicData = new MockTopicData();

  t.context.session = new Session({}, t.context.topicData);
});

/* run tests */

test('constructor', t => {
  let session = t.context.session;
  let interactionIOMappings = t.context.mockInteractionIOMappings;

  t.is(typeof session.id, 'string');
  t.not(session.id, '');
  t.is(session.ioMappings.length, 0);

  session = new Session({ ioMappings: interactionIOMappings });
  t.is(typeof session.id, 'string');
  t.not(session.id, '');
  t.is(session.ioMappings.length, interactionIOMappings.length);
});

test('add/remove interactions', t => {
  let session = t.context.session;
  let interactionIOMappings = t.context.mockInteractionIOMappings;

  t.is(session.ioMappings.length, 0);
  interactionIOMappings.forEach((element) => {
    session.addInteraction(element.interaction);
    session.ioMappings.push(element);
  });
  t.is(session.ioMappings.length, interactionIOMappings.length);

  // try adding the same interaction twice
  session.addInteraction(interactionIOMappings[0].interaction);
  t.is(session.ioMappings.length, interactionIOMappings.length);

  // remove one
  let removeIndex = 1;
  let removeID = session.ioMappings[removeIndex].interaction.id;
  session.removeInteraction(interactionIOMappings[removeIndex].interaction.id);
  t.is(session.ioMappings.length, interactionIOMappings.length);
  t.is(session.ioMappings.some((element) => { return element.interaction.id === removeID; }), true);
  // try removing the same element
  session.removeInteraction(interactionIOMappings[removeIndex]);
  t.is(session.ioMappings.length, interactionIOMappings.length);
});

test('processing - promise with recursive calls, single interaction', async t => {
  let session = t.context.session;

  let interaction = session.addInteraction({});
  interaction.process = sinon.fake();

  t.is(interaction.process.callCount, 0);

  await runProcessing(session, 100);

  t.is(interaction.process.callCount > 0, true);
});

test('processing - promise with recursive calls, multiple interactions', async t => {
  let session = t.context.session;

  let interaction1 = session.addInteraction({});
  let interaction2 = session.addInteraction({});
  let interaction3 = session.addInteraction({});
  interaction1.process = sinon.fake();
  interaction2.process = sinon.fake();
  interaction3.process = sinon.fake();

  t.is(interaction1.process.callCount, 0);
  t.is(interaction2.process.callCount, 0);
  t.is(interaction3.process.callCount, 0);

  await runProcessing(session, 100);

  t.is(interaction1.process.callCount > 0, true);
  t.is(interaction2.process.callCount > 0, true);
  t.is(interaction3.process.callCount > 0, true);
});