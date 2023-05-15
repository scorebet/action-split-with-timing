var fsPromise = require("fs").promises;
var fs = require("fs");
var convert = require("xml-js");
var glob = require("glob");
var path = require("path");
var Deque = require("collections/deque");
var Map = require("collections/map");
const core = require("@actions/core");

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
    core.info(
      `test files: ${testFiles} ---- test results: ${testResultFiles}`
    );
  
  if(testFiles == null || testResultFiles == null) {
    core.info(
      `couldnt find test files or test results`
    );
    return false
  }

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
    let matchedPackageNames = fileData.match(regex)
    core.info(
      `matched package names: ${matchedPackageNames}`
    );
    let packageName = matchedPackageNames[3];
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
