class Utils {
  static createFunctionFromString(string) {
    return new Function("return " + string)();
  };
}


module.exports = Utils;
