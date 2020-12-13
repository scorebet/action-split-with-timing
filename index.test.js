const wait = require("./wait");
const split = require("./splitter");
const process = require("process");
const cp = require("child_process");
const path = require("path");

test("valid tests for a single test", async () => {
  var tests = await split("./data/test-1", 0, 3);
  expect(tests).toEqual("--tests Hello1Test");
});

test("valid tests for a multiple test", async () => {
  var tests = await split("./data/test-1", 0, 1);
  expect(tests).toEqual(
    "--tests Hello1Test --tests Hello2Test --tests Hello3Test"
  );
});

test("valid tests for a multiple test with single ignore file", async () => {
  var tests = await split("./data/test-1", 0, 1, ["Hello3Test.kt"]);
  expect(tests).toEqual("--tests Hello1Test --tests Hello2Test");
});

test("valid tests for a multiple test with multiple ignore files", async () => {
  var tests = await split("./data/test-1", 0, 1, [
    "Hello3Test.kt",
    "Hello2Test.kt",
  ]);
  expect(tests).toEqual("--tests Hello1Test");
});

test("invalid test for missing directory", async () => {
  var tests = await split("./data/test-missing", 0, 1);
  expect(tests).toEqual("");
});

// test("wait 500 ms", async () => {
//   const start = new Date();
//   await wait(500);
//   const end = new Date();
//   var delta = Math.abs(end - start);
//   expect(delta).toBeGreaterThanOrEqual(500);
// });

// // shows how the runner will run a javascript action with env / stdout protocol
// test("test runs", () => {
//   process.env["INPUT_MILLISECONDS"] = 500;
//   const ip = path.join(__dirname, "index.js");
//   console.log(cp.execSync(`node ${ip}`, { env: process.env }).toString());
// });
