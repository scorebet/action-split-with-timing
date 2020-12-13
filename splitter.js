var glob = require("glob");
var path = require("path");

let split = function (directoryPath, nodeIndex, nodeTotal, filesToExlude = []) {
  verify(directoryPath, nodeIndex, nodeTotal, filesToExlude);
  return new Promise((resolve) => {
    glob(
      `${directoryPath}/**/*Test.kt`,
      { ignore: filesToExlude.map((value) => `${directoryPath}/**/${value}`) },
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

let verify = function (
  directoryPath,
  nodeIndex,
  nodeTotal,
  filesToExlude = []
) {
  if (directoryPath === "") {
    throw new Error("Error: Require module");
  }
  if (nodeIndex < 0) {
    throw new Error(`Error: Invalid node-index: ${nodeIndex}`);
  }
  if (nodeTotal <= 0) {
    throw new Error(`Error: Invalid node-total: ${nodeTotal}`);
  }
};

module.exports = split;
