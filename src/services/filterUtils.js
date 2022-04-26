const isEqual = (property, a, b) => {
  return a[property] === b[property];
};

const allArrayElementsIncluded = (arrayProperty, required, tested) => {
  return (
    required[arrayProperty] &&
    required[arrayProperty].every((element) => tested[arrayProperty] && tested[arrayProperty].includes(element))
  );
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
  static filterAll(testPropertyList, requestedList, availableList) {
    let responseList = [];
    for (let request of requestedList) {
      let filtered = availableList;
      for (let property of testPropertyList) {
        if (typeof request[property] !== 'undefined') {
          filtered = filtered.filter((element) => mapProperty2FilterFunction.get(property)(request, element));
        }
      }
      
      for (let filteredElement of filtered) {
        if (!responseList.includes(filteredElement)) responseList.push(filteredElement);
      }
    }

    return responseList;
  }
}

module.exports = FilterUtils;
