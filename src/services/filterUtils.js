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
  ],
  [
    'ioType',
    (requested, available) => {
      return isEqual('ioType', requested, available);
    }
  ],
  [
    'tags',
    (requested, available) => {
      return allArrayElementsIncluded('tags', requested, available);
    }
  ],
  [
    'components',
    (requested, available) => {
      let matchingComponents = FilterUtils.filterAll(requested.components, available.components);
      return matchingComponents.length === requested.components.length ? true : false;
    }
  ],
  [
    'processingModules',
    (requested, available) => {
      let matchingPMs = FilterUtils.filterAll(requested.processingModules, available.processingModules);
      return matchingPMs.length === requested.processingModules.length ? true : false;
    }
  ]
]);

class FilterUtils {
  static filterAll(requestedList, availableList, testPropertyList) {
    let responseList = [];
    for (let request of requestedList) {
      let filtered = availableList;
      let propertyList = testPropertyList ? testPropertyList : Object.keys(request);
      for (let property of propertyList) {
        /*if (!mapProperty2FilterFunction.has(property))
          console.warn('FilterUtils: filter function for "' + property + '" unavailable, skipping');*/
        if (typeof request[property] !== 'undefined' && mapProperty2FilterFunction.has(property)) {
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
