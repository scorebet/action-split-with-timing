var glob = require("glob");
var path = require("path");
var fs = require("fs");
const wait = require("./wait");

let split = function (directoryPath, nodeIndex, nodeTotal, filesToIgnore = []) {
  return new Promise((resolve) => {
    glob(
      `${directoryPath}/**/*Test.kt`,
      { ignore: filesToIgnore.map((value) => `${directoryPath}/**/${value}`) },
      function (er, files) {
        if (er != null) {
          throw new Error(`Error: Reading files from ${directoryPath}: ${er}`);
        }
        const tests = files
          .filter((value, index) => index % nodeTotal == nodeIndex)
          .map((value) => {
            return `--tests ${path.parse(value).name}`;
          })
          .join(" ");
        resolve(tests);
      }
    );
  });
};

module.exports = split;
