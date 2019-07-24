import test from 'ava';
import fs from 'fs';

import { Interaction } from '../../../src/index'

import TestUtility from '../testUtility';


test.beforeEach(async t => {
  let interaction = new Interaction({
    name: 'test-interaction'
  });

  interaction.setProcessingCallback((inputs, outputs, state) => {
    state.a = inputs.a;
    outputs.b = inputs.b + 1;
  });

  /*let ioMappings = [
    {
      interactionId: interaction.id,
      ioType: {
        internalName: 'a',
        messageFormat: 'number'
      },
      topic: 'topics/in/a'
    },
    {
      interactionId: interaction.id,
      ioType: {
        internalName: 'b',
        messageFormat: 'number'
      },
      topic: 'topics/in/b'
    },
    {
      interactionId: interaction.id,
      ioType: {
        internalName: 'b',
        messageFormat: 'number'
      },
      topic: 'topics/out/b'
    }
  ];*/

  t.context.interaction = interaction;
});


/* run tests */

test('save to / load from FILE', async t => {
  let interaction = t.context.interaction;
  let filepath = interaction.name + '.interaction';

  await TestUtility.saveToFile(filepath, interaction.toProtobuf()).then(
    () => {
      t.is(fs.existsSync(filepath), true);
    }
  );

  await TestUtility.loadJSONFromFile(filepath).then(
    (json) => {
      let newInteraction = new Interaction(json);
      t.deepEqual(interaction.toProtobuf(), newInteraction.toProtobuf());

      fs.unlinkSync(filepath);
    }
  );
});

test('convert to / create from PROTOBUF', async t => {
  let interaction = t.context.interaction;

  let protobufMsg = interaction.toProtobuf();

  let newInteraction = new Interaction(protobufMsg);

  t.deepEqual(interaction.toProtobuf(), newInteraction.toProtobuf());
});