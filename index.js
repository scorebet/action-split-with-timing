const core = require("@actions/core");
const split = require("./splitter");

// most @actions toolkit packages have async methods
async function run() {
  try {
    const module = core.getInput("module", true).trim();
    const nodeIndex = parseInt(core.getInput("node-index", true));
    const nodeTotal = parseInt(core.getInput("node-total", true));
    const ignore = getInputAsArray("exclude");

    core.info(
      `Creating ${module} tests for index ${nodeIndex} of total ${nodeTotal} with files to ignore: ${ignore}`
    );

    const tests = await split(module, nodeIndex, nodeTotal, ignore);
    core.info(`Successfully created tests: ${tests}`);
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
