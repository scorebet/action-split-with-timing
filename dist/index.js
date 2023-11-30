require('./sourcemap-register.js');/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 503:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var fsPromise = (__nccwpck_require__(147).promises);
var fs = __nccwpck_require__(147);
var convert = __nccwpck_require__(414);
var glob = __nccwpck_require__(389);
var path = __nccwpck_require__(17);
var Deque = __nccwpck_require__(277);
var Map = __nccwpck_require__(783);
const core = __nccwpck_require__(349);

let split = function (testPath, nodeIndex, nodeTotal, filesToExlude = []) {
  verify(testPath, nodeIndex, nodeTotal);
  return new Promise((resolve) => {
    glob(
      buildTestPattern(testPath),
      { ignore: filesToExlude.map((value) => `${testPath}/**/${value}`) },
      function (er, files) {
        if (er != null) {
          throw new Error(`Error: Reading files from ${testPath}: ${er}`);
        }
        const tests = files
          .filter((value, index) => index % nodeTotal === nodeIndex)
          .map((value) => {
            return `--tests ${path.parse(value).name}`;
          })
          .join(" ");
        core.info(`Successfully created tests: ${tests}`);
        resolve(tests);
      }
    );
  });
};

let isTestFilesOnSyncWithTestResults = function (testFiles, testResultFiles) {
  let missingTests = [];
  let testResultFilesMap = new Map();
  testResultFiles.forEach((testResultFile) => {
    let xml = JSON.parse(convert.xml2json(fs.readFileSync(testResultFile)));
    let fileNameData = xml.elements[0].attributes.name.split(".");
    let fileName = fileNameData.pop();
    let packageName = fileNameData.join(".");
    if (!testResultFilesMap.has(fileName)) {
      testResultFilesMap.add([packageName], fileName);
    } else {
      let testResultFilePackages = testResultFilesMap.get(fileName);
      testResultFilePackages.push(packageName);
      testResultFilesMap.add(testResultFilePackages, fileName);
    }
  });
  testFiles.forEach((testFile) => {
    let fileData = fs.readFileSync(testFile, "UTF-8");
    let regex = /^(\s+)?package(\s+)?([a-z][a-z0-9_]*(\.[a-z0-9_]+)+[0-9a-z_])/;
    let fileName = path.parse(testFile).name;
    let regexMatchResult = fileData.match(regex)
    if (regexMatchResult == null) {
      core.info(`Missing package name for ${fileName}`)
    }
    let packageName = regexMatchResult[3];
    if (testResultFilesMap.has(fileName)) {
      let testResultFilePackages = testResultFilesMap.get(fileName);
      if (testResultFilePackages.includes(packageName)) {
        testResultFilesMap.add(
          testResultFilePackages.filter((item) => item !== packageName),
          fileName
        );
      } else {
        missingTests.push({
          name: fileName,
          package: packageName,
        });
      }
      if (testResultFilesMap.get(fileName).length <= 0) {
        testResultFilesMap.delete(fileName);
      }
    } else {
      missingTests.push({
        name: fileName,
        package: packageName,
      });
    }
  });
  if (missingTests.length != 0) {
    core.info(
      `WARNING: Test[${testFiles.length}] and TestResult[${
        testResultFiles.length
      }] are not in sync, unsync tests: ${JSON.stringify(missingTests)}`
    );
    return false;
  } else {
    core.info(
      `SUCCESS: Test[${testFiles.length}] and TestResult[${testResultFiles.length}] are in sync, using timings for tests`
    );
    return true;
  }
};

let splitWithTiming = async function (
  testPath,
  testResultPath,
  nodeIndex,
  nodeTotal,
  filesToExlude = []
) {
  verify(testPath, nodeIndex, nodeTotal, filesToExlude);
  return new Promise((resolve) => {
    glob(
      buildTestPattern(testPath),
      { ignore: filesToExlude.map((value) => `${testPath}/**/${value}`) },
      function (testFilesError, testFiles) {
        if (testFilesError != null) {
          throw new Error(
            `Error: Reading files from ${testPath}: ${testFilesError}`
          );
        }
        glob(
          `${testResultPath}/**/*.xml`,
          { ignore: filesToExlude.map((value) => `${testPath}/**/${value}`) },
          async function (testResultFilesError, testResultFiles) {
            if (testResultFilesError != null) {
              throw new Error(
                `Error: Reading files from ${testPath}: ${testResultFilesError}`
              );
            }
            if (!isTestFilesOnSyncWithTestResults(testFiles, testResultFiles)) {
              let tests = await split(
                testPath,
                nodeIndex,
                nodeTotal,
                filesToExlude
              );
              resolve(tests);
            } else {
              var deque = new Deque();
              var testResultTotalTime = 0;
              var i = 0;
              for (i = 0; i < testResultFiles.length; i++) {
                let xml = JSON.parse(
                  convert.xml2json(await fsPromise.readFile(testResultFiles[i]))
                );
                let testResultName = xml.elements[0].attributes.name;
                let testResultTime = parseFloat(
                  xml.elements[0].attributes.time
                );
                testResultTotalTime += testResultTime;
                deque.add({ name: testResultName, time: testResultTime });
              }
              let testChunkMaxTime = testResultTotalTime / nodeTotal;
              deque = deque.sorted((a, b) => {
                return a.time - b.time;
              });
              for (i = 0; i < nodeTotal; i++) {
                let testNames = [];
                var testChunkCurrentTime = 0;
                var isPollLast = true;
                while (
                  deque.length != 0 &&
                  deque.length >= nodeTotal - i &&
                  (testChunkCurrentTime < testChunkMaxTime ||
                    i === nodeTotal - 1)
                ) {
                  let result = isPollLast ? deque.pop() : deque.shift();
                  testNames.push(result.name);
                  testChunkCurrentTime += result.time;
                  isPollLast = false;
                  if (deque.length !== 0 && i === nodeTotal - 1) {
                    continue;
                  } else if (
                    deque.length !== 0 &&
                    testChunkCurrentTime + deque.peek().time >
                      testChunkMaxTime &&
                    i < nodeTotal - nodeTotal / 4
                  ) {
                    break;
                  }
                }
                if (i === nodeIndex) {
                  if (i == nodeTotal - 1 && deque.length != 0) {
                    throw new Error(
                      `Error: Some test was not consumed: ${deque.length}`
                    );
                  }
                  let tests = testNames
                    .map((value) => {
                      return `--tests ${value}`;
                    })
                    .join(" ");
                  core.info(
                    `Successfully created tests using timings: ${tests}`
                  );
                  resolve(tests);
                  return;
                }
              }
              throw new Error("Error: Unable to create tests");
            }
          }
        );
      }
    );
  });
};

let buildTestPattern = function (testPath) {
  return `${testPath}/**/*Test.+(kt|java)`;
};

let verify = function (directoryPath, nodeIndex, nodeTotal) {
  if (directoryPath === "") {
    throw new Error("Error: Require module");
  }
  if (nodeIndex < 0) {
    throw new Error(`Error: Invalid node-index: ${nodeIndex}`);
  }
  if (nodeTotal <= 0) {
    throw new Error(`Error: Invalid node-total: ${nodeTotal}`);
  }
  if (nodeIndex >= nodeTotal) {
    throw new Error(
      `Error: Invalid node-index: ${nodeIndex} is out of bounds, node-total: ${nodeTotal}`
    );
  }
};

module.exports = {
  split: split,
  splitWithTiming: splitWithTiming,
  buildTestPattern: buildTestPattern,
};


/***/ }),

/***/ 349:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 277:
/***/ ((module) => {

module.exports = eval("require")("collections/deque");


/***/ }),

/***/ 783:
/***/ ((module) => {

module.exports = eval("require")("collections/map");


/***/ }),

/***/ 389:
/***/ ((module) => {

module.exports = eval("require")("glob");


/***/ }),

/***/ 414:
/***/ ((module) => {

module.exports = eval("require")("xml-js");


/***/ }),

/***/ 147:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 17:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(349);
const split = (__nccwpck_require__(503).split);
const splitWithTiming = (__nccwpck_require__(503).splitWithTiming);
const buildTestPattern = (__nccwpck_require__(503).buildTestPattern);
const path = __nccwpck_require__(17);
const glob = __nccwpck_require__(389);

// most @actions toolkit packages have async methods
async function run() {
  try {
    const testPath = path.resolve(core.getInput("test-path", true));
    const nodeIndex = parseInt(core.getInput("node-index", true));
    const nodeTotal = parseInt(core.getInput("node-total", true));
    const testResultPath = path.resolve(core.getInput("test-result-path"));
    const testExclude = getInputAsArray("test-exclude");

    core.info(
      `Creating ${testPath} tests for index ${nodeIndex} of total ${nodeTotal} with files to ignore: ${testExclude}`
    );

    var tests = "";
    if (glob.sync(buildTestPattern(testPath)).length === 0) {
      core.setFailed(`ERROR: Test path does not exist: ${testPath}`);
      return;
    }
    if (glob.sync(`${testResultPath}/**/*.xml`).length === 0) {
      core.info(
        `TestResult[${testResultPath}] does not exist, using split without timings`
      );
      tests = await split(testPath, nodeIndex, nodeTotal, testExclude).catch(
        core.setFailed
      );
    } else {
      tests = await splitWithTiming(
        testPath,
        testResultPath,
        nodeIndex,
        nodeTotal,
        testExclude
      ).catch(core.setFailed);
    }

    core.setOutput("tests", tests);
  } catch (error) {
    core.setFailed(error.message);
  }
}

function getInputAsArray(name, isRequired = false) {
  return core
    .getInput(name, isRequired)
    .split("\n")
    .map((s) => s.trim())
    .filter((x) => x !== "");
}

run();

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=index.js.map