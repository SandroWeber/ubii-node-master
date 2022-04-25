const isEqual = (property, a, b) => {
  return a[property] === b[property];
};

const allArrayElementsIncluded = (arrayProperty, required, tested) => {
  return required[arrayProperty].every((element) => tested[arrayProperty].includes(element));
};

let mapProperty2FilterFunction = new Map([
  [
    'id',
    (requested, available) => {
      return isEqual('id', requested, available);
    }
  ],
  [
    'name',
    (requested, available) => {
      return isEqual('name', requested, available);
    }
  ],
  [
    'tags',
    (requested, available) => {
      return allArrayElementsIncluded('tags', requested, available);
    }
  ],
  [
    'messageFormat',
    (requested, available) => {
      return isEqual('messageFormat', requested, available);
    }
  ],
  [
    'clientId',
    (requested, available) => {
      return isEqual('clientId', requested, available);
    }
  ],
  [
    'deviceId',
    (requested, available) => {
      return isEqual('deviceId', requested, available);
    }
  ]
]);

class FilterUtils {
  static filterAll(testPropertyList, requiredList, availableList) {
    let responseList = [];
    for (let request of requiredList) {
      let filtered = availableList;
      for (let property of testPropertyList) {
        filtered = filtered.filter((element) => mapProperty2FilterFunction.get(property)(request, element));
      }
      responseList = responseList.concat(filtered);
    }

    return responseList;
  }
}

module.exports = FilterUtils;
