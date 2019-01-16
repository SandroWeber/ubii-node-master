import test from 'ava';

import {Session} from '../../src/js/index.js'

import MockInteractionIOMapping from '../mocks/mock-interaction-io-mapping.js'


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

  t.context.session = new Session();
});

/* run tests */

test('constructor', t => {
  let session = t.context.session;
  let interactionIOMappings = t.context.mockInteractionIOMappings;

  t.is(typeof session.id, 'string');
  t.not(session.id, '');
  t.is(session.interactionIOMappings.length, 0);

  session = new Session(null, interactionIOMappings);
  t.is(typeof session.id, 'string');
  t.not(session.id, '');
  t.is(session.interactionIOMappings.length, interactionIOMappings.length);
});

test('add/remove interactions', t => {
  let session = t.context.session;
  let interactionIOMappings = t.context.mockInteractionIOMappings;

  t.is(session.interactionIOMappings.length, 0);
  interactionIOMappings.forEach((element) => {
    session.addInteraction(element.interaction);
  });
  t.is(session.interactionIOMappings.length, interactionIOMappings.length);

  // try adding the same interaction twice
  session.addInteraction(interactionIOMappings[0].interaction);
  t.is(session.interactionIOMappings.length, interactionIOMappings.length);

  // remove one
  let removeIndex = 1;
  let removeID = session.interactionIOMappings[removeIndex].interaction.id;
  session.removeInteraction(interactionIOMappings[removeIndex].interaction.id);
  t.is(session.interactionIOMappings.length, interactionIOMappings.length - 1);
  t.is(session.interactionIOMappings.some((element) => {return element.interaction.id === removeID;}), false);
  // try removing the same element
  session.removeInteraction(interactionIOMappings[removeIndex]);
  t.is(session.interactionIOMappings.length, interactionIOMappings.length - 1);
});

test('processing - promise with recursive calls, single interaction', async t => {
  let session = t.context.session;
  let interactionIOMappings = t.context.mockInteractionIOMappings;

  session.processMode = Session.PROCESS_MODES.PROMISE_RECURSIVECALLS;

  session.addInteraction(interactionIOMappings[0].interaction);

  t.is(interactionIOMappings[0].process.callCount, 0);

  await runProcessing(session, 100);

  t.is(interactionIOMappings[0].process.callCount > 0, true);
});

test('processing - promise with recursive calls, multiple interactions', async t => {
  let session = t.context.session;
  let interactionIOMappings = t.context.mockInteractionIOMappings;

  session.processMode = Session.PROCESS_MODES.PROMISE_RECURSIVECALLS;

  session.addInteraction(interactionIOMappings[0].interaction);
  session.addInteraction(interactionIOMappings[1].interaction);
  session.addInteraction(interactionIOMappings[2].interaction);

  t.is(interactionIOMappings[0].interaction.process.callCount, 0);
  t.is(interactionIOMappings[1].interaction.process.callCount, 0);
  t.is(interactionIOMappings[2].interaction.process.callCount, 0);

  await runProcessing(session, 100);

  t.is(interactionIOMappings[0].interaction.process.callCount > 0, true);
  t.is(interactionIOMappings[1].interaction.process.callCount > 0, true);
  t.is(interactionIOMappings[2].interaction.process.callCount > 0, true);
});