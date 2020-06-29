
const uuidv4Regex = '[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}';


class Utils {
  static createFunctionFromString(string) {
    if (!string || string.length === 0) {
      return undefined;
    }

    return new Function("return " + string)();
  };

  static createFunction(proglang, dependency, processingCallback){
    switch(proglang){
      case "c":
      case "cpp":
        // returns specified function of native module
        return new Function("require('./build/Release/native.node')."+processingCallback+"()")();
        break;
      case "cs":
        break;
      case "java":
        break;
      case "python":
        break;
    }
  }

  static getTopicDataTypeFromMessageFormat(messageFormat) {
    let messageFormatArray = messageFormat.split('.');
    let type = messageFormatArray[messageFormatArray.length - 1]; // remove namespacing
    type = type.charAt(0).toLowerCase() + type.slice(1); // make first letter lowercase

    return type;
  }

  static getUUIDv4Regex() {
    return uuidv4Regex;
  }
}


module.exports = Utils;
