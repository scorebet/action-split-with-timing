const split = require("./splitter");

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
