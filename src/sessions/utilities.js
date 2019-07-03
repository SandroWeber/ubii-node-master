class Utils {
  static createFunctionFromString(string) {
    return new Function("return " + string)();
  };

  static getTopicDataTypeFromMessageFormat(messageFormat) {
    let messageFormatArray = messageFormat.split('.');
    let type = messageFormatArray[messageFormatArray.length - 1]; // remove namespacing
    type = type.charAt(0).toLowerCase() + type.slice(1); // make first letter lowercase
  }
}


module.exports = Utils;
