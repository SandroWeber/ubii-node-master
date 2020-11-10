const tf = require('@tensorflow/tfjs-node');

const { ProcessingModule } = require('../../../src/processing/processingModule.js');

class TestProcessingModuleTF extends ProcessingModule {
  constructor(specs) {
    super(specs);

    if (!this.name || this.name.length === 0) {
      this.name = 'TestProcessingModuleTF';
    }

    this.outputs = [
      {
        internalName: 'prediction',
        messageFormat: 'float'
      }
    ];
  }

  onCreated() {
    this.state.model = tf.sequential();
    this.state.model.add(tf.layers.dense({ units: 1, inputShape: [1] }));

    // Prepare the model for training: Specify the loss and the optimizer.
    this.state.model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });

    // Generate some synthetic data for training.
    const xs = tf.tensor2d([1, 2, 3, 4], [4, 1]);
    const ys = tf.tensor2d([1, 3, 5, 7], [4, 1]);
    // Train the model using the data.
    let fitData = async () => {
      await this.state.model.fit(xs, ys);
    };
    fitData();

    this.state.expectedPrediction = this.state.model
      .predict(tf.tensor2d([5], [1, 1]))
      .dataSync()[0];
  }

  onProcessing() {
    // Use the model to do inference on a data point the model hasn't seen before:
    let prediction = this.state.model
      .predict(/*this.state.modules.*/ tf.tensor2d([5], [1, 1]))
      .dataSync()[0];
    this.prediction = prediction;
  }
}

module.exports = TestProcessingModuleTF;
