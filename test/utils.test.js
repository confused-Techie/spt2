const { describe, it } = require("node:test");
const assert = require("assert-extensions");
const { capitalize, uncamelcase } = require("../src/utils.js");

describe("capitalize", () => {
  it("returns empty string for falsy inputs", () => {
    assert.equal(capitalize(""), "");
    assert.equal(capitalize(undefined), "");
    assert.equal(capitalize(null), "");
    assert.equal(capitalize(false), ""); // falsy -> treated as empty per implementation
    assert.equal(capitalize(0), "");     // falsy number -> treated as empty
  });

  it("capitalizes a simple lowercase word", () => {
    assert.equal(capitalize("hello"), "Hello");
  });

  it("leaves the rest of the word unchanged", () => {
    assert.equal(capitalize("hELLo"), "HELLo");
  });

  it("handles a single-character string", () => {
    assert.equal(capitalize("h"), "H");
    assert.equal(capitalize("H"), "H");
  });

  it("handles strings beginning with non-letters (no trimming or special handling)", () => {
    assert.equal(capitalize("1world"), "1world");
    assert.equal(capitalize(" world"), " world");
    assert.equal(capitalize("-dash"), "-dash");
  });
});

describe("uncamelcase", () => {
  it("returns empty string for falsy inputs", () => {
    assert.equal(uncamelcase(""), "");
    assert.equal(uncamelcase(undefined), "");
    assert.equal(uncamelcase(null), "");
    assert.equal(uncamelcase(false), "");
    assert.equal(uncamelcase(0), "");
  });

  it("converts camelCase to spaced title-style (first word capitalized only)", () => {
    assert.equal(uncamelcase("camelCase"), "Camel Case");
    assert.equal(uncamelcase("simpleTestCase"), "Simple Test Case");
  });

  it("converts PascalCase to spaced with leading capital preserved", () => {
    assert.equal(uncamelcase("PascalCase"), "Pascal Case");
  });

  it("handles runs of capitals by inserting spaces before each capital", () => {
    assert.equal(uncamelcase("getHTTPResponseCode"), "Get H T T P Response Code");
    assert.equal(uncamelcase("XMLHttpRequest"), "X M L Http Request");
  });

  it("replaces underscores (single or multiple) with a single space and capitalizes first word", () => {
    assert.equal(uncamelcase("already_spaced"), "Already spaced");
    assert.equal(uncamelcase("user__name"), "User name");
    assert.equal(uncamelcase("__leading__and__trailing__"), "Leading and trailing");
  });

  it("handles mixed snake_case and camelCase", () => {
    assert.equal(uncamelcase("snake_andCamelCase"), "Snake and Camel Case");
    assert.equal(uncamelcase("Many__thingsTo_DoNow"), "Many things To Do Now");
  });

  it("handles a single-letter input", () => {
    assert.equal(uncamelcase("a"), "A");
    assert.equal(uncamelcase("A"), "A");
  });

  it("does not trim inner spaces other than those created by underscores/capitals (only overall trim)", () => {
    // Leading/trailing whitespace trimmed after replacement, inner kept as-is
    assert.equal(uncamelcase("  already_spaced  "), "Already spaced");
    // Existing internal spaces remain
    assert.equal(uncamelcase("keep  Spaces"), "Keep  Spaces");
  });
});
