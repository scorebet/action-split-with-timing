const core = require("@actions/core");
const split = require("./splitter").split;
const splitWithTiming = require("./splitter").splitWithTiming;
const buildTestPattern = require("./splitter").buildTestPattern;
const path = require("path");
const glob = require("glob");

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
