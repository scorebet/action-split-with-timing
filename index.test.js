const split = require("./splitter").split;
const splitWithTiming = require("./splitter").splitWithTiming;

// Split

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

test("invalid test for invalid node-index", async () => {
  expect(() => {
    split("./data/test-missing", -1, 1);
  }).toThrow(Error);
});

test("invalid test for invalid node-total", async () => {
  expect(() => {
    split("./data/test-missing", 0, 0);
  }).toThrow(Error);
  expect(() => {
    split("./data/test-missing", 0, -1);
  }).toThrow(Error);
});

// Split with Timings

test("valid tests with timings for a single test", async () => {
  var tests = await splitWithTiming(
    "./data/test-1",
    "./data/test-result/test-app-result/",
    1,
    3
  );
  expect(tests).toEqual(
    "--tests bet.thescore.android.ui.promotions.Hello1Test"
  );
});

test("valid tests with timings for a multiple test", async () => {
  var tests = await splitWithTiming(
    "./data/test-1",
    "./data/test-result/test-app-result/",
    0,
    1
  );
  expect(tests).toEqual(
    "--tests bet.thescore.android.ui.adapters.viewholders.Hello2Test --tests bet.thescore.android.ui.adapters.viewholders.Hello3Test --tests bet.thescore.android.ui.promotions.Hello1Test"
  );
});

test("invalid tests with timings not in sync for a single test", async () => {
  var tests = await splitWithTiming(
    "./data/test-1",
    "./data/test-result/test-app2-result/",
    1,
    3
  );
  expect(tests).toEqual("--tests Hello2Test");
});

test("invalid tests with timings not in sync for a multiple test", async () => {
  var tests = await splitWithTiming(
    "./data/test-1",
    "./data/test-result/test-app2-result/",
    0,
    1
  );
  expect(tests).toEqual(
    "--tests Hello1Test --tests Hello2Test --tests Hello3Test"
  );
});
