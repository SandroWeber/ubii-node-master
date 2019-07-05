const fs = require('fs');

class TestUtility {
  static saveToFile(uri, object) {
    let promise = new Promise((resolve, reject) => {
      fs.writeFile(uri, JSON.stringify(object), (error) => {
        if (error) {
          reject(error);
        }

        resolve();
      });
    });

    return promise;
  }

  static loadJSONFromFile(uri) {
    let promise = new Promise((resolve, reject) => {
      fs.readFile(uri, 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(JSON.parse(data));
        }
      });
    });

    return promise;
  }

  static wait(milliseconds) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, milliseconds);
    });
  };
}

module.exports = TestUtility;